import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { CustomEmoji, InboxMention } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { EmptyState } from '../../components/EmptyState.js'
import { Icon } from '../../components/Icon.js'
import { SectionLabel } from '../../components/SectionLabel.js'
import { toast } from '../../components/toast/index.js'
import { wsClient } from '../../lib/ws.js'
import { UserBar } from '../channels/UserBar.js'
import { useAllServerEmoji } from '../emoji/api.js'
import { listInboxMentions, markMentionsRead } from './api.js'

// Короткая задержка — мгновение, чтобы скролл-пролёт не «съедал» упоминания,
// но не ощутимая пауза. Раньше было 5с — оттуда «долго помечается прочитанным».
const READ_DEBOUNCE_MS = 800

function fmtWhen(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'только что'
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} мин`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}ч`
  const days = Math.round(ms / 86_400_000)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days}дн`
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' })
}

function dayBucket(iso: string): 'today' | 'yesterday' | 'older' {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 86_400_000) return 'today'
  if (ms < 86_400_000 * 2) return 'yesterday'
  return 'older'
}

const BUCKET_LABEL: Record<'today' | 'yesterday' | 'older', string> = {
  today: '— сегодня',
  yesterday: '— вчера',
  older: '— раньше',
}

const MENTION_LABEL: Record<InboxMention['mentionType'], string> = {
  user:     'упоминание',
  everyone: 'для всех',
  here:     'для онлайн',
}

/** Резолв custom emoji `:name:` → <img>, остальное — текстом. */
function renderEmoji(text: string, emojiMap: ReadonlyMap<string, CustomEmoji>): ReactNode {
  const parts = text.split(/(:[a-z0-9_]+:)/g)
  if (parts.length === 1) return text
  return parts.map((p, i) => {
    const m = /^:([a-z0-9_]+):$/.exec(p)
    const name = m?.[1]
    const emoji = name ? emojiMap.get(name) : undefined
    return emoji
      ? <img key={i} src={emoji.imageUrl} alt={p} className="kd-emoji" draggable={false} />
      : <Fragment key={i}>{p}</Fragment>
  })
}

/** Подсветка @ника + custom emoji внутри сниппета (designs/final-inbox.jsx). */
function renderSnippet(content: string, emojiMap: ReadonlyMap<string, CustomEmoji>): ReactNode {
  const parts = content.split(/(@[0-9A-Za-zА-Яа-яЁё._-]+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-kd-warm font-semibold">{part}</span>
      : <Fragment key={i}>{renderEmoji(part, emojiMap)}</Fragment>,
  )
}

interface SidebarProps {
  unreadTotal: number
  activeFilter: 'all' | 'unread'
  onSelectFilter: (f: 'all' | 'unread') => void
}

function Sidebar({ unreadTotal, activeFilter, onSelectFilter }: SidebarProps) {
  function Tab({ id, label, count }: { id: 'all' | 'unread'; label: string; count?: number }) {
    const active = id === activeFilter
    return (
      <button
        type="button"
        onClick={() => onSelectFilter(id)}
        className={[
          'w-full flex items-center gap-1.5 text-[12px] py-[7px] pr-3.5 text-left border-l-2 transition-colors',
          active
            ? 'bg-kd-panel-hi text-kd-text font-semibold border-kd-accent pl-3'
            : 'text-kd-text-soft hover:text-kd-text border-transparent pl-3.5',
        ].join(' ')}
      >
        <span className="flex-1">{label}</span>
        {count !== undefined && (
          <span className={`text-[10px] font-mono font-bold ${count > 0 ? 'text-kd-warm' : 'text-kd-text-mute'}`}>
            {count}
          </span>
        )}
      </button>
    )
  }
  return (
    <aside className="bg-kd-panel border-r border-kd-border flex flex-col min-h-0">
      <div className="px-3.5 py-2.5 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="text-[13px] font-bold text-kd-text">входящие</div>
        <div className="text-[10px] text-kd-text-mute mt-0.5 font-mono">
          {unreadTotal} непрочит. упоминаний
        </div>
      </div>
      <div className="px-1.5 shrink-0">
        <SectionLabel>— фильтры</SectionLabel>
      </div>
      <div className="shrink-0 pb-1">
        <Tab id="all" label="всё" />
        <Tab id="unread" label="непрочитанные" count={unreadTotal} />
      </div>
      <div className="flex-1" />
      <UserBar />
    </aside>
  )
}

interface RowProps {
  mention: InboxMention
  emojiMap: ReadonlyMap<string, CustomEmoji>
  onClick: () => void
  onMarkRead: () => void
  observeRead: (el: HTMLElement | null, messageId: string) => void
}

function Row({ mention, emojiMap, onClick, onMarkRead, observeRead }: RowProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    observeRead(ref.current, mention.messageId)
    return () => observeRead(null, mention.messageId)
  }, [mention.messageId, observeRead])

  const isUnread = mention.readAt === null
  const where = mention.serverName
    ? `${mention.serverName} · #${mention.channelName}`
    : mention.channelKind === 'dm'
      ? `личный чат с ${mention.authorName}`
      : `#${mention.channelName}`

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      data-message-id={mention.messageId}
      className={[
        'w-full flex gap-3 px-[18px] py-3 text-left border-b border-kd-border-soft cursor-pointer transition-colors',
        isUnread ? 'bg-kd-warm-bg' : 'hover:bg-kd-panel-alt/40',
      ].join(' ')}
    >
      <div
        className={`w-[3px] self-stretch rounded shrink-0 ${isUnread ? 'bg-kd-warm' : 'bg-transparent'}`}
      />
      <Avatar name={mention.authorName} avatarUrl={mention.authorAvatarUrl} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {mention.mentionType === 'user' ? (
            <Badge variant="mention" className="uppercase tracking-[0.05em] px-1.5">
              {MENTION_LABEL[mention.mentionType]}
            </Badge>
          ) : (
            <span className="text-[9px] font-bold px-1.5 py-px rounded bg-kd-accent-bg text-kd-accent-deep font-mono uppercase tracking-[0.05em] shrink-0">
              {MENTION_LABEL[mention.mentionType]}
            </span>
          )}
          <span className="text-[11px] text-kd-text-soft font-mono truncate flex-1">{where}</span>
          <span className="text-[10px] text-kd-text-mute font-mono shrink-0">{fmtWhen(mention.createdAt)}</span>
        </div>
        <div className="text-[13px] text-kd-text leading-normal break-words">
          <span className="font-bold">{mention.authorName}:</span>{' '}
          <span className="kd-md text-kd-text-soft">{renderSnippet(mention.content, emojiMap)}</span>
        </div>
      </div>
      {isUnread && (
        <button
          type="button"
          title="отметить прочитанным"
          onClick={(e) => {
            e.stopPropagation()
            onMarkRead()
          }}
          className="self-start shrink-0 text-[10px] font-mono text-kd-text-mute hover:text-kd-text px-1 transition-colors"
        >
          ✓ прочитано
        </button>
      )}
    </div>
  )
}

