import { useEffect, useMemo, useState } from 'react'
import { type InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type {
  Attachment,
  Channel,
  DmSummary,
  MemberPublic,
  Message,
  MessagesPage,
} from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { toast } from '../../components/toast/index.js'
import { useAuthStore } from '../auth/store.js'
import { useProfileUi } from '../profile/store.js'
import { addReaction, deleteMessage, editMessage, removeReaction, sendMessage } from '../chat/api.js'
import { Composer } from '../chat/Composer.js'
import { useMessages } from '../chat/useMessages.js'
import type { PendingMessage } from '../chat/types.js'
import { DmBubbleList } from './DmBubbleList.js'
import { listDms, markDmRead } from './api.js'

type MsgCache = InfiniteData<MessagesPage, string | undefined>

interface DmScreenProps {
  channelId: string
  /** Мобильный shell передаёт «назад» → в шапке рендерится стрелка (T-100). */
  onBack?: () => void
}

const STATUS_LABEL: Record<MemberPublic['status'], string> = {
  online:  '● в сети',
  idle:    '◐ отошёл',
  dnd:     '● не беспокоить',
  offline: '○ не в сети',
}

const STATUS_COLOR: Record<MemberPublic['status'], string> = {
  online:  'text-kd-online',
  idle:    'text-kd-idle',
  dnd:     'text-kd-dnd',
  offline: 'text-kd-text-mute',
}

function Header({ summary, onOpenProfile, onBack }: { summary: DmSummary | undefined; onOpenProfile: (id: string) => void; onBack?: () => void }) {
  const [, navigate] = useLocation()
  // `onBack` передаёт только мобильный shell — по нему отличаем мобильную шапку
  // (полноэкранный профиль /u/:id + кнопки звонка), не задевая десктоп.
  const mobile = Boolean(onBack)
  const back = onBack ? (
    <button
      type="button"
      onClick={onBack}
      title="назад"
      className="-ml-1 shrink-0 text-kd-text-soft hover:text-kd-text transition-colors"
    >
      <Icon.ArrowLeft size={22} />
    </button>
  ) : null
  if (!summary) {
    return (
      <div className="px-4 py-2.5 border-b border-kd-border bg-kd-panel-alt h-[49px] shrink-0 flex items-center gap-2">
        {back}
      </div>
    )
  }
  const status = summary.otherUser.status
  const openProfile = () =>
    mobile ? navigate(`/u/${summary.otherUser.id}`) : onOpenProfile(summary.otherUser.id)
  return (
    <div className="px-4 py-2 border-b border-kd-border bg-kd-panel-alt flex items-center gap-3 shrink-0">
      {back}
      <button
        type="button"
        onClick={openProfile}
        title="открыть профиль"
        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
      >
        <Avatar
          name={summary.otherUser.displayName}
          avatarUrl={summary.otherUser.avatarUrl}
          size={mobile ? 38 : 30}
          status={status}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-kd-text truncate">
            {summary.otherUser.displayName}
          </div>
          <div className={`text-[10px] font-mono ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </div>
        </div>
      </button>
      {mobile && (
        <>
          <button
            type="button"
            onClick={() => toast.info('звонки в личке — скоро')}
            title="позвонить"
            className="shrink-0 text-kd-text-soft active:text-kd-text"
          >
            <Icon.Phone size={19} />
          </button>
          <button
            type="button"
            onClick={() => toast.info('видеозвонок в личке — скоро')}
            title="видеозвонок"
            className="shrink-0 text-kd-text-soft active:text-kd-text"
          >
            <Icon.Video size={20} />
          </button>
          <button
            type="button"
            onClick={openProfile}
            title="профиль"
            className="shrink-0 text-kd-text-mute active:text-kd-text"
          >
            <Icon.More size={20} />
          </button>
        </>
      )}
    </div>
  )
}

export function DmScreen({ channelId, onBack }: DmScreenProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const openProfile = useProfileUi((s) => s.open)

  const [pending, setPending] = useState<PendingMessage[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const { data: dms = [] } = useQuery({
    queryKey: ['dm-list'],
    queryFn: listDms,
    staleTime: 10_000,
  })

  const summary = dms.find((d) => d.channelId === channelId)

  // Член-список для рендера сообщений в DM состоит из меня и собеседника.
  // Этого хватает, чтобы аватарки/имена в MessageList корректно
  // подставлялись через memberMap.
  const memberMap = useMemo(() => {
    const m = new Map<string, MemberPublic>()
    if (user) {
      m.set(user.id, {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        status: user.status,
        role: 'member',
        roles: [],
        permissions: 0,
      })
    }
    if (summary) {
      m.set(summary.otherUser.id, {
        id: summary.otherUser.id,
        displayName: summary.otherUser.displayName,
        ...(summary.otherUser.username !== undefined ? { username: summary.otherUser.username } : {}),
        avatarUrl: summary.otherUser.avatarUrl,
        status: summary.otherUser.status,
        role: 'member',
        roles: [],
        permissions: 0,
      })
    }
    return m
  }, [user, summary])

  // В DM нет server-каналов для меншинов #channel — даём пустую мапу.
  const emptyChannelMap = useMemo(() => new Map<string, Channel>(), [])

  // Auto-mark-as-read: тянем те же сообщения через useMessages (TanStack
  // дедуплицирует по queryKey, MessageList уже подписан на тот же кэш). Когда
  // приходит новое сообщение снизу — lastMessageId меняется → POST /read.
  const { data: msgs } = useMessages(channelId)
  const lastMessageId = useMemo(() => {
    if (!msgs || msgs.pages.length === 0) return null
    const first = msgs.pages[0]
    if (!first || first.messages.length === 0) return null
    return first.messages[first.messages.length - 1]?.id ?? null
  }, [msgs])

  useEffect(() => {
    if (!lastMessageId) return
    // Оптимистично гасим бейдж непрочитанного сразу — не ждём round-trip
    // POST /read (именно это ожидание и читалось как «долго помечается»).
    queryClient.setQueryData<DmSummary[]>(['dm-list'], (old) =>
      old?.map((d) => (d.channelId === channelId ? { ...d, unreadCount: 0 } : d)),
    )
    markDmRead(channelId, lastMessageId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['dm-list'] }))
      .catch((err) => {
        // Откатываем оптимизм фактическим состоянием с сервера.
        console.error('[dm] mark read failed', err)
        void queryClient.invalidateQueries({ queryKey: ['dm-list'] })
      })
  }, [channelId, lastMessageId, queryClient])

  async function handleSend(content: string, attachments: Attachment[] = []) {
    if (!user) return
    const nonce = crypto.randomUUID()
    const replyId = replyTo?.id ?? null
    const optimistic: PendingMessage = {
      id: `pending:${nonce}`,
      channelId,
      authorId: user.id,
      content,
      replyToId: replyId,
      createdAt: new Date().toISOString(),
      editedAt: null,
      attachments,
      _pending: 'sending',
      _nonce: nonce,
    }
    setPending((p) => [...p, optimistic])
    setReplyTo(null)

    try {
      const spoilerIds = attachments.filter((a) => a.spoiler).map((a) => a.id)
      const sent = await sendMessage(channelId, {
        content,
        ...(replyId ? { replyToId: replyId } : {}),
        clientNonce: nonce,
        ...(attachments.length > 0 ? { attachments: attachments.map((a) => a.id) } : {}),
        ...(spoilerIds.length > 0 ? { spoilerAttachments: spoilerIds } : {}),
      })
      queryClient.setQueryData<MsgCache>(['messages', channelId], (old) => {
        if (!old || old.pages.length === 0) return old
        const first = old.pages[0]
        if (!first || first.messages.some((m) => m.id === sent.id)) return old
        const pages = [...old.pages]
        pages[0] = { ...first, messages: [...first.messages, sent] }
        return { ...old, pages }
      })
      setPending((p) => p.filter((x) => x._nonce !== nonce))
      void queryClient.invalidateQueries({ queryKey: ['dm-list'] })
    } catch {
      setPending((p) =>
        p.map((x) => (x._nonce === nonce ? { ...x, _pending: 'error' as const } : x)),
      )
    }
  }

  function handleRetry(nonce: string) {
    const target = pending.find((p) => p._nonce === nonce)
    if (!target) return
    setPending((p) => p.filter((x) => x._nonce !== nonce))
    void handleSend(target.content, target.attachments)
  }

  async function handleEdit(id: string, newContent: string) {
    const snapshot = queryClient.getQueryData<MsgCache>(['messages', channelId])
    queryClient.setQueryData<MsgCache>(['messages', channelId], (old) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) =>
            m.id === id ? { ...m, content: newContent, editedAt: new Date().toISOString() } : m,
          ),
        })),
      }
    })
    try {
      await editMessage(id, newContent)
    } catch (err) {
      if (snapshot) queryClient.setQueryData(['messages', channelId], snapshot)
      toast.error('не удалось сохранить правку')
      console.error('[dm] edit failed', err)
    }
  }

  function handleDelete(id: string) {
    // T-092: оптимистичное удаление с окном «отменить» (см. ChatScreen).
    queryClient.setQueryData<MsgCache>(['messages', channelId], (old) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.filter((m) => m.id !== id),
        })),
      }
    })
    const timer = setTimeout(() => {
      deleteMessage(id).catch((err) => {
        toast.error('не удалось удалить сообщение')
        console.error('[dm] delete failed', err)
        void queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
      })
    }, 6500)
    toast.info('сообщение удалено', {
      undo: () => {
        clearTimeout(timer)
        void queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
      },
      duration: 6000,
    })
  }

  async function handleAddReaction(messageId: string, emoji: string) {
    try {
      await addReaction(messageId, emoji)
    } catch (err) {
      toast.error('не удалось поставить реакцию')
      console.error('[dm] add reaction failed', err)
    }
  }

  async function handleRemoveReaction(messageId: string, emoji: string) {
    try {
      await removeReaction(messageId, emoji)
    } catch (err) {
      toast.error('не удалось убрать реакцию')
      console.error('[dm] remove reaction failed', err)
    }
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-kd-bg">
      <Header summary={summary} onOpenProfile={openProfile} onBack={onBack} />
      <DmBubbleList
        channelId={channelId}
        currentUserId={user?.id ?? null}
        memberMap={memberMap}
        channelMap={emptyChannelMap}
        otherUser={summary?.otherUser}
        pending={pending}
        onMention={openProfile}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRetry={handleRetry}
        onReply={setReplyTo}
        onAddReaction={handleAddReaction}
        onRemoveReaction={handleRemoveReaction}
      />
      <Composer
        channelName={summary?.otherUser.displayName ?? ''}
        channelId={channelId}
        memberMap={memberMap}
        replyTo={replyTo}
        replyAuthor={replyTo ? memberMap.get(replyTo.authorId)?.displayName : undefined}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
      />
    </div>
  )
}
