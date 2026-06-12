import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  ErrorBodySchema,
  VoiceJoinResponseSchema,
  VoiceModerateRequestSchema,
  VoiceParticipantsResponseSchema,
  type VoiceParticipantPublic,
} from '@kakdela/ginzu/api-types'

import { channels, users } from '../db/schema.js'
import { db } from '../lib/db.js'
import { assertMember, assertRole, notFound } from '../lib/permissions.js'
import { redis } from '../lib/redis.js'
import { issueToken, listParticipants, muteParticipantMic, revokeUser } from '../media/guido.js'
import { broadcastToServer } from '../ws/broadcast.js'

// Резервный набор «кто сейчас в комнате» — основной источник истины это
// LiveKit (см. T-032 webhook), но мы пишем сюда на join/leave для подстраховки
// на случай, если webhook временно отвалится.
const roomUsersKey = (channelId: string) => `voice:channel:${channelId}:users`

// Кэш ответа GET /participants. Список текстовых каналов в UI рядом с voice
// показывает участников голоса; чтобы не дёргать LiveKit на каждое открытие
// меню — 5 секунд более чем достаточно.
const participantsCacheKey = (channelId: string) =>
  `voice:channel:${channelId}:participants-cache`
const PARTICIPANTS_CACHE_TTL_SEC = 5

// Серверная модерация (mute/deafen от админа): hash userId → JSON.
// mutedBefore — был ли mute ДО deafen, un-deafen возвращает как было
// (та же логика, что у локальных тумблеров клиента).
const modStateKey = (channelId: string) => `voice:channel:${channelId}:mod`

interface ModState {
  muted: boolean
  deafened: boolean
  mutedBefore: boolean
}

const EMPTY_MOD: ModState = { muted: false, deafened: false, mutedBefore: false }

function parseModState(raw: string | undefined | null): ModState {
  if (!raw) return EMPTY_MOD
  try {
    const parsed = JSON.parse(raw) as Partial<ModState>
    return {
      muted: parsed.muted === true,
      deafened: parsed.deafened === true,
      mutedBefore: parsed.mutedBefore === true,
    }
  } catch {
    return EMPTY_MOD
  }
}

async function getModState(channelId: string, userId: string): Promise<ModState> {
  return parseModState(await redis.hget(modStateKey(channelId), userId))
}

async function setModState(channelId: string, userId: string, state: ModState): Promise<void> {
  if (!state.muted && !state.deafened) {
    await redis.hdel(modStateKey(channelId), userId)
  } else {
    await redis.hset(modStateKey(channelId), userId, JSON.stringify(state))
  }
}

async function fetchAndCacheParticipants(channelId: string): Promise<VoiceParticipantPublic[]> {
  const [raw, modRaw] = await Promise.all([
    listParticipants(channelId),
    redis.hgetall(modStateKey(channelId)),
  ])
  const fresh = raw.map((p): VoiceParticipantPublic => {
    const mod = parseModState(modRaw[p.userId])
    return {
      userId: p.userId,
      displayName: p.displayName,
      isScreenSharing: p.isScreenSharing,
      isMuted: p.isMuted,
      serverMuted: mod.muted,
      serverDeafened: mod.deafened,
    }
  })
  await redis.set(
    participantsCacheKey(channelId),
    JSON.stringify(fresh),
    'EX',
    PARTICIPANTS_CACHE_TTL_SEC,
  )
  return fresh
}

async function getParticipantsCached(channelId: string): Promise<VoiceParticipantPublic[]> {
  const cached = await redis.get(participantsCacheKey(channelId))
  if (cached) {
    try {
      return JSON.parse(cached) as VoiceParticipantPublic[]
    } catch {
      // битый кэш — упадём в перезапрос
    }
  }
  return fetchAndCacheParticipants(channelId)
}

