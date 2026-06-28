import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrackSource } from 'livekit-server-sdk'
import type { WebhookEvent } from 'livekit-server-sdk'

const mocks = vi.hoisted(() => ({
  sadd: vi.fn(),
  srem: vi.fn(),
  del: vi.fn(),
  set: vi.fn(),
  hdel: vi.fn(),
  channelLookup: vi.fn(),
  broadcastToServer: vi.fn(),
}))

vi.mock('../lib/redis.js', () => ({
  redis: {
    sadd: mocks.sadd,
    srem: mocks.srem,
    del: mocks.del,
    set: mocks.set,
    hdel: mocks.hdel,
  },
}))

vi.mock('../lib/db.js', () => {
  // Достаточно lightweight цепочки, которая возвращает то, что вернёт lookup mock.
  const select = () => ({
    from: () => ({
      where: () => ({
        limit: () => mocks.channelLookup() as unknown,
      }),
    }),
  })
  return { db: { select } }
})

vi.mock('../ws/broadcast.js', () => ({
  broadcastToServer: mocks.broadcastToServer,
  broadcastToChannel: vi.fn(),
  wireBrokerToRegistry: vi.fn(),
}))

const {
  alreadyProcessed,
  handleWebhookEvent,
  parseChannelIdFromRoom,
  parseDmChannelIdFromRoom,
} = await import('./webhook.js')

const CHANNEL_ID = '11111111-1111-1111-1111-111111111111'
const SERVER_ID = '22222222-2222-2222-2222-222222222222'
const USER_ID = '33333333-3333-3333-3333-333333333333'

function voiceChannelOk() {
  mocks.channelLookup.mockResolvedValueOnce([{ serverId: SERVER_ID, kind: 'voice' }])
}

function buildEvent(partial: Partial<WebhookEvent> & { event: string }): WebhookEvent {
  // Webhook handler читает только узкое подмножество полей,
  // поэтому проще собрать обычный объект, чем мутировать настоящий Message.
  return {
    id: 'evt-1',
    createdAt: 0n,
    numDropped: 0,
    ...partial,
  } as unknown as WebhookEvent
}

function buildParticipant(tracks: Array<{ source: TrackSource; muted?: boolean }> = []) {
  return {
    identity: USER_ID,
    name: 'Alice',
    isPublisher: true,
    joinedAt: 0n,
    joinedAtMs: 1_700_000_000_000n,
    tracks: tracks.map((t) => ({ source: t.source, muted: t.muted ?? false })),
  } as unknown as NonNullable<WebhookEvent['participant']>
}

function buildRoom(channelId = CHANNEL_ID) {
  return { name: `voice-${channelId}` } as unknown as NonNullable<WebhookEvent['room']>
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset()
})

describe('parseChannelIdFromRoom', () => {
  it('returns channelId for voice-<id> names', () => {
    expect(parseChannelIdFromRoom('voice-abc')).toBe('abc')
  })
  it('returns null for non-voice rooms', () => {
    expect(parseChannelIdFromRoom('chat-abc')).toBeNull()
    expect(parseChannelIdFromRoom(undefined)).toBeNull()
    expect(parseChannelIdFromRoom('voice-')).toBeNull()
  })
  it('does not match dm- rooms (those go through the DM branch)', () => {
    expect(parseChannelIdFromRoom('dm-abc')).toBeNull()
  })
})

describe('parseDmChannelIdFromRoom', () => {
  it('returns channelId for dm-<id> names', () => {
    expect(parseDmChannelIdFromRoom('dm-abc')).toBe('abc')
  })
  it('returns null for non-dm rooms', () => {
    expect(parseDmChannelIdFromRoom('voice-abc')).toBeNull()
    expect(parseDmChannelIdFromRoom(undefined)).toBeNull()
    expect(parseDmChannelIdFromRoom('dm-')).toBeNull()
  })
})

describe('alreadyProcessed', () => {
  it('returns false on first occurrence and true on subsequent ones', async () => {
    mocks.set.mockResolvedValueOnce('OK')
    expect(await alreadyProcessed('evt-id-1')).toBe(false)
    expect(mocks.set).toHaveBeenCalledWith(
      'livekit:webhook:seen:evt-id-1',
      '1',
      'EX',
      60 * 60,
      'NX',
    )

    mocks.set.mockResolvedValueOnce(null)
    expect(await alreadyProcessed('evt-id-1')).toBe(true)
  })

  it('does not call Redis when id is empty', async () => {
    expect(await alreadyProcessed('')).toBe(false)
    expect(mocks.set).not.toHaveBeenCalled()
  })
})

