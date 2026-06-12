import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

import type { Channel, CustomEmoji, MemberPublic, Message as IMessage } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { Icon } from '../../components/Icon.js'
import { useProfileUi } from '../profile/store.js'
import { useThreadUi } from '../threads/store.js'
import { AttachmentList } from './AttachmentView.js'
import { useChatDisplaySettings } from './displaySettings.js'
import { ContextMenu } from './ContextMenu.js'
import { Reactions } from './Reactions.js'
import { renderMarkdown } from './markdown.js'
import type { PendingMessage } from './types.js'

const LazyEmojiPicker = lazy(() => import('./EmojiPicker.js'))

interface MessageProps {
  message: IMessage | PendingMessage
  prev: IMessage | PendingMessage | null
  member: MemberPublic | undefined
  isOwn: boolean
  currentUserId: string | null
  pendingStatus?: 'sending' | 'error'
  memberMap: ReadonlyMap<string, MemberPublic>
  channelMap: ReadonlyMap<string, Channel>
  emojiMap?: ReadonlyMap<string, CustomEmoji>
  /** В DM и внутри самого треда «начать тред» прятать. */
  threadsAllowed?: boolean
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onRetry?: () => void
  onReply: (message: IMessage) => void
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000
}

const ROLE_TAG: Record<string, string> = {
  owner: 'хоз',
  admin: 'адм',
}

