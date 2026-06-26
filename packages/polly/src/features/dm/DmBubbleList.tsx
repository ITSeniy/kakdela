// Лента личных сообщений «пузырями» (designs/final-dm.jsx → KD_DMBubble).
// Локальная альтернатива общему chat/MessageList: те же данные useMessages,
// те же обработчики из DmScreen — другой только рендер (свои справа на
// kd-accent, чужие слева на kd-panel, время под пузырём).

import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { Channel, CustomEmoji, DmSummary, MemberPublic, Message as IMessage } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { DayDivider } from '../../components/DayDivider.js'
import { Icon } from '../../components/Icon.js'
import { toast } from '../../components/toast/index.js'
import { openExternal } from '../../lib/host/shell.js'
import { pinMessage, unpinMessage } from '../chat/api.js'
import { AttachmentList } from '../chat/AttachmentView.js'
import { ContextMenu } from '../chat/ContextMenu.js'
import { ForwardedCard } from '../chat/ForwardedCard.js'
import { LinkPreviews } from '../chat/LinkPreviewCard.js'
import { useForwardUi } from '../chat/forwardStore.js'
import { Reactions } from '../chat/Reactions.js'
import { renderMarkdown, renderMarkdownInline } from '../chat/markdown.js'
import { useMessages } from '../chat/useMessages.js'
import type { PendingMessage } from '../chat/types.js'
import { useAllServerEmoji } from '../emoji/api.js'

