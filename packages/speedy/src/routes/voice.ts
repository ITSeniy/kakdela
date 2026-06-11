import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  ErrorBodySchema,
  VoiceJoinResponseSchema,
  VoiceParticipantsResponseSchema,
  type VoiceParticipantPublic,
} from '@kakdela/ginzu/api-types'

import { channels, users } from '../db/schema.js'
import { db } from '../lib/db.js'
import { assertMember, notFound } from '../lib/permissions.js'
import { redis } from '../lib/redis.js'
import { issueToken, listParticipants } from '../media/guido.js'

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

function toPublic(p: {
  userId: string
  displayName: string
  isScreenSharing: boolean
}): VoiceParticipantPublic {
  return {
    userId: p.userId,
    displayName: p.displayName,
    isScreenSharing: p.isScreenSharing,
  }
}

async function fetchAndCacheParticipants(channelId: string): Promise<VoiceParticipantPublic[]> {
  const fresh = (await listParticipants(channelId)).map(toPublic)
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
}
