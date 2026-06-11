import { and, eq } from 'drizzle-orm'

import { channels, dmChannels, serverMembers } from '../db/schema.js'
import { db } from './db.js'

export type MemberRole = 'owner' | 'admin' | 'member'

function makeError(statusCode: number, code: string, message: string): Error {
  return Object.assign(new Error(message), { statusCode, code })
}

export function forbidden(message = 'access denied'): Error {
  return makeError(403, 'forbidden', message)
}

export function notFound(code: string, message: string): Error {
  return makeError(404, code, message)
}

export async function assertMember(userId: string, serverId: string): Promise<{ role: MemberRole }> {
  const rows = await db
    .select({ role: serverMembers.role })
    .from(serverMembers)
    .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)))
    .limit(1)
  const member = rows[0]
  if (!member) throw forbidden('not a member of this server')
  return { role: member.role }
}

export async function assertRole(
  userId: string,
  serverId: string,
  roles: MemberRole[],
): Promise<void> {
  const { role } = await assertMember(userId, serverId)
  if (!roles.includes(role)) throw forbidden('insufficient permissions')
}

export type ChannelAccess =
  | { kind: 'server'; channelId: string; serverId: string }
  | { kind: 'dm';     channelId: string; userAId: string; userBId: string }

/**
 * Универсальная проверка доступа: serverChannel — через members, DM —
 * через `dm_channels` (user должен быть одним из двух участников).
 * Возвращает «классификацию» канала, чтобы вызывающая логика могла, к
 * примеру, корректно собрать broadcast topic'и или подтянуть собеседника.
 */
export async function assertCanAccessChannel(
  userId: string,
  channelId: string,
): Promise<ChannelAccess> {
  const chRows = await db
    .select({ id: channels.id, serverId: channels.serverId, kind: channels.kind })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
  const ch = chRows[0]
  if (!ch) throw notFound('channel-not-found', 'channel not found')

  if (ch.kind === 'dm') {
    const dmRows = await db
      .select({ userAId: dmChannels.userAId, userBId: dmChannels.userBId })
      .from(dmChannels)
      .where(eq(dmChannels.channelId, channelId))
      .limit(1)
    const dm = dmRows[0]
    if (!dm) throw notFound('channel-not-found', 'channel not found')
    if (dm.userAId !== userId && dm.userBId !== userId) {
      throw forbidden('not a participant of this dm')
    }
    return { kind: 'dm', channelId, userAId: dm.userAId, userBId: dm.userBId }
  }

  if (!ch.serverId) {
    // text/voice channel without a server: should never happen, but
    // defensively refuse access rather than 500.
    throw notFound('channel-not-found', 'channel not found')
  }
  await assertMember(userId, ch.serverId)
  return { kind: 'server', channelId, serverId: ch.serverId }
}
