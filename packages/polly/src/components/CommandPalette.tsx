// Командная палитра ⌘K (palette · v2). Быстрый переход: недавнее, каналы,
// люди, серверы, действия. Карточки в две строки (имя + подпись), счётчики
// у секций, карточное выделение, ⌘1–9 для недавнего, Tab — подставить запрос.
// Данные — из существующих queries (servers/channels/dm/members/voice), своих
// эндпоинтов не вводим. Все queries gated `enabled: open`.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { useLocation } from 'wouter'
import { create } from 'zustand'

import type { Channel, DmSummary, MemberPublic } from '@kakdela/ginzu/api-types'

import { useAuthStore } from '../features/auth/store.js'
import { listDms } from '../features/dm/api.js'
import { useRecents } from '../features/navigation/recents.js'
import { getServerDetail, listMembers, listServers } from '../features/servers/api.js'
import { useServerCreateJoinUi } from '../features/servers/store.js'
import { useVoiceChannelPresence } from '../features/voice/useVoiceChannelPresence.js'
import { Avatar } from './Avatar.js'
import { useThemeStore } from '../lib/theme.js'
import { Icon } from './Icon.js'

interface PaletteState {
  open: boolean
  setOpen(v: boolean): void
  toggle(): void
}

export const useCommandPalette = create<PaletteState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}))

interface PaletteRow {
  key: string
  section: string
  icon: React.ReactNode
  /** true → иконка это круглый Avatar (без квадратной подложки). */
  avatar?: boolean
  title: string
  subtitle?: string
  /** Правый мета-блок: бейдж непрочитанного, ⌘N и т.п. */
  meta?: React.ReactNode
  /** Позиция в «недавнем» (1..) — для ⌘1–9 и бейджа. */
  recentIndex?: number
  /** Доп. вес для сортировки внутри секции (недавнее — по свежести). */
  weight?: number
  run(): void
}

const STATUS_LABEL: Record<MemberPublic['status'], string> = {
  online:  'в сети',
  idle:    'отошёл',
  dnd:     'не беспокоить',
  offline: 'не в сети',
}