describe('handleWebhookEvent', () => {
  it('participant_joined → voice.join + voice.state, sadd, cache invalidated', async () => {
    voiceChannelOk()
    await handleWebhookEvent(
      buildEvent({
        event: 'participant_joined',
        room: buildRoom(),
        participant: buildParticipant([
          { source: TrackSource.MICROPHONE, muted: false },
          { source: TrackSource.SCREEN_SHARE },
        ]),
      }),
    )
    expect(mocks.sadd).toHaveBeenCalledWith(
      `voice:channel:${CHANNEL_ID}:users`,
      USER_ID,
    )
    expect(mocks.del).toHaveBeenCalledWith(
      `voice:channel:${CHANNEL_ID}:participants-cache`,
    )
    expect(mocks.broadcastToServer).toHaveBeenCalledWith(SERVER_ID, {
      t: 'voice.join',
      channelId: CHANNEL_ID,
      userId: USER_ID,
    })
    expect(mocks.broadcastToServer).toHaveBeenCalledWith(SERVER_ID, {
      t: 'voice.state',
      channelId: CHANNEL_ID,
      userId: USER_ID,
      muted: false,
      screen: true,
    })
  })

  it('participant_left → voice.leave + srem + cache invalidated', async () => {
    voiceChannelOk()
    await handleWebhookEvent(
      buildEvent({
        event: 'participant_left',
        room: buildRoom(),
        participant: buildParticipant(),
      }),
    )
    expect(mocks.srem).toHaveBeenCalledWith(
      `voice:channel:${CHANNEL_ID}:users`,
      USER_ID,
    )
    expect(mocks.broadcastToServer).toHaveBeenCalledWith(SERVER_ID, {
      t: 'voice.leave',
      channelId: CHANNEL_ID,
      userId: USER_ID,
    })
  })

  it('participant_connection_aborted treated the same as participant_left', async () => {
    voiceChannelOk()
    await handleWebhookEvent(
      buildEvent({
        event: 'participant_connection_aborted',
        room: buildRoom(),
        participant: buildParticipant(),
      }),
    )
    expect(mocks.broadcastToServer).toHaveBeenCalledWith(SERVER_ID, {
      t: 'voice.leave',
      channelId: CHANNEL_ID,
      userId: USER_ID,
    })
  })

  it('track_published recomputes muted/screen from current tracks', async () => {
    voiceChannelOk()
    await handleWebhookEvent(
      buildEvent({
        event: 'track_published',
        room: buildRoom(),
        participant: buildParticipant([
          { source: TrackSource.MICROPHONE, muted: true },
        ]),
      }),
    )
    expect(mocks.broadcastToServer).toHaveBeenCalledWith(SERVER_ID, {
      t: 'voice.state',
      channelId: CHANNEL_ID,
      userId: USER_ID,
      muted: true,
      screen: false,
    })
    expect(mocks.sadd).not.toHaveBeenCalled()
  })

  it('room_finished clears Redis state, no broadcast', async () => {
    await handleWebhookEvent(
      buildEvent({ event: 'room_finished', room: buildRoom() }),
    )
    expect(mocks.del).toHaveBeenCalledWith(`voice:channel:${CHANNEL_ID}:users`)
    expect(mocks.del).toHaveBeenCalledWith(
      `voice:channel:${CHANNEL_ID}:participants-cache`,
    )
    expect(mocks.broadcastToServer).not.toHaveBeenCalled()
  })

  it('non-voice room names are ignored (no DB lookup, no broadcast)', async () => {
    await handleWebhookEvent(
      buildEvent({
        event: 'participant_joined',
        room: { name: 'chat-something' } as unknown as NonNullable<WebhookEvent['room']>,
        participant: buildParticipant(),
      }),
    )
    expect(mocks.channelLookup).not.toHaveBeenCalled()
    expect(mocks.broadcastToServer).not.toHaveBeenCalled()
  })

  it('channel lookup miss (deleted/text channel) → no broadcast', async () => {
    mocks.channelLookup.mockResolvedValueOnce([]) // nothing in DB
    await handleWebhookEvent(
      buildEvent({
        event: 'participant_joined',
        room: buildRoom(),
        participant: buildParticipant(),
      }),
    )
    expect(mocks.broadcastToServer).not.toHaveBeenCalled()
  })

  it('text channel masquerading as voice room → ignored', async () => {
    mocks.channelLookup.mockResolvedValueOnce([{ serverId: SERVER_ID, kind: 'text' }])
    await handleWebhookEvent(
      buildEvent({
        event: 'participant_joined',
        room: buildRoom(),
        participant: buildParticipant(),
      }),
    )
    expect(mocks.broadcastToServer).not.toHaveBeenCalled()
  })

  it('egress/ingress events are explicit no-ops (no warn)', async () => {
    const warn = vi.fn()
    for (const type of [
      'egress_started',
      'egress_updated',
      'egress_ended',
      'ingress_started',
      'ingress_ended',
      'room_started',
    ] as const) {
      await handleWebhookEvent(
        buildEvent({ event: type, room: buildRoom() }),
        { debug: () => {}, warn },
      )
    }
    expect(warn).not.toHaveBeenCalled()
    expect(mocks.broadcastToServer).not.toHaveBeenCalled()
  })

  it('truly unknown event type triggers a warn (so we catch SDK drift)', async () => {
    const warn = vi.fn()
    await handleWebhookEvent(
      buildEvent({ event: 'something_brand_new', room: buildRoom() }),
      { debug: () => {}, warn },
    )
    expect(warn).toHaveBeenCalled()
  })
})
