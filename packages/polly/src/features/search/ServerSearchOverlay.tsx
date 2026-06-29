// Серверный поиск (лупа в шапке канала). Открывается оверлеем НАПОДОБИЕ
// командной палитры: карточки участников, каналов и найденных сообщений,
// заскоупленные на текущий сервер. Не уводит на полноэкранный /search —
// тот остаётся для кросс-серверного поиска с рельсы.

import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useQuery } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { useLocation } from 'wouter'

import type { Channel, MemberPublic, SearchResultItem } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { Icon } from '../../components/Icon.js'
import { useViewScope } from '../navigation/viewScope.js'
import { memberNameColor } from '../members/MemberList.js'
import { useProfileUi } from '../profile/store.js'
import { getServerDetail, listMembers } from '../servers/api.js'
import { searchMessages } from './api.js'

const DEBOUNCE_MS = 250
const MSG_LIMIT = 8

const STATUS_LABEL: Record<MemberPublic['status'], string> = {
  online:  'в сети',
  idle:    'отошёл',
  dnd:     'не беспокоить',
  offline: 'не в сети',
}
const STATUS_ORDER: Record<MemberPublic['status'], number> = {
  online: 0, idle: 1, dnd: 2, offline: 3,
}
const ROLE_TAG: Record<MemberPublic['role'], string | null> = {
  owner: 'хоз', admin: 'адм', member: null,
}

/** Подстрока — приоритетна; иначе подпоследовательность (fuzzy). null = нет. */
function fuzzyScore(text: string, q: string): number | null {
  if (q === '') return 0
  const t = text.toLowerCase()
  const idx = t.indexOf(q)
  if (idx >= 0) return 1000 - idx
  let ti = 0
  for (let qi = 0; qi < q.length; qi += 1) {
    const found = t.indexOf(q[qi]!, ti)
    if (found < 0) return null
    ti = found + 1
  }
  return 100
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ru', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// `ts_headline` отдаёт content с `<mark>` вокруг совпадений — пропускаем через
// DOMPurify, разрешая только `<mark>` (как в SearchScreen).
function sanitizeHeadline(html: string): string {
  if (typeof window === 'undefined') return html
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: [] })
}

interface Row {
  key: string
  section: string
  kind: 'member' | 'channel' | 'message' | 'expand'
  member?: MemberPublic
  channel?: Channel
  result?: SearchResultItem
  expandCount?: number
  run(): void
}

interface ServerSearchOverlayProps {
  serverId: string
  serverName: string
  onClose(): void
}

