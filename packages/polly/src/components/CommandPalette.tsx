// Командная палитра ⌘K (palette · v2). Быстрый переход: недавнее, каналы,
// люди, серверы, действия. Fuzzy-поиск (подстрока + подпоследовательность).
// Данные — из существующих queries (servers/channels/dm/members), своих
// эндпоинтов не вводим. Все queries gated `enabled: open`.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { useLocation } from 'wouter'
import { create } from 'zustand'

import type { DmSummary, MemberPublic } from '@kakdela/ginzu/api-types'

import { useAuthStore } from '../features/auth/store.js'
import { listDms } from '../features/dm/api.js'
import { useRecents } from '../features/navigation/recents.js'
import { getServerDetail, listMembers, listServers } from '../features/servers/api.js'
import { useServerCreateJoinUi } from '../features/servers/store.js'
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
  label: string
  hint?: string
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

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Сводные карты для резолва имён каналов/личек (для «недавнего»).
  const channelById = useMemo(() => {
    const m = new Map<string, { name: string; kind: string; serverId: string | null; serverName: string }>()
    for (const dq of detailQueries) {
      const detail = dq.data
      if (!detail) continue
      for (const c of detail.channels) {
        if (c.kind === 'dm') continue
        m.set(c.id, { name: c.name, kind: c.kind, serverId: c.serverId, serverName: detail.server.name })
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
      for (const r of recents) {
        if (r.kind === 'channel') {
          const c = channelById.get(r.id)
          if (!c) continue
          all.push({
            key: `recent:ch:${r.id}`,
            section: 'недавнее',
            icon: c.kind === 'voice' ? <Icon.Speaker size={11} /> : <Icon.Hash size={11} />,
            label: c.name,
            hint: c.serverName,
            weight: w--,
            run: () => navigate(`/servers/${r.serverId ?? c.serverId}/channels/${r.id}`),
          })
        } else {
          const d = dmByChannel.get(r.id)
          if (!d) continue
          all.push({
            key: `recent:dm:${r.id}`,
            section: 'недавнее',
            icon: <Avatar name={d.otherUser.displayName} avatarUrl={d.otherUser.avatarUrl} size={18} />,
            label: d.otherUser.displayName,
            hint: 'личные сообщения',
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
          icon: c.kind === 'voice' ? <Icon.Speaker size={11} /> : <Icon.Hash size={11} />,
          label: c.name,
          hint: c.kind === 'voice' ? `${detail.server.name} · голосовой` : detail.server.name,
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
        const status = STATUS_LABEL[member.status]
        const hint = member.customStatus ? `${member.customStatus}` : status
        all.push({
          key: `ppl:${member.id}`,
          section: 'люди',
          icon: <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size={18} />,
          label: member.displayName,
          hint,
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
        icon: <span className="text-[10px] font-bold">{s.name.slice(0, 1).toUpperCase()}</span>,
        label: s.name,
        hint: 'сервер',
        weight: score,
        run: () => navigate(`/servers/${s.id}`),
      })
    }

    // ── действия ──
    const actions: Omit<PaletteRow, 'weight'>[] = [
      { key: 'a:dm', section: 'действия', icon: <span className="text-[9px] font-bold font-mono">кд</span>, label: 'личные сообщения', run: () => navigate('/dm') },
      { key: 'a:inbox', section: 'действия', icon: <Icon.Inbox size={11} />, label: 'входящие', run: () => navigate('/inbox') },
      { key: 'a:search', section: 'действия', icon: <Icon.Search size={11} />, label: 'поиск по сообщениям', run: () => navigate('/search') },
      { key: 'a:create', section: 'действия', icon: <Icon.Plus size={11} />, label: 'создать сервер', run: openCreate },
      { key: 'a:join', section: 'действия', icon: <span className="text-[11px] font-mono">↪</span>, label: 'принять инвайт', run: openJoin },
      { key: 'a:theme', section: 'действия', icon: <Icon.Sparkle size={11} />, label: 'переключить тему', hint: 'light/dark/system', run: cycleTheme },
    ]
    for (const a of actions) {
      const score = fuzzyScore(a.label, q)
      if (score === null) continue
      all.push({ ...a, weight: score })
    }

    // Сортируем внутри секций по весу, секции — в фиксированном порядке.
    const SECTION_ORDER = ['недавнее', 'каналы', 'люди', 'серверы', 'действия']
    all.sort((a, b) => {
      const sa = SECTION_ORDER.indexOf(a.section)
      const sb = SECTION_ORDER.indexOf(b.section)
      if (sa !== sb) return sa - sb
      return (b.weight ?? 0) - (a.weight ?? 0)
    })

    return all.slice(0, 40)
  }, [servers, detailQueries, memberQueries, dms, recents, channelById, dmByChannel, query, navigate, openCreate, openJoin, cycleTheme, me])

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
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runRow(rows[cursor])
    }
  }

  let lastSection = ''
  const matchCount = rows.length

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-kd-overlay-soft backdrop-blur-[2px] flex justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        className="mt-[14vh] w-[640px] max-w-[92vw] h-fit max-h-[60vh] bg-kd-panel border border-kd-border rounded-[10px] shadow-kd-modal overflow-hidden flex flex-col"
        onKeyDown={onKeyDown}
      >
        <div className="px-3.5 py-2.5 bg-kd-panel-alt border-b border-kd-border flex items-center gap-2.5">
          <Icon.Search size={13} className="text-kd-text-mute shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            placeholder="канал, человек, сервер или действие…"
            className="flex-1 bg-transparent outline-none text-[13px] text-kd-text placeholder:text-kd-text-mute"
          />
          {query && (
            <span className="text-[10px] font-mono text-kd-text-mute shrink-0">
              {matchCount} {matchCount === 1 ? 'совпадение' : 'совпадений'}
            </span>
          )}
          <span className="text-[9px] font-mono text-kd-text-mute shrink-0 px-1.5 py-0.5 rounded border border-kd-border">esc</span>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-1.5">
          {rows.length === 0 && (
            <div className="px-4 py-6 text-center text-[11px] font-mono text-kd-text-mute">
              ничего не нашлось
            </div>
          )}
          {rows.map((row, i) => {
            const showSection = row.section !== lastSection
            lastSection = row.section
            const active = i === cursor
            return (
              <div key={row.key} data-row-index={i}>
                {showSection && (
                  <div className="px-3.5 pt-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-[0.05em] text-kd-text-mute select-none">
                    — {row.section}
                  </div>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => runRow(row)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3.5 py-1.5 text-left transition-colors',
                    active
                      ? 'bg-kd-panel-hi border-l-2 border-kd-accent pl-3'
                      : 'border-l-2 border-transparent',
                  ].join(' ')}
                >
                  <span className="w-[22px] h-[22px] rounded-kd bg-kd-panel-alt border border-kd-border flex items-center justify-center text-kd-text-soft shrink-0 overflow-hidden">
                    {row.icon}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[12px] text-kd-text">{row.label}</span>
                  {row.hint && (
                    <span className="text-[10px] font-mono text-kd-text-mute shrink-0 max-w-[220px] truncate">{row.hint}</span>
                  )}
                  {active && <span className="text-[9px] font-mono text-kd-text-mute shrink-0">⏎</span>}
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-3.5 py-1.5 bg-kd-panel-alt border-t border-kd-border flex gap-3 text-[9px] font-mono text-kd-text-mute select-none">
          <span>↑↓ навигация</span>
          <span>⏎ открыть</span>
          <span className="flex-1" />
          <span>palette · v2</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
