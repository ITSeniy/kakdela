import { useEffect, useMemo, useRef, useState } from 'react'
import { type InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type {
  Attachment,
  Channel,
  DmSummary,
  GifEmbed,
  MemberPublic,
  Message,
  MessagesPage,
  StickerRef,
} from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { toast } from '../../components/toast/index.js'
import { wsClient } from '../../lib/ws.js'
import { useAuthStore } from '../auth/store.js'
import { useProfileUi } from '../profile/store.js'
import { addReaction, deleteMessage, editMessage, removeReaction, sendMessage } from '../chat/api.js'
import { Composer } from '../chat/Composer.js'
import { useMessages } from '../chat/useMessages.js'
import type { PendingMessage } from '../chat/types.js'
import { DmCallScreen } from '../voice/DmCallScreen.js'
import { useScreenShare } from '../voice/useScreenShare.js'
import { useVoiceRoom, type DmCallPeer } from '../voice/useVoiceRoom.js'
import { useVoiceStore } from '../voice/store.js'
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

// Кнопка-капсула шапки личной переписки (designs/final-dm.jsx:170-188):
// иконка + подпись, тонкая рамка. Только десктоп.
function HeaderAction({
  icon, label, onClick, disabled, title,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-kd border text-[11px] transition-colors',
        disabled
          ? 'border-kd-border text-kd-text-mute opacity-50 cursor-not-allowed'
          : 'border-kd-border text-kd-text hover:bg-kd-panel-hi',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

function Header({
  summary, onOpenProfile, onBack, onCall, onScreen, peerTyping, callDisabled,
}: {
  summary: DmSummary | undefined
  onOpenProfile: (id: string) => void
  onBack?: () => void
  onCall: () => void
  onScreen: () => void
  peerTyping: boolean
  callDisabled: boolean
}) {
  const [, navigate] = useLocation()
  // `onBack` передаёт только мобильный shell — по нему отличаем мобильную шапку
  // (полноэкранный профиль /u/:id + иконки-кнопки), не задевая десктоп.
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
  const custom = summary.otherUser.customStatus?.trim() || null
  const openProfile = () =>
    mobile ? navigate(`/u/${summary.otherUser.id}`) : onOpenProfile(summary.otherUser.id)
  const callTitle = callDisabled ? 'вы уже в другом звонке' : undefined

  // Статус-строка по макету: «● пьёт какао · печатает…». customStatus, если
  // есть, идёт вместо текстового статуса; «печатает…» дописывается поверх.
  // Цвет точки/текста всегда отражает реальный presence.
  const statusBase = custom ?? STATUS_LABEL[status].replace(/^[●◐○]\s*/, '')
  const statusColor = STATUS_COLOR[status]

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
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-kd-text truncate">
            {summary.otherUser.displayName}
          </div>
          <div className={`text-[10px] font-mono truncate ${statusColor}`}>
            ● {statusBase}{peerTyping && ' · печатает…'}
          </div>
        </div>
      </button>

      {mobile ? (
        <>
          <button
            type="button"
            onClick={onCall}
            disabled={callDisabled}
            title={callTitle ?? 'позвонить'}
            className={`shrink-0 ${callDisabled ? 'text-kd-text-mute opacity-50' : 'text-kd-text-soft active:text-kd-text'}`}
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
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <HeaderAction
            icon={<Icon.Speaker size={12} />}
            label="позвонить"
            onClick={onCall}
            disabled={callDisabled}
            title={callTitle}
          />
          <HeaderAction
            icon={<Icon.Video size={12} />}
            label="видео"
            onClick={() => toast.info('видеозвонок в личке — скоро')}
          />
          <HeaderAction
            icon={<Icon.Monitor size={12} />}
            label="экран"
            onClick={onScreen}
            disabled={callDisabled}
            title={callTitle}
          />
          <button
            type="button"
            onClick={() => onOpenProfile(summary.otherUser.id)}
            title="профиль"
            className="px-1.5 py-1 rounded-kd text-kd-text-mute hover:text-kd-text hover:bg-kd-panel-hi transition-colors"
          >
            <Icon.More size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export function DmScreen({ channelId, onBack }: DmScreenProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const openProfile = useProfileUi((s) => s.open)
  const { joinDm } = useVoiceRoom()
  const { startShare } = useScreenShare()

  // Активный DM-звонок именно в этом канале (T-087). callMinimized — звонок
  // свёрнут, показываем чат с баннером «вернуться».
  const activeChannelId = useVoiceStore((s) => s.activeChannelId)
  const activeContext = useVoiceStore((s) => s.activeContext)
  const voiceStatus = useVoiceStore((s) => s.status)
  const callActiveHere =
    activeContext === 'dm'
    && activeChannelId === channelId
    && (voiceStatus === 'connecting' || voiceStatus === 'connected' || voiceStatus === 'reconnecting')
  // Любой активный голос (этот звонок, другой звонок или ГС) блокирует «позвонить».
  const callDisabled = activeChannelId !== null
  const [callMinimized, setCallMinimized] = useState(false)

  const [pending, setPending] = useState<PendingMessage[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [peerTyping, setPeerTyping] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: dms = [] } = useQuery({
    queryKey: ['dm-list'],
    queryFn: listDms,
    staleTime: 10_000,
  })

  const summary = dms.find((d) => d.channelId === channelId)

  const callPeer: DmCallPeer | undefined = summary
    ? {
        id: summary.otherUser.id,
        name: summary.otherUser.displayName,
        avatarUrl: summary.otherUser.avatarUrl,
      }
    : undefined

  // Смена канала — сбрасываем «свёрнуто»; конец звонка — тоже (чтобы при
  // следующем звонке снова открылся полный экран).
  useEffect(() => { setCallMinimized(false) }, [channelId])
  useEffect(() => { if (!callActiveHere) setCallMinimized(false) }, [callActiveHere])

  // «печатает…» в шапке: ловим typing-события собеседника по этому каналу и
  // гасим через 4с тишины (typing троттлится на отправке, 4с с запасом).
  useEffect(() => {
    setPeerTyping(false)
    const off = wsClient.on((event) => {
      if (event.t !== 'typing' || event.channelId !== channelId) return
      if (event.userId === user?.id) return
      setPeerTyping(true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setPeerTyping(false), 4000)
    })
    return () => {
      off()
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [channelId, user?.id])

  async function handleCall() {
    if (!callPeer) return
    setCallMinimized(false)
    await joinDm(channelId, callPeer)
  }

  async function handleScreen() {
    if (!callPeer) return
    setCallMinimized(false)
    await joinDm(channelId, callPeer)
    await startShare()
  }

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

  async function handleSend(content: string, attachments: Attachment[] = [], gif?: GifEmbed, sticker?: StickerRef) {
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
      gif: gif ?? null,
      sticker: sticker ?? null,
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
        ...(gif ? { gif } : {}),
        ...(sticker ? { sticker } : {}),
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

  // Полноэкранный звонок замещает чат целиком; «свернуть» возвращает сюда.
  if (callActiveHere && !callMinimized) {
    return <DmCallScreen channelId={channelId} peer={callPeer} onMinimize={() => setCallMinimized(true)} />
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-kd-bg">
      <Header
        summary={summary}
        onOpenProfile={openProfile}
        onBack={onBack}
        onCall={handleCall}
        onScreen={handleScreen}
        peerTyping={peerTyping}
        callDisabled={callDisabled}
      />
      {callActiveHere && callMinimized && (
        <button
          type="button"
          onClick={() => setCallMinimized(false)}
          className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-kd-online/15 border-b border-kd-border text-[11px] font-mono text-kd-online hover:bg-kd-online/25 transition-colors"
        >
          <Icon.Phone size={12} />
          идёт звонок · вернуться
        </button>
      )}
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