export function InboxScreen() {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const emojiMap = useAllServerEmoji()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const { data, refetch } = useQuery({
    queryKey: ['inbox-mentions', filter],
    queryFn: () => listInboxMentions(filter === 'unread' ? { unreadOnly: true } : {}),
    staleTime: 10_000,
  })

  const mentions = data?.mentions ?? []
  const unreadTotal = data?.unreadTotal ?? 0

  // Refetch и тут, и глобальный badge — оба слушают 'mention'.
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t === 'mention') {
        void refetch()
        void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
      }
    })
  }, [refetch, queryClient])

  // ── auto-mark-read after 5s in viewport (IntersectionObserver).
  const observerRef = useRef<IntersectionObserver | null>(null)
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const elementsRef = useRef(new Map<HTMLElement, string>())
  const pendingRef = useRef(new Set<string>())

  function invalidateRead() {
    void queryClient.invalidateQueries({ queryKey: ['inbox-mentions'] })
    void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
    void queryClient.invalidateQueries({ queryKey: ['inbox-unread-by-server'] })
  }

  function flushRead() {
    const ids = Array.from(pendingRef.current)
    if (ids.length === 0) return
    pendingRef.current.clear()
    markMentionsRead(ids)
      .then(invalidateRead)
      .catch((err) => {
        // Не потеряли — вернём в очередь, чтобы следующий проход добил.
        for (const id of ids) pendingRef.current.add(id)
        console.error('[inbox] mark read failed', err)
      })
  }

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        const messageId = elementsRef.current.get(el)
        if (!messageId) continue
        if (entry.isIntersecting) {
          if (!timersRef.current.has(messageId)) {
            const handle = setTimeout(() => {
              pendingRef.current.add(messageId)
              timersRef.current.delete(messageId)
              flushRead()
            }, READ_DEBOUNCE_MS)
            timersRef.current.set(messageId, handle)
          }
        } else {
          const t = timersRef.current.get(messageId)
          if (t) {
            clearTimeout(t)
            timersRef.current.delete(messageId)
          }
        }
      }
    }, { threshold: 0.6 })
    return () => {
      observerRef.current?.disconnect()
      for (const t of timersRef.current.values()) clearTimeout(t)
      timersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function observeRead(el: HTMLElement | null, messageId: string) {
    const observer = observerRef.current
    if (!observer) return
    if (el) {
      elementsRef.current.set(el, messageId)
      observer.observe(el)
    } else {
      for (const [k, v] of elementsRef.current) {
        if (v === messageId) {
          observer.unobserve(k)
          elementsRef.current.delete(k)
        }
      }
      const t = timersRef.current.get(messageId)
      if (t) {
        clearTimeout(t)
        timersRef.current.delete(messageId)
      }
    }
  }

  function markOneRead(messageId: string) {
    markMentionsRead([messageId])
      .then(invalidateRead)
      .catch((err) => {
        toast.error('не удалось отметить прочитанным')
        console.error('[inbox] mark one read failed', err)
      })
  }

  function openMention(m: InboxMention) {
    // Сразу пометить прочитанным при клике — мгновенный UX, не ждём 5 секунд.
    markOneRead(m.messageId)
    const path = m.channelKind === 'dm'
      ? `/dm/${m.channelId}`
      : m.serverId
        ? `/servers/${m.serverId}/channels/${m.channelId}`
        : null
    if (!path) return
    navigate(`${path}#msg:${m.messageId}`)
  }

  const buckets = useMemo(() => {
    const groups = new Map<'today' | 'yesterday' | 'older', InboxMention[]>()
    for (const m of mentions) {
      const b = dayBucket(m.createdAt)
      const list = groups.get(b) ?? []
      list.push(m)
      groups.set(b, list)
    }
    return groups
  }, [mentions])

  async function markAllRead() {
    const ids = mentions.filter((m) => m.readAt === null).map((m) => m.messageId)
    if (ids.length === 0) return
    try {
      await markMentionsRead(ids)
      invalidateRead()
    } catch (err) {
      toast.error('не удалось отметить всё прочитанным')
      console.error('[inbox] mark all read failed', err)
    }
  }

  return (
    <>
      <Sidebar unreadTotal={unreadTotal} activeFilter={filter} onSelectFilter={setFilter} />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-kd-bg">
        <div className="px-[18px] py-2 border-b border-kd-border bg-kd-panel-alt flex items-center gap-2.5 shrink-0">
          <Icon.Inbox size={14} className="text-kd-warm shrink-0" />
          <span className="text-[13px] font-bold text-kd-text">входящие</span>
          {unreadTotal > 0 && <Badge variant="mention">{unreadTotal}</Badge>}
          <div className="w-px h-3.5 bg-kd-border" />
          <span className="text-[11px] text-kd-text-soft">всё, что просит твоего внимания</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadTotal === 0}
            className="px-2.5 py-1 rounded border border-kd-border text-[11px] font-mono text-kd-text hover:bg-kd-panel transition-colors disabled:opacity-50"
          >
            отметить всё ✓
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {mentions.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                glyph="@"
                title="тебя никто не звал — и это нормально"
                body={'упоминания и ответы соберём сюда —\nможно спокойно жить, ничего не теряя.'}
              />
            </div>
          )}
          {(['today', 'yesterday', 'older'] as const).map((bucket) => {
            const list = buckets.get(bucket)
            if (!list || list.length === 0) return null
            return (
              <div key={bucket}>
                <div className="px-[18px] py-1.5 text-[10px] font-bold text-kd-text-mute font-mono uppercase tracking-[0.05em] bg-kd-bg-deep border-b border-kd-border-soft">
                  {BUCKET_LABEL[bucket]}
                </div>
                {list.map((m) => (
                  <Row
                    key={m.messageId}
                    mention={m}
                    emojiMap={emojiMap}
                    onClick={() => openMention(m)}
                    onMarkRead={() => markOneRead(m.messageId)}
                    observeRead={observeRead}
                  />
                ))}
              </div>
            )
          })}
        </div>
        <div className="px-[18px] py-2 border-t border-kd-border bg-kd-panel-alt text-[10px] text-kd-text-mute font-mono shrink-0 flex items-center gap-4">
          <span>клик — открыть в канале</span>
          <span>✓ — отметить прочитанным</span>
          <div className="flex-1" />
          <span>увидел — пометится прочитанным</span>
        </div>
      </div>
    </>
  )
}
