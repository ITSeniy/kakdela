export type MentionType = 'user' | 'everyone' | 'here'

export interface ParsedMention {
  userId: string
  type: MentionType
}

export interface MentionCandidate {
  id: string
  displayName: string
  /** Логин-ник (lowercase) — `@ник` тоже валидное упоминание. */
  username?: string
}

export interface RoleCandidate {
  id: string
  name: string
  /** Может ли роль упоминать кто угодно. Если false — только при allowBroadcast. */
  mentionable: boolean
}

export interface ExtractMentionsResult {
  /** Конкретные пользователи (`@user`, `@everyone`, `@here`). */
  users: ParsedMention[]
  /** Роли, упомянутые в тексте и разрешённые к пингу — разворачивает вызывающий. */
  roleIds: string[]
}

export interface ExtractMentionsOptions {
  /** Text to scan for mentions. */
  text: string
  /** Who's sending — excluded from results so users don't ping themselves. */
  authorId: string
  /** Resolution pool for `@<name>` tokens (server members or DM participants). */
  candidates: readonly MentionCandidate[]
  /**
   * Whether the author is allowed to use `@everyone` / `@here`. Only owner /
   * admin roles should pass true here; for DM channels this stays false.
   */
  allowBroadcast: boolean
  /**
   * Identifiers of all candidates currently online. Used to expand `@here`.
   * For DM channels this is typically empty (we never broadcast in DM).
   */
  onlineIds: readonly string[]
  /** Роли сервера для резолва `@роль`. Для DM — пусто. */
  roleCandidates?: readonly RoleCandidate[]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// `@token` после пробела/начала строки. Не цепляется к email-вида
// «something@example.com» — там перед `@` стоит буква. Поддерживает буквы
// и кириллицу через \p{L}, цифры, `_` и `-`.
const MENTION_RE = /(^|[\s(])@([\p{L}\p{N}_-]+)/gu

function resolveName(token: string, candidates: readonly MentionCandidate[]): MentionCandidate | null {
  const lower = token.toLowerCase()
  let weakHit: MentionCandidate | null = null
  for (const m of candidates) {
    const name = m.displayName.toLowerCase()
    if (name === lower) return m
    if (m.username && m.username.toLowerCase() === lower) return m
    const first = name.split(/\s+/)[0]
    if (first === lower && !weakHit) weakHit = m
  }
  return weakHit
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Имена ролей могут содержать пробелы, поэтому их матчим отдельным проходом:
 * для каждой роли ищем `@<имя роли>` с границей слова после (чтобы `@мод` не
 * цеплялся к роли `@модераторы`). Возвращает id разрешённых к пингу ролей.
 */
function matchRoles(text: string, roles: readonly RoleCandidate[], allowBroadcast: boolean): string[] {
  const out: string[] = []
  for (const role of roles) {
    if (!role.mentionable && !allowBroadcast) continue
    const re = new RegExp(`(^|[\\s(])@${escapeRegExp(role.name)}(?![\\p{L}\\p{N}_-])`, 'iu')
    if (re.test(text)) out.push(role.id)
  }
  return out
}

/**
 * Extracts all valid mentions from a message text. Каждый mentioned user
 * появляется ровно один раз в результате — даже если упомянут несколькими
 * формами (`@alice`, `<@uuid>`, `@here` где он онлайн). Тип берётся самый
 * сильный (broadcast > user — но фактически мы возвращаем по уникальному
 * userId один тип, что нам и нужно для строки mentions).
 *
 * Роли возвращаются отдельным списком id (вызывающий разворачивает их в
 * участников — это требует БД). Self-mentions автоматически отфильтровываются.
 */
export function extractMentions(opts: ExtractMentionsOptions): ExtractMentionsResult {
  const { text, authorId, candidates, allowBroadcast, onlineIds, roleCandidates } = opts

  const byUser = new Map<string, MentionType>()
  // Set один раз для O(1) проверки. authorId выкидываем независимо.
  const candidateIds = new Set(candidates.map((c) => c.id))

  for (const match of text.matchAll(MENTION_RE)) {
    const token = match[2]
    if (!token) continue

    if (token === 'everyone') {
      if (!allowBroadcast) continue
      for (const c of candidates) {
        if (c.id === authorId) continue
        if (!byUser.has(c.id)) byUser.set(c.id, 'everyone')
      }
      continue
    }
    if (token === 'here') {
      if (!allowBroadcast) continue
      for (const id of onlineIds) {
        if (id === authorId) continue
        if (!candidateIds.has(id)) continue
        if (!byUser.has(id)) byUser.set(id, 'here')
      }
      continue
    }

    if (UUID_RE.test(token)) {
      if (token === authorId) continue
      if (!candidateIds.has(token)) continue
      if (!byUser.has(token)) byUser.set(token, 'user')
      continue
    }

    const member = resolveName(token, candidates)
    if (!member) continue
    if (member.id === authorId) continue
    if (!byUser.has(member.id)) byUser.set(member.id, 'user')
  }

  const users = Array.from(byUser, ([userId, type]) => ({ userId, type }))
  const roleIds = roleCandidates && roleCandidates.length > 0
    ? matchRoles(text, roleCandidates, allowBroadcast)
    : []
  return { users, roleIds }
}
