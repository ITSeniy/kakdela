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

  const room = voiceRoomName(channelId)
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
  const room = voiceRoomName(channelId)

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
    const joinedMs =
      p.joinedAtMs > 0n ? Number(p.joinedAtMs) : Number(p.joinedAt) * 1000
    return {
      userId: p.identity,
      displayName: p.name,
      joinedAt: new Date(joinedMs).toISOString(),
      isPublishing: p.isPublisher,
      isScreenSharing,
    }
  })
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