/** Краткое «N назад» для подписи личек/недавнего (без date-fns). */
function relTime(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 45) return 'только что'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} мин назад`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ч назад`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} дн назад`
  const w = Math.round(d / 7)
  if (w < 5) return `${w} нед назад`
  return `${Math.round(d / 30)} мес назад`
}

/** Подпись карточки канала: категория/тип · контекст (сервер или «N в эфире»). */
function channelSubtitle(kind: string, category: string | null | undefined, serverName: string, voiceCount: number): string {
  if (kind === 'voice') {
    return voiceCount > 0 ? `голосовой · ${voiceCount} в эфире` : `голосовой · ${serverName}`
  }
  return category ? `${category} · ${serverName}` : serverName
}

/** Подстрока — приоритетна; иначе подпоследовательность (fuzzy). null = нет. */
function fuzzyScore(text: string, q: string): number | null {
  if (q === '') return 0
  const t = text.toLowerCase()
  const idx = t.indexOf(q)
  if (idx >= 0) return 1000 - idx // чем раньше совпадение, тем выше
  // Подпоследовательность: все буквы q встречаются по порядку.
  let ti = 0
  for (let qi = 0; qi < q.length; qi += 1) {
    const ch = q[qi]!
    const found = t.indexOf(ch, ti)
    if (found < 0) return null
    ti = found + 1
  }
  return 100
}

const SECTION_ORDER = ['недавнее', 'каналы', 'люди', 'серверы', 'действия']

export function CommandPalette() {
  const open = useCommandPalette((s) => s.open)
  const setOpen = useCommandPalette((s) => s.setOpen)
  const [, navigate] = useLocation()
  const me = useAuthStore((s) => s.user)
  const openCreate = useServerCreateJoinUi((s) => s.openCreate)
  const openJoin = useServerCreateJoinUi((s) => s.openJoin)
  const cycleTheme = useThemeStore((s) => s.cycleMode)
  const recents = useRecents((s) => s.entries)

  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: listServers,
    staleTime: 30_000,
    enabled: open,
  })

  const detailQueries = useQueries({
    queries: servers.map((s) => ({
      queryKey: ['server', s.id],
      queryFn: () => getServerDetail(s.id),
      staleTime: 30_000,
      enabled: open,
    })),
  })

  const memberQueries = useQueries({
    queries: servers.map((s) => ({
      queryKey: ['members', s.id],
      queryFn: () => listMembers(s.id),
      staleTime: 60_000,
      enabled: open,
    })),
  })

  const { data: dms = [] } = useQuery({
    queryKey: ['dm-list'],
    queryFn: listDms,
    staleTime: 10_000,
    enabled: open,
  })

  // Голосовой пресенс по всем каналам — для подписи «N в эфире». Пока палитра
  // закрыта, передаём [] → участники не запрашиваются.
  const allChannels = useMemo<Channel[]>(
    () => (open ? detailQueries.flatMap((dq) => dq.data?.channels ?? []) : []),
    [open, detailQueries],
  )
  const voicePresence = useVoiceChannelPresence(allChannels)
  const voiceCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const [chId, parts] of voicePresence) m.set(chId, parts.length)
    return m
  }, [voicePresence])

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Сводные карты для резолва имён каналов/личек (для «недавнего»).
  const channelById = useMemo(() => {
    const m = new Map<string, { name: string; kind: string; category: string | null; serverId: string | null; serverName: string }>()
    for (const dq of detailQueries) {
      const detail = dq.data
      if (!detail) continue
      for (const c of detail.channels) {
        if (c.kind === 'dm') continue
        m.set(c.id, { name: c.name, kind: c.kind, category: c.category ?? null, serverId: c.serverId, serverName: detail.server.name })
      }
    }
    return m
  }, [detailQueries])

  const dmByChannel = useMemo(() => {
    const m = new Map<string, DmSummary>()
    for (const d of dms) m.set(d.channelId, d)
    return m
  }, [dms])

  const rows = useMemo<PaletteRow[]>(() => {
    const all: PaletteRow[] = []
    const q = query.trim().toLowerCase()

    // ── недавнее (только без запроса — это быстрый доступ) ──
    if (q === '') {
      let w = recents.length
      let n = 0
      for (const r of recents) {
        n += 1
        const recentIndex = n
        const badge = recentIndex <= 9
          ? <span className="text-[9px] font-mono text-kd-text-mute px-1.5 py-0.5 rounded border border-kd-border">⌘{recentIndex}</span>
          : undefined
        if (r.kind === 'channel') {
          const c = channelById.get(r.id)
          if (!c) continue
          all.push({
            key: `recent:ch:${r.id}`,
            section: 'недавнее',
            icon: c.kind === 'voice' ? <Icon.Speaker size={13} /> : <Icon.Hash size={13} />,
            title: c.name,
            subtitle: channelSubtitle(c.kind, c.category, c.serverName, voiceCount.get(r.id) ?? 0),
            meta: badge,
            recentIndex,
            weight: w--,
            run: () => navigate(`/servers/${r.serverId ?? c.serverId}/channels/${r.id}`),
          })
        } else {
          const d = dmByChannel.get(r.id)
          if (!d) continue
          const unread = d.unreadCount > 0
            ? <span className="text-[9px] font-mono text-white bg-kd-accent px-1.5 py-0.5 rounded-full">{d.unreadCount}</span>
            : badge
          all.push({
            key: `recent:dm:${r.id}`,
            section: 'недавнее',
            icon: <Avatar name={d.otherUser.displayName} avatarUrl={d.otherUser.avatarUrl} size={26} status={d.otherUser.status} />,
            avatar: true,
            title: d.otherUser.displayName,
            subtitle: d.lastMessage ? `ЛС · ${relTime(d.lastMessage.createdAt)}` : 'личные сообщения',
            meta: unread,
            recentIndex,
            weight: w--,
            run: () => navigate(`/dm/${r.id}`),
          })
        }
      }
    }

    // ── каналы ──
    for (const dq of detailQueries) {
      const detail = dq.data
      if (!detail) continue
      for (const c of detail.channels) {
        if (c.kind === 'dm') continue
        const score = fuzzyScore(c.name, q)
        if (score === null) continue
        all.push({
          key: `ch:${c.id}`,
          section: 'каналы',
          icon: c.kind === 'voice' ? <Icon.Speaker size={13} /> : <Icon.Hash size={13} />,
          title: c.name,
          subtitle: channelSubtitle(c.kind, c.category, detail.server.name, voiceCount.get(c.id) ?? 0),
          weight: score,
          run: () => navigate(`/servers/${c.serverId}/channels/${c.id}`),
        })
      }
    }

    // ── люди (участники всех серверов, дедуп; + личка для last-seen) ──
    const seenPeople = new Set<string>()
    for (const mq of memberQueries) {
      const members = mq.data
      if (!members) continue
      for (const member of members) {
        if (member.id === me?.id) continue
        if (seenPeople.has(member.id)) continue
        const score = Math.max(
          fuzzyScore(member.displayName, q) ?? -1,
          member.username ? (fuzzyScore(member.username, q) ?? -1) : -1,
        )
        if (score < 0) continue
        seenPeople.add(member.id)
        const custom = member.customStatus?.trim()
        all.push({
          key: `ppl:${member.id}`,
          section: 'люди',
          icon: <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size={26} status={member.status} />,
          avatar: true,
          title: member.displayName,
          subtitle: custom ? custom : STATUS_LABEL[member.status],
          weight: score,
          run: () => navigate(`/dm/with/${member.id}`),
        })
      }
    }

    // ── серверы ──
    for (const s of servers) {
      const score = fuzzyScore(s.name, q)
      if (score === null) continue
      all.push({
        key: `srv:${s.id}`,
        section: 'серверы',
        icon: <span className="text-[11px] font-bold">{s.name.slice(0, 1).toUpperCase()}</span>,
        title: s.name,
        subtitle: 'сервер',
        weight: score,
        run: () => navigate(`/servers/${s.id}`),
      })
    }

    // ── действия ──
    const actions: Omit<PaletteRow, 'weight'>[] = [
      { key: 'a:dm', section: 'действия', icon: <span className="text-[9px] font-bold font-mono">кд</span>, title: 'личные сообщения', subtitle: 'все диалоги', run: () => navigate('/dm') },
      { key: 'a:inbox', section: 'действия', icon: <Icon.Inbox size={13} />, title: 'входящие', subtitle: 'упоминания и ответы', run: () => navigate('/inbox') },
      { key: 'a:search', section: 'действия', icon: <Icon.Search size={13} />, title: 'поиск по сообщениям', subtitle: 'полнотекстовый поиск', run: () => navigate('/search') },
      { key: 'a:create', section: 'действия', icon: <Icon.Plus size={13} />, title: 'создать сервер', subtitle: 'новое пространство', run: openCreate },
      { key: 'a:join', section: 'действия', icon: <span className="text-[12px] font-mono">↪</span>, title: 'принять инвайт', subtitle: 'по коду-приглашению', run: openJoin },
      { key: 'a:theme', section: 'действия', icon: <Icon.Sparkle size={13} />, title: 'переключить тему', subtitle: 'светлая / тёмная / системная', run: cycleTheme },
    ]
    for (const a of actions) {
      const score = fuzzyScore(a.title, q)
      if (score === null) continue
      all.push({ ...a, weight: score })
    }

    // Сортируем внутри секций по весу, секции — в фиксированном порядке.
    all.sort((a, b) => {
      const sa = SECTION_ORDER.indexOf(a.section)
      const sb = SECTION_ORDER.indexOf(b.section)
      if (sa !== sb) return sa - sb
      return (b.weight ?? 0) - (a.weight ?? 0)
    })

    return all.slice(0, 40)
  }, [servers, detailQueries, memberQueries, dms, recents, channelById, dmByChannel, voiceCount, query, navigate, openCreate, openJoin, cycleTheme, me])

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, rows.length - 1)))
  }, [rows.length])

  // Держим выбранную строку в зоне видимости при навигации с клавиатуры.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.querySelector(`[data-row-index="${cursor}"]`)
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  function runRow(row: PaletteRow | undefined) {
    if (!row) return
    setOpen(false)
    row.run()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      // ⌘1–9 — быстрый переход к N-му недавнему.
      e.preventDefault()
      const n = Number(e.key)
      runRow(rows.find((r) => r.recentIndex === n))
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Tab') {
      // Подставить выбранное в строку запроса — уточнить поиск.
      e.preventDefault()
      const row = rows[cursor]
      if (row) { setQuery(row.title); setCursor(0) }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runRow(rows[cursor])
    }
  }

  // Группируем по секциям (rows уже отсортированы по порядку секций).
  const groups: { name: string; rows: { row: PaletteRow; index: number }[] }[] = []
  rows.forEach((row, index) => {
    const last = groups[groups.length - 1]
    if (last && last.name === row.section) last.rows.push({ row, index })
    else groups.push({ name: row.section, rows: [{ row, index }] })
  })

  const matchCount = rows.length

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-kd-overlay-soft backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
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
            placeholder="канал, человек, сервер или действие…"
            className="flex-1 bg-transparent outline-none text-[14px] text-kd-text placeholder:text-kd-text-mute"
          />
          {query && (
            <span className="text-[10px] font-mono text-kd-text-mute shrink-0">
              {matchCount} {matchCount === 1 ? 'совпадение' : 'совпадений'}
            </span>
          )}
          <span className="text-[9px] font-mono text-kd-text-mute shrink-0 px-1.5 py-0.5 rounded border border-kd-border">esc</span>
        </div>

        {showHint && (
          <div className="px-4 py-1.5 bg-kd-bg-deep border-b border-kd-border-soft text-[10px] font-mono text-kd-text-mute">
            ⌘1–9 — недавнее · Tab — подставить в запрос · ↵ — открыть · Esc — закрыть
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {rows.length === 0 && (
            <div className="px-4 py-8 text-center text-[11px] font-mono text-kd-text-mute">
              ничего не нашлось
            </div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <div className="px-4 pt-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-[0.05em] text-kd-text-mute select-none">
                — {g.name}{g.name !== 'недавнее' && <span className="opacity-70"> · {g.rows.length}</span>}
              </div>
              <div className="px-1.5">
                {g.rows.map(({ row, index }) => {
                  const active = index === cursor
                  return (
                    <button
                      key={row.key}
                      type="button"
                      data-row-index={index}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => runRow(row)}
                      className={[
                        'w-full flex items-center gap-3 px-2.5 py-1.5 rounded-kd text-left transition-colors',
                        active ? 'bg-kd-panel-hi ring-1 ring-kd-border' : 'hover:bg-kd-panel-alt/60',
                      ].join(' ')}
                    >
                      {row.avatar ? (
                        row.icon
                      ) : (
                        <span className="w-7 h-7 rounded-kd bg-kd-panel-alt border border-kd-border flex items-center justify-center text-kd-text-soft shrink-0 overflow-hidden">
                          {row.icon}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-kd-text truncate leading-tight">{row.title}</div>
                        {row.subtitle && (
                          <div className="text-[10px] text-kd-text-mute truncate leading-tight mt-0.5">{row.subtitle}</div>
                        )}
                      </div>
                      {row.meta
                        ? <span className="shrink-0">{row.meta}</span>
                        : active && <span className="text-[10px] font-mono text-kd-text-mute shrink-0">↵</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 bg-kd-panel-alt border-t border-kd-border flex items-center gap-3.5 text-[9px] font-mono text-kd-text-mute select-none">
          <span>↕ навигация</span>
          <span>↵ открыть</span>
          <span>⇄ заменить запрос</span>
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className={`transition-colors ${showHint ? 'text-kd-text-soft' : 'hover:text-kd-text-soft'}`}
          >
            ? подсказка
          </button>
          <span className="flex-1" />
          <span>palette · v2</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
