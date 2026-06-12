import type { Channel, MemberPublic } from '@kakdela/ginzu/api-types'

/** Resolve a token after `@` to a server member. Matches:
 *   1. the full displayName (case-insensitive)
 *   2. the username/ник (so `@anya_k` finds @anya_k)
 *   3. the first word of the displayName (so `@anya` finds "Anya Kotova")
 */
export function findMemberByMention(
  members: ReadonlyMap<string, MemberPublic> | undefined,
  raw: string,
): MemberPublic | null {
  if (!members) return null
  const lower = raw.toLowerCase()
  let weakHit: MemberPublic | null = null
  for (const m of members.values()) {
    const name = m.displayName.toLowerCase()
    if (name === lower) return m
    if (m.username && m.username.toLowerCase() === lower) return m
    const first = name.split(/\s+/)[0]
    if (first === lower && !weakHit) weakHit = m
  }
  return weakHit
}

/** Resolve a token after `#` to a channel by exact (case-insensitive) name. */
export function findChannelByMention(
  channels: ReadonlyMap<string, Channel> | undefined,
  raw: string,
): Channel | null {
  if (!channels) return null
  const lower = raw.toLowerCase()
  for (const c of channels.values()) {
    if (c.name.toLowerCase() === lower) return c
  }
  return null
}
