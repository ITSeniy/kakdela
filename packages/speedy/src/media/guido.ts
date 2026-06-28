import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk'

import { env } from '../env.js'
import type {
  VoiceParticipant,
  VoiceToken,
  VoiceTokenIssueArgs,
  VoiceTokenMetadata,
} from './types.js'

// 6 часов. Если человек висит в звонке дольше — клиент переподключится
// с новым токеном; нет смысла раздувать TTL.
const TOKEN_TTL_SECONDS = 60 * 60 * 6

export function voiceRoomName(channelId: string): string {
  return `voice-${channelId}`
}

// Комната DM-звонка (T-087). Отдельный префикс от серверных голос-каналов:
// webhook игнорит `dm-` (см. media/webhook.ts), а состав 1:1-комнаты UI ведёт
// сам по событиям LiveKit, серверный presence-broadcast здесь не нужен.
export function dmRoomName(channelId: string): string {
  return `dm-${channelId}`
}

// RoomServiceClient работает по HTTP/HTTPS (twirp). В проде клиенты ходят
// через Caddy (wss://<домен>/livekit), а speedy — напрямую по docker-сети:
// LIVEKIT_ADMIN_URL=http://livekit:7880. В dev переменная не нужна —
// конвертируем схему LIVEKIT_URL (ws://localhost:7880 → http://...).
function adminHost(): string {
  return env.LIVEKIT_ADMIN_URL ?? env.LIVEKIT_URL.replace(/^ws(s?):\/\//, 'http$1://')
}

let roomServiceSingleton: RoomServiceClient | null = null
function getRoomService(): RoomServiceClient {
  if (!roomServiceSingleton) {
    roomServiceSingleton = new RoomServiceClient(
      adminHost(),
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    )
  }
  return roomServiceSingleton
}

export async function issueToken(args: VoiceTokenIssueArgs): Promise<VoiceToken> {
  const {
    userId,
    channelId,
    displayName,
    canPublish = true,
    canSubscribe = true,
    canPublishData = true,
  } = args

  const room = args.room ?? voiceRoomName(channelId)
  const metadata: VoiceTokenMetadata = { userId }

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: displayName,
    metadata: JSON.stringify(metadata),
    ttl: TOKEN_TTL_SECONDS,
  })
  at.addGrant({
    roomJoin: true,
    room,
    canPublish,
    canSubscribe,
    canPublishData,
  })

  const token = await at.toJwt()
  return { token, url: env.LIVEKIT_URL, room }
}

export async function revokeUser(args: { userId: string; channelId: string }): Promise<void> {
  const room = voiceRoomName(args.channelId)
  await getRoomService().removeParticipant(room, args.userId)
}

export async function listParticipants(channelId: string): Promise<VoiceParticipant[]> {
  return listParticipantsForRoom(voiceRoomName(channelId))
}

/** Участники DM-звонка — источник истины для логики «кто инициатор» (T-087). */
export async function listDmParticipants(channelId: string): Promise<VoiceParticipant[]> {
  return listParticipantsForRoom(dmRoomName(channelId))
}

async function listParticipantsForRoom(room: string): Promise<VoiceParticipant[]> {
  let infos
  try {
    infos = await getRoomService().listParticipants(room)
  } catch (err) {
    // Пустая/несуществующая комната — это нормальное состояние,
    // не ошибка вызова. LiveKit отдаёт twirp not_found.
    if (isRoomNotFound(err)) return []
    throw err
  }

  return infos.map((p) => {
    const isScreenSharing = p.tracks.some(
      (t) =>
        t.source === TrackSource.SCREEN_SHARE ||
        t.source === TrackSource.SCREEN_SHARE_AUDIO,
    )
    const mics = p.tracks.filter((t) => t.source === TrackSource.MICROPHONE)
    const isMuted = mics.length === 0 || mics.every((t) => t.muted)
    const joinedMs =
      p.joinedAtMs > 0n ? Number(p.joinedAtMs) : Number(p.joinedAt) * 1000
    return {
      userId: p.identity,
      displayName: p.name,
      joinedAt: new Date(joinedMs).toISOString(),
      isPublishing: p.isPublisher,
      isScreenSharing,
      isMuted,
    }
  })
}

/**
 * Серверный mute/unmute микрофонных дорожек участника. Не-страшно, если
 * дорожек нет (человек ещё не публиковал мик) — состояние всё равно живёт
 * в Redis, а клиент цели сам не даст включить мик, пока заглушен.
 */
export async function muteParticipantMic(args: {
  channelId: string
  userId: string
  muted: boolean
}): Promise<void> {
  const room = voiceRoomName(args.channelId)
  const svc = getRoomService()
  let info
  try {
    info = await svc.getParticipant(room, args.userId)
  } catch (err) {
    if (isRoomNotFound(err)) return
    throw err
  }
  for (const t of info.tracks) {
    if (t.source === TrackSource.MICROPHONE) {
      try {
        await svc.mutePublishedTrack(room, args.userId, t.sid, args.muted)
      } catch (err) {
        // unmute серверной стороной LiveKit может запрещать — это ок,
        // клиент цели включит мик сам по voice.mod.
        if (args.muted) throw err
      }
    }
  }
}

function isRoomNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: string | number; message?: string; status?: number }
  if (e.code === 'not_found' || e.code === 404 || e.status === 404) return true
  if (typeof e.message === 'string' && /not.?found|no.*room|requested room/i.test(e.message)) {
    return true
  }
  return false
}
