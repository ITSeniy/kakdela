// Командная палитра ⌘K. Источник дизайна: designs/final-extras.jsx (FinalPalette).
// Данные: серверы/каналы из существующих queries (servers/api), действия —
// существующие сторы и навигация. Никаких новых эндпоинтов.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { useLocation } from 'wouter'
import { create } from 'zustand'

import { getServerDetail, listServers } from '../features/servers/api.js'
import { useServerCreateJoinUi } from '../features/servers/store.js'
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
  run(): void
}

export function CommandPalette() {
  const open = useCommandPalette((s) => s.open)
  const setOpen = useCommandPalette((s) => s.setOpen)
  const [, navigate] = useLocation()
  const openCreate = useServerCreateJoinUi((s) => s.openCreate)
  const openJoin = useServerCreateJoinUi((s) => s.openJoin)
  const cycleTheme = useThemeStore((s) => s.cycleMode)

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

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      // Фокус после маунта портала.
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const rows = useMemo<PaletteRow[]>(() => {
    const all: PaletteRow[] = []
    const q = query.trim().toLowerCase()
    const matches = (s: string) => q === '' || s.toLowerCase().includes(q)

    for (const s of servers) {
      if (matches(s.name)) {
        all.push({
          key: `srv:${s.id}`,
          section: 'серверы',
          icon: <span className="text-[10px] font-bold">{s.name.slice(0, 1).toUpperCase()}</span>,
          label: s.name,
          hint: 'сервер',
          run: () => navigate(`/servers/${s.id}`),
        })
      }
    }
    for (const dq of detailQueries) {
      const detail = dq.data
      if (!detail) continue
      for (const c of detail.channels) {
        if (c.kind === 'dm') continue
        if (!matches(c.name)) continue
        all.push({
          key: `ch:${c.id}`,
          section: 'каналы',
          icon: c.kind === 'voice' ? <Icon.Speaker size={11} /> : <Icon.Hash size={11} />,
          label: c.name,
          hint: detail.server.name,
          run: () => navigate(`/servers/${c.serverId}/channels/${c.id}`),
        })
      }
    }

    const actions: PaletteRow[] = [
      { key: 'a:dm', section: 'действия', icon: <span className="text-[9px] font-bold font-mono">кд</span>, label: 'личные сообщения', run: () => navigate('/dm') },
      { key: 'a:inbox', section: 'действия', icon: <Icon.Inbox size={11} />, label: 'входящие', run: () => navigate('/inbox') },
      { key: 'a:search', section: 'действия', icon: <Icon.Search size={11} />, label: 'поиск по сообщениям', run: () => navigate('/search') },
      { key: 'a:create', section: 'действия', icon: <Icon.Plus size={11} />, label: 'создать сервер', run: openCreate },
      { key: 'a:join', section: 'действия', icon: <span className="text-[11px] font-mono">↪</span>, label: 'принять инвайт', run: openJoin },
      { key: 'a:theme', section: 'действия', icon: <Icon.Sparkle size={11} />, label: 'переключить тему', hint: 'light/dark/system', run: cycleTheme },
    ]
    for (const a of actions) if (matches(a.label)) all.push(a)

    return all.slice(0, 30)
  }, [servers, detailQueries, query, navigate, openCreate, openJoin, cycleTheme])

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, rows.length - 1)))
  }, [rows.length])

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
            placeholder="канал, сервер или действие…"
            className="flex-1 bg-transparent outline-none text-[13px] text-kd-text placeholder:text-kd-text-mute"
          />
          <span className="text-[9px] font-mono text-kd-text-mute shrink-0">esc · закрыть</span>
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
              <div key={row.key}>
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
                  <span className="w-[22px] h-[22px] rounded-kd bg-kd-panel-alt border border-kd-border flex items-center justify-center text-kd-text-soft shrink-0">
                    {row.icon}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[12px] text-kd-text">{row.label}</span>
                  {row.hint && (
                    <span className="text-[10px] font-mono text-kd-text-mute shrink-0">{row.hint}</span>
                  )}
                  {active && <span className="text-[9px] font-mono text-kd-text-mute shrink-0">⏎</span>}
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-3.5 py-1.5 bg-kd-panel-alt border-t border-kd-border flex gap-3 text-[9px] font-mono text-kd-text-mute select-none">
          <span>↑↓ · выбор</span>
          <span>⏎ · перейти</span>
          <span className="flex-1" />
          <span>ctrl+k · палитра</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