export function ServerSearchOverlay({ serverId, serverName, onClose }: ServerSearchOverlayProps) {
  const [, navigate] = useLocation()
  const openProfile = useProfileUi((s) => s.open)
  const setScope = useViewScope((s) => s.setScope)

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => listMembers(serverId),
    staleTime: 60_000,
  })
  const { data: detail } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => getServerDetail(serverId),
    staleTime: 30_000,
  })

  const { data: msgData, isFetching: msgFetching } = useQuery({
    queryKey: ['search', debounced, serverId],
    queryFn: () => searchMessages({ q: debounced, serverId, sort: 'rank', limit: MSG_LIMIT }),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  })

  function openFullSearch() {
    setScope(serverId, serverName)
    onClose()
    navigate('/search')
  }

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase()
    const out: Row[] = []

    // ── участники ──
    const scored = members
      .map((m) => ({
        m,
        score: Math.max(
          fuzzyScore(m.displayName, q) ?? -1,
          m.username ? (fuzzyScore(m.username, q) ?? -1) : -1,
        ),
      }))
      .filter((x) => x.score >= 0)
    scored.sort((a, b) => {
      if (q === '') {
        const sa = STATUS_ORDER[a.m.status] ?? 4
        const sb = STATUS_ORDER[b.m.status] ?? 4
        if (sa !== sb) return sa - sb
        return a.m.displayName.localeCompare(b.m.displayName)
      }
      return b.score - a.score
    })
    for (const { m } of scored) {
      out.push({
        key: `m:${m.id}`,
        section: 'участники',
        kind: 'member',
        member: m,
        run: () => { onClose(); openProfile(m.id) },
      })
    }

    // ── каналы (текстовые/голосовые верхнего уровня, без тредов и личек) ──
    const channels = (detail?.channels ?? [])
      .filter((c) => c.kind !== 'dm' && !c.parentChannelId)
      .map((c) => ({ c, score: fuzzyScore(c.name, q) }))
      .filter((x): x is { c: Channel; score: number } => x.score !== null)
    channels.sort((a, b) => b.score - a.score || a.c.position - b.c.position)
    for (const { c } of channels) {
      out.push({
        key: `c:${c.id}`,
        section: 'каналы',
        kind: 'channel',
        channel: c,
        run: () => { onClose(); navigate(`/servers/${serverId}/channels/${c.id}`) },
      })
    }

    // ── сообщения (полнотекст, только при непустом запросе) ──
    if (debounced.length > 0) {
      for (const r of msgData?.results ?? []) {
        out.push({
          key: `msg:${r.messageId}`,
          section: 'сообщения',
          kind: 'message',
          result: r,
          run: () => {
            onClose()
            const path = r.serverId
              ? `/servers/${r.serverId}/channels/${r.channelId}`
              : `/dm/${r.channelId}`
            navigate(`${path}#msg:${r.messageId}`)
          },
        })
      }
      const total = msgData?.total ?? 0
      const shown = msgData?.results.length ?? 0
      if (total > shown) {
        out.push({
          key: 'expand',
          section: 'сообщения',
          kind: 'expand',
          expandCount: total - shown,
          run: openFullSearch,
        })
      }
    }

    return out
  // openFullSearch/openProfile/navigate стабильны для целей этого мемо.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, detail, msgData, query, debounced, serverId])

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, rows.length - 1)))
  }, [rows.length])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-row-index="${cursor}"]`)
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [cursor])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (query) setQuery('')
      else onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      rows[cursor]?.run()
    }
  }

  // Группировка по секциям (rows уже в порядке участники→каналы→сообщения).
  const groups: { name: string; rows: { row: Row; index: number }[] }[] = []
  rows.forEach((row, index) => {
    const last = groups[groups.length - 1]
    if (last && last.name === row.section) last.rows.push({ row, index })
    else groups.push({ name: row.section, rows: [{ row, index }] })
  })

  const showNoResults = debounced.length > 0 && !msgFetching && rows.length === 0

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-kd-overlay-soft backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[680px] max-w-[92vw] h-fit max-h-[70vh] bg-kd-panel border border-kd-border rounded-[12px] shadow-kd-modal overflow-hidden flex flex-col kd-pop-in"
        onKeyDown={onKeyDown}
      >
        <div className="px-4 py-3 bg-kd-panel-alt border-b border-kd-border flex items-center gap-2.5">
          <Icon.Search size={14} className="text-kd-text-mute shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            placeholder={`поиск в ${serverName}…`}
            className="flex-1 bg-transparent outline-none text-[14px] text-kd-text placeholder:text-kd-text-mute"
          />
          {msgData && debounced && (
            <span className="text-[10px] font-mono text-kd-text-mute shrink-0">
              {msgData.total} {msgData.total === 1 ? 'сообщение' : 'сообщений'}
            </span>
          )}
          <span className="text-[9px] font-mono text-kd-text-mute shrink-0 px-1.5 py-0.5 rounded border border-kd-border">esc</span>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {showNoResults && (
            <div className="px-4 py-8 text-center text-[11px] font-mono text-kd-text-mute">
              по запросу «{debounced}» ничего не нашлось
            </div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <div className="px-4 pt-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-[0.05em] text-kd-text-mute select-none">
                — {g.name}
                {g.name === 'сообщения' && msgData
                  ? <span className="opacity-70"> · {msgData.total}</span>
                  : <span className="opacity-70"> · {g.rows.filter((r) => r.row.kind !== 'expand').length}</span>}
              </div>
              <div className="px-1.5">
                {g.rows.map(({ row, index }) => {
                  const active = index === cursor
                  const cardClass = [
                    'w-full flex items-center gap-3 px-2.5 py-1.5 rounded-kd text-left transition-colors',
                    active ? 'bg-kd-panel-hi ring-1 ring-kd-border' : 'hover:bg-kd-panel-alt/60',
                  ].join(' ')
                  return (
                    <button
                      key={row.key}
                      type="button"
                      data-row-index={index}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => row.run()}
                      className={cardClass}
                    >
                      <RowBody row={row} active={active} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {msgFetching && rows.length === 0 && (
            <div className="px-4 py-3 text-center text-[10px] font-mono text-kd-text-mute">ищем…</div>
          )}
        </div>

        <div className="px-4 py-2 bg-kd-panel-alt border-t border-kd-border flex items-center gap-3.5 text-[9px] font-mono text-kd-text-mute select-none">
          <span>↕ навигация</span>
          <span>↵ открыть</span>
          <span>esc закрыть</span>
          <span className="flex-1" />
          <span>поиск · {serverName}</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function RowBody({ row, active }: { row: Row; active: boolean }) {
  if (row.kind === 'member' && row.member) {
    const m = row.member
    const color = memberNameColor(m)
    const tag = ROLE_TAG[m.role]
    return (
      <>
        <Avatar name={m.displayName} avatarUrl={m.avatarUrl} size={28} status={m.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="text-[12px] font-semibold text-kd-text truncate" style={color ? { color } : undefined}>
              {m.displayName}
            </span>
            {tag && <Badge variant="role">{tag}</Badge>}
          </div>
          <div className="text-[10px] text-kd-text-mute truncate leading-tight mt-0.5">
            {m.customStatus?.trim() || STATUS_LABEL[m.status]}
          </div>
        </div>
        {active && <span className="text-[10px] font-mono text-kd-text-mute shrink-0">профиль ↵</span>}
      </>
    )
  }

  if (row.kind === 'channel' && row.channel) {
    const c = row.channel
    return (
      <>
        <span className="w-7 h-7 rounded-kd bg-kd-panel-alt border border-kd-border flex items-center justify-center text-kd-text-soft shrink-0">
          {c.kind === 'voice' ? <Icon.Speaker size={13} /> : <Icon.Hash size={13} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-kd-text truncate leading-tight">{c.name}</div>
          <div className="text-[10px] text-kd-text-mute truncate leading-tight mt-0.5">
            {c.category ?? (c.kind === 'voice' ? 'голосовой' : 'канал')}
          </div>
        </div>
        {active && <span className="text-[10px] font-mono text-kd-text-mute shrink-0">↵</span>}
      </>
    )
  }

  if (row.kind === 'expand') {
    return (
      <>
        <span className="w-7 h-7 rounded-kd bg-kd-panel-alt border border-kd-border flex items-center justify-center text-kd-text-soft shrink-0">
          <Icon.Search size={13} />
        </span>
        <div className="flex-1 min-w-0 text-[12px] text-kd-text-soft truncate">
          ещё {row.expandCount} — открыть полный поиск
        </div>
        <span className="text-[10px] font-mono text-kd-text-mute shrink-0">→</span>
      </>
    )
  }

  // message
  if (row.kind === 'message' && row.result) {
    const r = row.result
    const headline = sanitizeHeadline(r.headline)
    return (
      <>
        <Avatar name={r.authorName} avatarUrl={r.authorAvatarUrl} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 leading-tight">
            <span className="text-[12px] font-semibold text-kd-text truncate">{r.authorName}</span>
            <span className="text-[9px] font-mono text-kd-text-mute shrink-0">
              {r.channelKind === 'dm' ? 'лс' : `#${r.channelName}`} · {fmtDate(r.createdAt)}
            </span>
          </div>
          <div
            className="text-[11px] text-kd-text-soft truncate leading-snug mt-0.5 kd-search-hit"
            dangerouslySetInnerHTML={{ __html: headline }}
          />
        </div>
        {active && <span className="text-[10px] font-mono text-kd-text-mute shrink-0">↵</span>}
      </>
    )
  }

  return null
}