interface DmBubbleListProps {
  channelId: string
  currentUserId: string | null
  memberMap: Map<string, MemberPublic>
  channelMap: Map<string, Channel>
  otherUser: DmSummary['otherUser'] | undefined
  pending: PendingMessage[]
  onMention?: (userId: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onRetry: (nonce: string) => void
  onReply: (message: IMessage) => void
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate()
  )
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('ru', {
    day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short',
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function scrollToMessage(id: string) {
  const el = document.querySelector(`[data-message-id="${id}"]`)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  setTimeout(() => {
    el.classList.add('kd-flash')
    el.addEventListener('animationend', () => el.classList.remove('kd-flash'), { once: true })
  }, 100)
}

function UnreadDivider() {
  return (
    <div className="px-4 py-1 flex items-center gap-2">
      <div className="flex-1 h-px bg-kd-warm" />
      <span className="text-[9px] text-kd-warm font-bold font-mono uppercase tracking-wider">
        непрочитанное
      </span>
      <div className="flex-1 h-px bg-kd-warm" />
    </div>
  )
}

interface DmBubbleProps {
  message: IMessage | PendingMessage
  member: MemberPublic | undefined
  isOwn: boolean
  currentUserId: string | null
  pendingStatus?: 'sending' | 'error'
  memberMap: ReadonlyMap<string, MemberPublic>
  channelMap: ReadonlyMap<string, Channel>
  emojiMap?: ReadonlyMap<string, CustomEmoji>
  onMention?: (userId: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onRetry?: () => void
  onReply: (message: IMessage) => void
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

function DmBubble({
  message, member, isOwn, currentUserId, pendingStatus,
  memberMap, channelMap, emojiMap, onMention,
  onEdit, onDelete, onRetry, onReply, onAddReaction, onRemoveReaction,
}: DmBubbleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const openForward = useForwardUi((s) => s.open)
  const queryClient = useQueryClient()

  // В DM закреплять может любой из двух участников.
  function handlePinToggle(pin: boolean) {
    const fn = pin ? pinMessage : unpinMessage
    fn(message.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['pins', message.channelId] }))
      .catch((err) => {
        toast.error(pin ? 'не удалось закрепить' : 'не удалось открепить')
        console.error('[pin] failed', err)
      })
  }

  useEffect(() => {
    if (editing) setDraft(message.content)
  }, [editing, message.content])

  const html = useMemo(
    () => renderMarkdown(message.content, { members: memberMap, channels: channelMap, emoji: emojiMap }),
    [message.content, memberMap, channelMap, emojiMap],
  )
  // Цитата ответа — инлайном: эмодзи и базовое форматирование, без блочной вёрстки.
  const replyHtml = useMemo(() => {
    const r = (message as IMessage).replyTo
    return r && !r.deleted
      ? renderMarkdownInline(r.content, { members: memberMap, channels: channelMap, emoji: emojiMap })
      : null
  }, [message, memberMap, channelMap, emojiMap])

  const messageReactions = 'reactions' in message ? (message.reactions ?? []) : []
  const msgReplyTo = 'replyTo' in message ? (message.replyTo ?? null) : null
  const msgAttachments = 'attachments' in message ? (message.attachments ?? []) : []

  const name = member?.displayName ?? 'неизвестно'
  const time = fmtTime(message.createdAt)
  const canDelete = isOwn
  const editDisabled = Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS
  const opacityCls = pendingStatus === 'sending' ? 'opacity-60' : ''

  function copyContent() {
    if (navigator.clipboard) void navigator.clipboard.writeText(message.content)
  }

  function copyLink() {
    if (!navigator.clipboard) return
    const url = `${window.location.origin}${window.location.pathname}#msg:${message.id}`
    void navigator.clipboard.writeText(url)
  }

  function openContextMenu(e: React.MouseEvent) {
    if (pendingStatus) return
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const contextMenuEl = menuPos && !pendingStatus ? (
    <ContextMenu
      x={menuPos.x}
      y={menuPos.y}
      isOwn={isOwn}
      canDelete={canDelete}
      editDisabled={editDisabled}
      hideStartThread
      pinned={(message as IMessage).pinned}
      canPin
      onReply={() => onReply(message as IMessage)}
      onForward={() => openForward(message as IMessage)}
      onPin={() => handlePinToggle(true)}
      onUnpin={() => handlePinToggle(false)}
      onEdit={() => setEditing(true)}
      onDelete={() => onDelete(message.id)}
      onCopyText={copyContent}
      onCopyLink={copyLink}
      onClose={() => setMenuPos(null)}
    />
  ) : null

  const forwardedEl = (message as IMessage).forwarded ? (
    <ForwardedCard fwd={(message as IMessage).forwarded!} memberMap={memberMap} channelMap={channelMap} emojiMap={emojiMap} />
  ) : null

  if (editing) {
    return (
      <div className="flex gap-2.5 px-5 py-1.5 items-start" data-message-id={message.id}>
        <div className="w-7 shrink-0" />
        <div className="flex-1 min-w-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setEditing(false); return }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const trimmed = draft.trim()
                if (trimmed && trimmed !== message.content) onEdit(message.id, trimmed)
                setEditing(false)
              }
            }}
            className="w-full bg-kd-panel border border-kd-accent rounded-kd p-2 text-[13px] text-kd-text outline-none resize-none font-sans"
            rows={Math.min(8, draft.split('\n').length + 1)}
            autoFocus
          />
          <div className="flex gap-3 mt-1.5 text-[10px] font-mono">
            <button type="button" onClick={() => setEditing(false)} className="text-kd-text-mute hover:text-kd-text-soft">
              отмена · esc
            </button>
            <button
              type="button"
              onClick={() => {
                const trimmed = draft.trim()
                if (trimmed && trimmed !== message.content) onEdit(message.id, trimmed)
                setEditing(false)
              }}
              className="text-kd-accent hover:text-kd-accent-deep font-bold"
            >
              сохранить ⏎
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group flex items-end gap-2.5 px-5 py-1 ${isOwn ? 'flex-row-reverse' : ''} ${opacityCls}`}
      data-message-id={message.id}
      onContextMenu={openContextMenu}
    >
      {contextMenuEl}
      {!isOwn ? (
        <button
          type="button"
          title="открыть профиль"
          onClick={() => onMention?.(message.authorId)}
          className="shrink-0 self-end mb-[18px]"
        >
          <Avatar name={name} avatarUrl={member?.avatarUrl ?? null} size={28} />
        </button>
      ) : (
        <div className="w-7 shrink-0" />
      )}
      <div className={`max-w-[70%] flex flex-col min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
        {(message as IMessage).pinned && (
          <div className="flex items-center gap-1 text-[10px] text-kd-warm font-mono mb-0.5 select-none">📌 закреплено</div>
        )}
        {msgReplyTo && (
          <button
            type="button"
            className="flex items-center gap-1.5 mb-0.5 px-1 max-w-full text-left text-[10px] text-kd-text-mute hover:opacity-80 transition-opacity min-w-0"
            onClick={() => scrollToMessage(msgReplyTo.id)}
          >
            {msgReplyTo.deleted ? (
              <span className="italic truncate">↳ оригинал удалён</span>
            ) : (
              <>
                <span className="font-mono font-bold text-kd-text-soft shrink-0">
                  ↳ {msgReplyTo.authorName}
                </span>
                <span className="kd-md opacity-80 truncate min-w-0" dangerouslySetInnerHTML={{ __html: replyHtml ?? '' }} />
              </>
            )}
          </button>
        )}
        {message.content && (
          <div
            className={[
              'px-3 py-[7px] rounded-kd text-[13px] leading-[1.45] break-words max-w-full min-w-0',
              isOwn
                ? 'bg-kd-accent text-white kd-on-accent'
                : 'bg-kd-panel border border-kd-border text-kd-text',
            ].join(' ')}
          >
            <div className="kd-md" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        )}
        {forwardedEl}
        <LinkPreviews previews={(message as IMessage).linkPreviews} />
        {msgAttachments.length > 0 && <AttachmentList attachments={msgAttachments} />}
        <div className="flex items-center gap-1.5 mt-[3px] px-1 text-[10px] font-mono text-kd-text-mute">
          <span>{time}</span>
          {message.editedAt && <span className="text-[9px]">(изм.)</span>}
          {pendingStatus === 'sending' && <span className="text-[9px]">отправляется…</span>}
          {pendingStatus === 'error' && onRetry && (
            <button type="button" onClick={onRetry} className="text-[9px] text-kd-danger hover:underline">
              ошибка · повторить?
            </button>
          )}
        </div>
        {!pendingStatus && (
          <Reactions
            messageId={message.id}
            reactions={messageReactions}
            currentUserId={currentUserId}
            memberMap={memberMap}
            onAdd={onAddReaction}
            onRemove={onRemoveReaction}
          />
        )}
      </div>
      {!pendingStatus && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-kd-text-mute self-center shrink-0">
          <button type="button" onClick={() => onReply(message as IMessage)} title="ответить" className="hover:text-kd-text p-1">
            <Icon.Reply size={13} />
          </button>
          {isOwn && !editDisabled && (
            <button type="button" onClick={() => setEditing(true)} title="изменить" className="hover:text-kd-text p-1">
              <Icon.Edit size={13} />
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => onDelete(message.id)} title="удалить" className="hover:text-kd-danger p-1">
              <Icon.Trash size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function DmBubbleList({
  channelId, currentUserId, memberMap, channelMap, otherUser, pending,
  onMention, onEdit, onDelete, onRetry, onReply, onAddReaction, onRemoveReaction,
}: DmBubbleListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(channelId)
  // В личке нет привязки к серверу — берём emoji со всех серверов пользователя,
  // чтобы `:name:` резолвился и в DM (и в баблах, и в цитатах ответов).
  const emojiMap = useAllServerEmoji()

  // Клики внутри markdown: @упоминание → профиль, внешняя ссылка → системный
  // браузер (тот же контракт, что у chat/MessageList).
  function handleContentClick(e: MouseEvent<HTMLDivElement>) {
    let node = e.target as HTMLElement | null
    while (node && node !== e.currentTarget) {
      if (node.dataset.spoiler) {
        // Спойлер: первый клик раскрывает, повторный — прячет (как в чате).
        e.preventDefault()
        node.classList.toggle('kd-spoiler-open')
        return
      }
      if (node.dataset.mention === 'user') {
        e.preventDefault()
        const id = node.dataset.id
        if (id && onMention) onMention(id)
        return
      }
      if (node.tagName === 'A') {
        const href = (node as HTMLAnchorElement).getAttribute('href')
        if (href && /^(https?:|mailto:|tel:|ftp:)/i.test(href)) {
          e.preventDefault()
          void openExternal(href)
          return
        }
      }
      node = node.parentElement
    }
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevScrollHeightRef = useRef<number | null>(null)
  const initialScrolledRef = useRef(false)

  const [snapshotReadAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(`kd:read:${channelId}`)
  })

  const messages = useMemo<IMessage[]>(() => {
    if (!data) return []
    const result: IMessage[] = []
    for (let i = data.pages.length - 1; i >= 0; i -= 1) {
      const page = data.pages[i]
      if (page) result.push(...page.messages)
    }
    return result
  }, [data])

  // Track at-bottom + update last-read marker
  useEffect(() => {
    const node = bottomRef.current
    const container = containerRef.current
    if (!node || !container) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      isAtBottomRef.current = entry.isIntersecting
      if (entry.isIntersecting) {
        const latest = messages[messages.length - 1]
        if (latest) {
          window.localStorage.setItem(`kd:read:${channelId}`, latest.createdAt)
        }
      }
    }, { root: container, threshold: 0.1 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [channelId, messages])

  // Fetch older when top sentinel hits
  useEffect(() => {
    const node = topRef.current
    const container = containerRef.current
    if (!node || !container) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      if (!hasNextPage || isFetchingNextPage) return
      prevScrollHeightRef.current = container.scrollHeight
      void fetchNextPage()
    }, { root: container, rootMargin: '200px 0px 0px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [channelId, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Preserve visual position after older messages prepend
  useEffect(() => {
    if (prevScrollHeightRef.current === null) return
    const container = containerRef.current
    if (!container) return
    const delta = container.scrollHeight - prevScrollHeightRef.current
    container.scrollTop = delta
    prevScrollHeightRef.current = null
  }, [messages.length])

  // Auto-scroll on new content
  const lastId = messages[messages.length - 1]?.id ?? null
  const pendingCount = pending.length

  useEffect(() => {
    if (!initialScrolledRef.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
      initialScrolledRef.current = true
      return
    }
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lastId, pendingCount, messages.length])

  useEffect(() => {
    initialScrolledRef.current = false
    isAtBottomRef.current = true
  }, [channelId])

  // Deep-link `#msg:<id>` (переход из Inbox/поиска): когда сообщение
  // появляется в DOM — скроллим к нему и подсвечиваем kd-flash.
  useEffect(() => {
    function jumpToHashTarget() {
      const hash = window.location.hash
      const m = /^#msg:([0-9a-f-]+)$/i.exec(hash)
      if (!m) return false
      const el = document.querySelector(`[data-message-id="${m[1]}"]`)
      if (!el) return false
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setTimeout(() => {
        el.classList.add('kd-flash')
        el.addEventListener('animationend', () => el.classList.remove('kd-flash'), { once: true })
      }, 100)
      return true
    }
    if (messages.length === 0) return undefined
    jumpToHashTarget()
    const handler = () => { jumpToHashTarget() }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [channelId, messages.length])

  const firstUnreadIndex = useMemo(() => {
    if (!snapshotReadAt) return -1
    return messages.findIndex((m) =>
      m.createdAt > snapshotReadAt && m.authorId !== currentUserId,
    )
  }, [messages, snapshotReadAt, currentUserId])

  type ItemRow =
    | { type: 'day'; label: string }
    | { type: 'unread' }
    | {
        type: 'msg'
        msg: IMessage | PendingMessage
        isPending: boolean
      }

  const rows: ItemRow[] = []
  let prevForMsg: IMessage | PendingMessage | null = null
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i]!
    if (prevForMsg === null || !sameDay(prevForMsg.createdAt, m.createdAt)) {
      rows.push({ type: 'day', label: formatDay(m.createdAt) })
    }
    if (i === firstUnreadIndex) rows.push({ type: 'unread' })
    rows.push({ type: 'msg', msg: m, isPending: false })
    prevForMsg = m
  }
  for (let i = 0; i < pending.length; i += 1) {
    const p = pending[i]!
    rows.push({ type: 'msg', msg: p, isPending: true })
    prevForMsg = p
  }

  // Карточка начала переписки (designs/final-dm.jsx): показываем, когда вся
  // история догружена (или переписка пустая).
  const historyStartReached = data !== undefined && !hasNextPage

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto min-h-0 py-2"
      onClick={handleContentClick}
    >
      <div ref={topRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center py-2 text-[10px] text-kd-text-mute font-mono">
          загружаем…
        </div>
      )}
      {historyStartReached && otherUser && (
        <div className="mx-5 my-2.5 p-3.5 bg-kd-panel-alt border border-kd-border rounded-kd flex items-center gap-3.5">
          <Avatar name={otherUser.displayName} avatarUrl={otherUser.avatarUrl} size={48} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-kd-text">
              это начало вашей переписки с {otherUser.displayName}
            </div>
            <div className="text-[11px] text-kd-text-soft mt-0.5">
              личные сообщения видны только вам двоим.
            </div>
          </div>
        </div>
      )}
      {rows.map((row, idx) => {
        if (row.type === 'day') return <DayDivider key={`day-${idx}`} label={row.label} />
        if (row.type === 'unread') return <UnreadDivider key={`unread-${idx}`} />
        const m = row.msg
        const key = row.isPending ? (m as PendingMessage)._nonce : m.id
        return (
          <DmBubble
            key={key}
            message={m}
            member={memberMap.get(m.authorId)}
            isOwn={m.authorId === currentUserId}
            currentUserId={currentUserId}
            pendingStatus={row.isPending ? (m as PendingMessage)._pending : undefined}
            memberMap={memberMap}
            channelMap={channelMap}
            emojiMap={emojiMap}
            onMention={onMention}
            onEdit={onEdit}
            onDelete={onDelete}
            onRetry={row.isPending ? () => onRetry((m as PendingMessage)._nonce) : undefined}
            onReply={onReply}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        )
      })}
      <div ref={bottomRef} className="h-1" />
    </div>
  )
}