export const voiceRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── POST /api/voice/:channelId/join ─────
  app.post(
    '/voice/:channelId/join',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        response: {
          200: VoiceJoinResponseSchema,
          400: ErrorBodySchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const userId = req.authUser!.id

      const channelRows = await db
        .select({ serverId: channels.serverId, kind: channels.kind })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1)
      const channel = channelRows[0]
      if (!channel || !channel.serverId) throw notFound('channel-not-found', 'channel not found')
      if (channel.kind !== 'voice') {
        return reply.code(400).send({
          error: { code: 'not-a-voice-channel', message: 'channel is not a voice channel' },
        })
      }

      await assertMember(userId, channel.serverId)

      const userRows = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      const user = userRows[0]
      if (!user) throw notFound('user-not-found', 'user not found')

      const token = await issueToken({
        userId,
        channelId,
        displayName: user.displayName,
      })

      await redis.sadd(roomUsersKey(channelId), userId)

      // Snapshot для UI — берём свежий, не из 5-сек кэша. Заодно обновляем
      // кэш, чтобы следующий GET /participants увидел тот же список.
      const participants = await fetchAndCacheParticipants(channelId)

      return reply.code(200).send({
        token: token.token,
        url: token.url,
        room: token.room,
        participants,
      })
    },
  )

  // ───── POST /api/voice/:channelId/leave ─────
  app.post(
    '/voice/:channelId/leave',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        response: {
          204: z.null(),
          401: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const userId = req.authUser!.id
      // Реальное удаление из комнаты делает сам LiveKit при disconnect.
      // Этот эндпоинт оптимистично чистит резервный set; webhook T-032
      // приведёт всё к согласованному состоянию.
      await redis.srem(roomUsersKey(channelId), userId)
      return reply.code(204).send(null)
    },
  )

  // ───── GET /api/voice/:channelId/participants ─────
  app.get(
    '/voice/:channelId/participants',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        response: {
          200: VoiceParticipantsResponseSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const userId = req.authUser!.id

      const channelRows = await db
        .select({ serverId: channels.serverId })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1)
      const channel = channelRows[0]
      if (!channel || !channel.serverId) throw notFound('channel-not-found', 'channel not found')
      await assertMember(userId, channel.serverId)

      const participants = await getParticipantsCached(channelId)
      return reply.code(200).send({ participants })
    },
  )

  // ───── POST /api/voice/:channelId/moderate ─────
  //
  // Админские действия над участником голосового канала: серверный
  // mute/deafen (deafen включает mute; un-deafen возвращает мик в состояние
  // до deafen), kick и перенос в другой голосовой канал. Слышимость и
  // повторное включение мика enforce'ит клиент цели по voice.mod —
  // для сервера друзей этого достаточно.
  app.post(
    '/voice/:channelId/moderate',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        body: VoiceModerateRequestSchema,
        response: {
          204: z.null(),
          400: ErrorBodySchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const actorId = req.authUser!.id
      const { userId: targetId, action, toChannelId } = req.body

      const channelRows = await db
        .select({ serverId: channels.serverId, kind: channels.kind })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1)
      const channel = channelRows[0]
      if (!channel || !channel.serverId || channel.kind !== 'voice') {
        throw notFound('channel-not-found', 'voice channel not found')
      }
      const serverId = channel.serverId

      await assertRole(actorId, serverId, ['owner', 'admin'])

      const inRoom = await redis.sismember(roomUsersKey(channelId), targetId)
      if (!inRoom) {
        return reply.code(400).send({
          error: { code: 'not-in-channel', message: 'user is not in this voice channel' },
        })
      }

      const mod = await getModState(channelId, targetId)

      switch (action) {
        case 'mute': {
          const next: ModState = { ...mod, muted: true }
          await setModState(channelId, targetId, next)
          await muteParticipantMic({ channelId, userId: targetId, muted: true })
          await redis.del(participantsCacheKey(channelId))
          await broadcastToServer(serverId, {
            t: 'voice.mod', channelId, userId: targetId, muted: true, deafened: next.deafened,
          })
          break
        }
        case 'unmute': {
          // Снятие мьюта снимает и deafen — зеркало клиентского toggleMute.
          await setModState(channelId, targetId, { muted: false, deafened: false, mutedBefore: false })
          await muteParticipantMic({ channelId, userId: targetId, muted: false })
          await redis.del(participantsCacheKey(channelId))
          await broadcastToServer(serverId, {
            t: 'voice.mod', channelId, userId: targetId, muted: false, deafened: false,
          })
          break
        }
        case 'deafen': {
          const next: ModState = { muted: true, deafened: true, mutedBefore: mod.muted }
          await setModState(channelId, targetId, next)
          await muteParticipantMic({ channelId, userId: targetId, muted: true })
          await redis.del(participantsCacheKey(channelId))
          await broadcastToServer(serverId, {
            t: 'voice.mod', channelId, userId: targetId, muted: true, deafened: true,
          })
          break
        }
        case 'undeafen': {
          const next: ModState = { muted: mod.mutedBefore, deafened: false, mutedBefore: false }
          await setModState(channelId, targetId, next)
          if (!next.muted) {
            await muteParticipantMic({ channelId, userId: targetId, muted: false })
          }
          await redis.del(participantsCacheKey(channelId))
          await broadcastToServer(serverId, {
            t: 'voice.mod', channelId, userId: targetId, muted: next.muted, deafened: false,
          })
          break
        }
        case 'kick': {
          await revokeUser({ userId: targetId, channelId })
          await redis.srem(roomUsersKey(channelId), targetId)
          await redis.hdel(modStateKey(channelId), targetId)
          await redis.del(participantsCacheKey(channelId))
          await broadcastToServer(serverId, { t: 'voice.kicked', channelId, userId: targetId })
          break
        }
        case 'move': {
          if (!toChannelId) {
            return reply.code(400).send({
              error: { code: 'missing-to-channel', message: 'toChannelId is required for move' },
            })
          }
          const targetRows = await db
            .select({ serverId: channels.serverId, kind: channels.kind })
            .from(channels)
            .where(eq(channels.id, toChannelId))
            .limit(1)
          const target = targetRows[0]
          if (!target || target.serverId !== serverId || target.kind !== 'voice') {
            return reply.code(400).send({
              error: { code: 'bad-target-channel', message: 'target must be a voice channel of the same server' },
            })
          }
          // Модерация привязана к каналу — в новом канале человек чист.
          await redis.hdel(modStateKey(channelId), targetId)
          // Сам перенос делает клиент цели: voice.moved → join(toChannelId).
          // LiveKit-овский серверный move потребовал бы поддержки RoomMoved
          // на клиенте; пере-джойн проще и переживает любые версии.
          await broadcastToServer(serverId, {
            t: 'voice.moved', userId: targetId, fromChannelId: channelId, toChannelId,
          })
          break
        }
      }

      return reply.code(204).send(null)
    },
  )
}