const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function Actions({
  isOwn, canDelete, editDisabled, pendingStatus, onReply, onCopy, onEdit, onDelete, onPickReaction,
}: {
  isOwn: boolean
  canDelete: boolean
  editDisabled: boolean
  pendingStatus: 'sending' | 'error' | undefined
  onReply: () => void
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
  onPickReaction: (emoji: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [pickerOpen])

  if (pendingStatus) return null
  return (
    <div className={`${pickerOpen ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity flex items-center gap-1 text-kd-text-mute self-start mt-0.5 shrink-0`}>
      <div className="relative" ref={pickerContainerRef}>
        <button type="button" onClick={() => setPickerOpen((o) => !o)} title="добавить реакцию" className="hover:text-kd-text p-1 block">
          <Icon.Smile size={13} />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full right-0 mb-1 z-50 shadow-lg">
            <Suspense fallback={<div className="p-3 text-[11px] text-kd-text-mute bg-kd-panel rounded-kd border border-kd-border">…</div>}>
              <LazyEmojiPicker
                onSelect={(emoji) => {
                  onPickReaction(emoji)
                  setPickerOpen(false)
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
      <button type="button" onClick={onReply} title="ответить" className="hover:text-kd-text p-1">
        <Icon.Reply size={13} />
      </button>
      <button type="button" onClick={onCopy} title="копировать" className="hover:text-kd-text p-1">
        <CopyIcon />
      </button>
      {isOwn && !editDisabled && (
        <button type="button" onClick={onEdit} title="изменить" className="hover:text-kd-text p-1">
          <Icon.Edit size={13} />
        </button>
      )}
      {canDelete && (
        <button type="button" onClick={onDelete} title="удалить" className="hover:text-kd-danger p-1">
          <Icon.Trash size={13} />
        </button>
      )}
    </div>
  )
}

function scrollToMessage(id: string) {
  const el = document.querySelector(`[data-message-id="${id}"]`)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  setTimeout(() => {
    el.classList.add('kd-flash')
    el.addEventListener('animationend', () => el.classList.remove('kd-flash'), { once: true })
  }, 100)
}

export function Message({
  message, prev, member, isOwn, currentUserId, pendingStatus,
  memberMap, channelMap, emojiMap, threadsAllowed = true,
  onEdit, onDelete, onRetry, onReply, onAddReaction, onRemoveReaction,
}: MessageProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const openProfile = useProfileUi((s) => s.open)
  const openThread = useThreadUi((s) => s.open)
  const startCreateThread = useThreadUi((s) => s.startCreate)

  useEffect(() => {
    if (editing) setDraft(message.content)
  }, [editing, message.content])

  const html = useMemo(
    () => renderMarkdown(message.content, { members: memberMap, channels: channelMap, emoji: emojiMap }),
    [message.content, memberMap, channelMap, emojiMap],
  )

  const messageReactions = 'reactions' in message ? (message.reactions ?? []) : []
  const msgReplyTo = 'replyTo' in message ? (message.replyTo ?? null) : null
  const msgAttachments = 'attachments' in message ? (message.attachments ?? []) : []
  const msgThread = 'thread' in message ? (message.thread ?? null) : null

  const previewForThread =
    message.content.length > 60 ? message.content.slice(0, 57) + '…' : message.content

  function handleStartThread() {
    startCreateThread(message.channelId, message.id, previewForThread)
  }
  function handleOpenThread() {
    if (msgThread) openThread(msgThread.channelId, message.channelId)
  }

  const currentUserRole = currentUserId ? memberMap.get(currentUserId)?.role : undefined
  const canDelete = isOwn || currentUserRole === 'admin' || currentUserRole === 'owner'
  const editDisabled = Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS

  // Плотность как в Discord. compact — всё в одну строку (включая реплаи:
  // цитата строкой выше). cozy — первое сообщение группы с аватаркой,
  // продолжения (тот же автор, < 5 минут, не реплай) — без аватарки и имени,
  // время появляется на ховере в левой колонке.
  const density = useChatDisplaySettings((s) => s.density)
  const compact = density === 'compact'
  const grouped =
    prev !== null &&
    prev.authorId === message.authorId &&
    minutesBetween(message.createdAt, prev.createdAt) < 5 &&
    !message.replyToId

  const name = member?.displayName ?? 'неизвестно'
  const role = member ? ROLE_TAG[member.role] ?? null : null
  const time = fmtTime(message.createdAt)
  const opacityCls = pendingStatus === 'sending' ? 'opacity-60' : ''

  function copyContent() {
    if (navigator.clipboard) void navigator.clipboard.writeText(message.content)
  }

  function copyLink() {
    if (!navigator.clipboard) return
    // Используем текущий path — он уже включает /servers/.../channels/...
    // или /dm/..., плюс hash #msg:<id> для jump-to-message (тот же формат,
    // что использует InboxScreen).
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
      hideStartThread={!threadsAllowed || msgThread !== null}
      onReply={() => onReply(message as IMessage)}
      onStartThread={handleStartThread}
      onEdit={() => setEditing(true)}
      onDelete={() => onDelete(message.id)}
      onCopyText={copyContent}
      onCopyLink={copyLink}
      onClose={() => setMenuPos(null)}
    />
  ) : null

  function ThreadBadge() {
    if (!msgThread) return null
    return (
      <button
        type="button"
        onClick={handleOpenThread}
        className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-kd-border bg-kd-panel-alt hover:bg-kd-panel-hi text-[11px] text-kd-text-soft transition-colors"
        title={msgThread.archivedAt ? 'архивный тред' : 'открыть тред'}
      >
        <span className="text-kd-accent">↳</span>
        <span className="font-semibold text-kd-text">{msgThread.name}</span>
        <span className="font-mono text-[10px] text-kd-text-mute">
          {msgThread.messageCount} {msgThread.messageCount === 1 ? 'сообщ.' : 'сообщ.'}
        </span>
        {msgThread.archivedAt && (
          <span className="font-mono text-[9px] text-kd-text-mute uppercase">архив</span>
        )}
      </button>
    )
  }

  // Цитата реплая. indent выравнивает её с колонкой текста:
  // cozy — аватар 32px + gap 10px, compact — время 36px + gap 8px.
  function ReplyQuote({ indent }: { indent: string }) {
    if (!msgReplyTo) return null
    return (
      <button
        type="button"
        className={`flex items-center gap-1.5 mb-0.5 ${indent} w-full text-left text-[10px] text-kd-text-mute hover:opacity-80 transition-opacity min-w-0`}
        onClick={() => scrollToMessage(msgReplyTo.id)}
      >
        <span
          aria-hidden
          className="shrink-0 w-2.5 h-1.5 border-t border-l border-kd-text-mute rounded-tl-[3px]"
        />
        {msgReplyTo.deleted ? (
          <span className="italic truncate">↳ оригинал удалён</span>
        ) : (
          <>
            <span className="font-mono font-bold text-kd-text-soft shrink-0">
              ↳ {msgReplyTo.authorName}
            </span>
            <span className="opacity-80 truncate min-w-0">{msgReplyTo.content}</span>
          </>
        )}
      </button>
    )
  }

  const reactionsEl = !pendingStatus && messageReactions.length > 0 ? (
    <Reactions
      messageId={message.id}
      reactions={messageReactions}
      currentUserId={currentUserId}
      memberMap={memberMap}
      onAdd={onAddReaction}
      onRemove={onRemoveReaction}
    />
  ) : null

  const actionsEl = (
    <Actions
      isOwn={isOwn}
      canDelete={canDelete}
      editDisabled={editDisabled}
      pendingStatus={pendingStatus}
      onReply={() => onReply(message as IMessage)}
      onCopy={copyContent}
      onEdit={() => setEditing(true)}
      onDelete={() => onDelete(message.id)}
      onPickReaction={(emoji) => onAddReaction(message.id, emoji)}
    />
  )

  if (editing) {
    return (
      <div className="flex gap-2.5 px-4 py-1.5 items-start" data-message-id={message.id}>
        <div className="w-8 shrink-0" />
        <div className="flex-1 min-w-0">
          <textarea
            ref={editRef}
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

  if (compact) {
    return (
      <div
        className={`group px-4 py-[2px] hover:bg-kd-panel-alt/40 ${opacityCls}`}
        data-message-id={message.id}
        onContextMenu={openContextMenu}
      >
        {contextMenuEl}
        <ReplyQuote indent="pl-11" />
        <div className="flex gap-2 items-baseline">
          <span className="text-[10px] text-kd-text-mute font-mono w-9 shrink-0 text-right">
            {time}
          </span>
          <button
            type="button"
            onClick={() => openProfile(message.authorId)}
            className="text-[13px] font-bold text-kd-text hover:underline shrink-0"
          >
            {name}
          </button>
          <div className="flex-1 min-w-0">
            {message.content && (
              <span className="text-[13px] text-kd-text leading-snug break-words">
                <span className="kd-md inline" dangerouslySetInnerHTML={{ __html: html }} />
                {message.editedAt && (
                  <span className="text-[9px] text-kd-text-mute font-mono ml-1">(изм.)</span>
                )}
              </span>
            )}
            {pendingStatus === 'error' && onRetry && (
              <button type="button" onClick={onRetry} className="text-[9px] text-kd-danger font-mono hover:underline ml-1">
                ошибка · повторить?
              </button>
            )}
          </div>
          {actionsEl}
        </div>
        {(msgAttachments.length > 0 || msgThread !== null || reactionsEl !== null) && (
          <div className="pl-11">
            {msgAttachments.length > 0 && <AttachmentList attachments={msgAttachments} />}
            <ThreadBadge />
            {reactionsEl}
          </div>
        )}
      </div>
    )
  }

  if (grouped) {
    return (
      <div
        className={`group flex gap-2.5 px-4 py-[2px] items-start hover:bg-kd-panel-alt/40 ${opacityCls}`}
        data-message-id={message.id}
        onContextMenu={openContextMenu}
      >
        {contextMenuEl}
        <span className="w-8 shrink-0 text-right text-[9px] text-kd-text-mute font-mono opacity-0 group-hover:opacity-100 transition-opacity pt-1 select-none">
          {time}
        </span>
        <div className="flex-1 min-w-0">
          {message.content && (
            <div className="text-[13px] text-kd-text leading-relaxed break-words min-w-0">
              <div className="kd-md" dangerouslySetInnerHTML={{ __html: html }} />
              {message.editedAt && (
                <span className="text-[9px] text-kd-text-mute font-mono ml-1">(изм.)</span>
              )}
            </div>
          )}
          {pendingStatus === 'error' && onRetry && (
            <button type="button" onClick={onRetry} className="text-[9px] text-kd-danger font-mono hover:underline">
              ошибка · повторить?
            </button>
          )}
          {msgAttachments.length > 0 && <AttachmentList attachments={msgAttachments} />}
          <ThreadBadge />
          {reactionsEl}
        </div>
        {actionsEl}
      </div>
    )
  }

  return (
    <div
      className={`group px-4 py-1 hover:bg-kd-panel-alt/40 ${opacityCls}`}
      data-message-id={message.id}
      onContextMenu={openContextMenu}
    >
      {contextMenuEl}
      <ReplyQuote indent="pl-[42px]" />
      <div className="flex gap-2.5 items-start">
        <button
          type="button"
          onClick={() => openProfile(message.authorId)}
          title="открыть профиль"
          className="shrink-0"
        >
          <Avatar name={name} avatarUrl={member?.avatarUrl ?? null} size={32} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => openProfile(message.authorId)}
              className="text-[13px] font-bold text-kd-text hover:underline"
            >
              {name}
            </button>
            {role && <Badge variant="role">{role}</Badge>}
            <span className="text-[10px] text-kd-text-mute font-mono">{time}</span>
            {pendingStatus === 'sending' && (
              <span className="text-[9px] text-kd-text-mute font-mono">отправляется…</span>
            )}
            {pendingStatus === 'error' && onRetry && (
              <button type="button" onClick={onRetry} className="text-[9px] text-kd-danger font-mono hover:underline">
                ошибка · повторить?
              </button>
            )}
          </div>
          {message.content && (
            <div className="text-[13px] text-kd-text leading-relaxed mt-0.5 break-words min-w-0">
              <div className="kd-md" dangerouslySetInnerHTML={{ __html: html }} />
              {message.editedAt && (
                <span className="text-[9px] text-kd-text-mute font-mono ml-1">(изм.)</span>
              )}
            </div>
          )}
          {msgAttachments.length > 0 && <AttachmentList attachments={msgAttachments} />}
          <ThreadBadge />
          {reactionsEl}
        </div>
        {actionsEl}
      </div>
    </div>
  )
}
