import type { Channel, MemberPublic, RoleRef } from '@kakdela/ginzu/api-types'

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

/**
 * Resolve `@<role name>` at the start of `rest` (текст после `@`). Имя роли
 * может содержать пробелы, поэтому матчим по префиксу: самое длинное имя роли,
 * которым начинается `rest`, с границей слова после. Возвращает роль и длину
 * совпавшего имени (чтобы парсер сдвинул позицию).
 */
export function findRoleByMention(
  roles: ReadonlyArray<RoleRef> | undefined,
  rest: string,
): { role: RoleRef; matchedLength: number } | null {
  if (!roles || roles.length === 0) return null
  const lowerRest = rest.toLowerCase()
  let best: RoleRef | null = null
  for (const r of roles) {
    const n = r.name.toLowerCase()
    if (n.length === 0 || !lowerRest.startsWith(n)) continue
    const after = rest.charAt(n.length)
    // следующий символ не должен продолжать слово (иначе @мод ≠ @модераторы)
    if (after && /[\p{L}\p{N}_-]/u.test(after)) continue
    if (!best || r.name.length > best.name.length) best = r
  }
  return best ? { role: best, matchedLength: best.name.length } : null
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
