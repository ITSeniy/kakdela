import { eq } from 'drizzle-orm'
import {
  TrackSource,
  type ParticipantInfo,
  type WebhookEvent,
} from 'livekit-server-sdk'

import type { ServerEvent } from '@kakdela/ginzu/ws-events'

import { channels } from '../db/schema.js'
import { db } from '../lib/db.js'
import { redis } from '../lib/redis.js'
import { broadcastToServer } from '../ws/broadcast.js'

// Имена комнат в guido — `voice-${channelId}`. Если webhook прилетел с
// другим префиксом — это либо чужая комната, либо мы что-то неправильно
// деплоим; в любом случае молча игнорируем (debug-уровень в логах).
const VOICE_ROOM_PREFIX = 'voice-'

const roomUsersKey = (channelId: string) => `voice:channel:${channelId}:users`
const participantsCacheKey = (channelId: string) =>
  `voice:channel:${channelId}:participants-cache`
const dedupKey = (eventId: string) => `livekit:webhook:seen:${eventId}`

// 1 час: LiveKit при ретраях обычно укладывается в минуты, час — с запасом.
const DEDUP_TTL_SEC = 60 * 60

export interface WebhookLogger {
  debug: (obj: object, msg?: string) => void
  warn: (obj: object, msg?: string) => void
}

const NOOP_LOG: WebhookLogger = {
  debug: () => {},
  warn: () => {},
}

/**
 * Атомарно регистрирует event.id как обработанный.
 * Возвращает true, если такой id уже встречался (дубликат), иначе false.
 * Пустой `eventId` (на случай старых версий LiveKit без поля) пропускаем
 * без дедупликации.
 */
export async function alreadyProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false
  const result = await redis.set(dedupKey(eventId), '1', 'EX', DEDUP_TTL_SEC, 'NX')
  return result === null
}

export function parseChannelIdFromRoom(roomName: string | undefined): string | null {
  if (!roomName || !roomName.startsWith(VOICE_ROOM_PREFIX)) return null
  const id = roomName.slice(VOICE_ROOM_PREFIX.length)
  return id.length > 0 ? id : null
}

function computeMutedFromTracks(p: ParticipantInfo): boolean {
  // muted = у участника нет ни одной опубликованной микрофонной дорожки,
  // которая была бы не-замьючена. Track-mute toggles вебхуками не приходят,
  // но publish/unpublish — приходят, чего достаточно для индикатора в списке.
  const mics = p.tracks.filter((t) => t.source === TrackSource.MICROPHONE)
  if (mics.length === 0) return true
  return mics.every((t) => t.muted)
}

function computeScreenFromTracks(p: ParticipantInfo): boolean {
  return p.tracks.some(
    (t) =>
      t.source === TrackSource.SCREEN_SHARE ||
      t.source === TrackSource.SCREEN_SHARE_AUDIO,
  )
}

async function lookupServerIdForVoiceChannel(channelId: string): Promise<string | null> {
  const rows = await db
    .select({ serverId: channels.serverId, kind: channels.kind })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  if (row.kind !== 'voice') return null
  return row.serverId
}

async function invalidateParticipantsCache(channelId: string): Promise<void> {
  await redis.del(participantsCacheKey(channelId))
}

export async function handleWebhookEvent(
  event: WebhookEvent,
  log: WebhookLogger = NOOP_LOG,
): Promise<void> {
  const channelId = parseChannelIdFromRoom(event.room?.name)

  switch (event.event) {
    case 'participant_joined': {
      if (!channelId || !event.participant) {
        log.debug({ event: event.event, id: event.id }, 'webhook: missing room or participant')
        return
      }
      const serverId = await lookupServerIdForVoiceChannel(channelId)
      if (!serverId) return
      const userId = event.participant.identity
      await redis.sadd(roomUsersKey(channelId), userId)
      await invalidateParticipantsCache(channelId)
      await broadcastToServer(serverId, { t: 'voice.join', channelId, userId })
      await broadcastToServer(serverId, {
        t: 'voice.state',
        channelId,
        userId,
        muted: computeMutedFromTracks(event.participant),
        screen: computeScreenFromTracks(event.participant),
      })
      return
    }

    case 'participant_left':
    case 'participant_connection_aborted': {
      if (!channelId || !event.participant) return
      const serverId = await lookupServerIdForVoiceChannel(channelId)
      if (!serverId) return
      const userId = event.participant.identity
      await redis.srem(roomUsersKey(channelId), userId)
      await invalidateParticipantsCache(channelId)
      await broadcastToServer(serverId, { t: 'voice.leave', channelId, userId })
      return
    }

    case 'track_published':
    case 'track_unpublished': {
      if (!channelId || !event.participant) return
      const serverId = await lookupServerIdForVoiceChannel(channelId)
      if (!serverId) return
      const userId = event.participant.identity
      await invalidateParticipantsCache(channelId)
      const muted = computeMutedFromTracks(event.participant)
      const screen = computeScreenFromTracks(event.participant)
      await broadcastToServer(serverId, {
        t: 'voice.state',
        channelId,
        userId,
        muted,
        screen,
      })
      return
    }

    case 'room_started':
      // Каждый participant_joined пришлёт свой voice.join — здесь ничего.
      return

    case 'room_finished': {
      if (!channelId) return
      await Promise.all([
        redis.del(roomUsersKey(channelId)),
        redis.del(participantsCacheKey(channelId)),
      ])
      return
    }

    // Recording/streaming/ingress — вне MVP. Явно проигнорировано,
    // чтобы default-ветка ловила только действительно неизвестное.
    case 'egress_started':
    case 'egress_updated':
    case 'egress_ended':
    case 'ingress_started':
    case 'ingress_ended':
      return

    default:
      log.warn({ type: event.event, id: event.id }, 'webhook: unknown event type')
      return
  }
}
