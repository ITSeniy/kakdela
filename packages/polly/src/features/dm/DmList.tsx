import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { CustomEmoji, DmSummary } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { useCommandPalette } from '../../components/CommandPalette.js'
import { Icon } from '../../components/Icon.js'
import { SectionLabel } from '../../components/SectionLabel.js'
import { wsClient } from '../../lib/ws.js'
import { useAuthStore } from '../auth/store.js'
import { UserBar } from '../channels/UserBar.js'
import { renderMarkdownInline } from '../chat/markdown.js'
import { useAllServerEmoji } from '../emoji/api.js'
import { listDms } from './api.js'

interface DmListProps {
  activeChannelId: string | null
}

function fmtWhen(iso: string | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'сейчас'
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}м`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}ч`
  const days = Math.round(ms / 86_400_000)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days}дн`
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' })
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function DmRow({
  dm, active, currentUserId, emojiMap, onClick,
}: {
  dm: DmSummary
  active: boolean
  currentUserId: string | null
  emojiMap: ReadonlyMap<string, CustomEmoji>
  onClick: () => void
}) {
  const lastIsMine = dm.lastMessage?.authorId === currentUserId
  // Превью — инлайном, чтобы `:name:` стал картинкой. Префикс «вы:» — текстом.
  const previewHtml = dm.lastMessage
    ? (lastIsMine ? 'вы: ' : '') + renderMarkdownInline(dm.lastMessage.preview, { emoji: emojiMap })
    : null
  const unread = dm.unreadCount > 0
  const offline = dm.otherUser.status === 'offline'
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 py-2 pr-3.5 text-left border-l-2 transition-colors',
        active
          ? 'bg-kd-panel-hi border-kd-accent pl-3'
          : 'border-transparent pl-3.5 hover:bg-kd-panel-alt/60',
        offline && !unread ? 'opacity-70' : '',
      ].join(' ')}
    >
      <Avatar
        name={dm.otherUser.displayName}
        avatarUrl={dm.otherUser.avatarUrl}
        size={32}
        status={dm.otherUser.status}
        ringColor={active ? 'var(--kd-panel-hi)' : 'var(--kd-panel)'}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[13px] flex-1 truncate text-kd-text ${active || unread ? 'font-semibold' : 'font-medium'}`}>
            {dm.otherUser.displayName}
          </span>
          <span className="text-[10px] text-kd-text-mute font-mono shrink-0">
            {fmtWhen(dm.lastMessage?.createdAt)}
          </span>
        </div>
        {previewHtml !== null ? (
          <div
            className={`kd-md text-[11px] truncate mt-px ${unread ? 'text-kd-text font-semibold' : 'text-kd-text-soft'}`}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <div className={`text-[11px] truncate mt-px ${unread ? 'text-kd-text font-semibold' : 'text-kd-text-soft'}`}>
            новый диалог
          </div>
        )}
      </div>
      {unread && <Badge variant="mention">{dm.unreadCount}</Badge>}
    </button>
  )
}

export function DmList({ activeChannelId }: DmListProps) {
  const [, navigate] = useLocation()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const togglePalette = useCommandPalette((s) => s.toggle)

  const { data: dms = [] } = useQuery({
    queryKey: ['dm-list'],
    queryFn: listDms,
    staleTime: 10_000,
  })
  const emojiMap = useAllServerEmoji()

  // Realtime: при `msg.new` в DM-канале — refetch списка (обновится
  // unread/preview/порядок). При `dm.new` (новый собеседник написал нам
  // первым) — тоже refetch. Дёшевле, чем мерджить вручную; список из
  // ~20 строк весит копейки.
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t === 'msg.new' || event.t === 'msg.edit' || event.t === 'msg.delete' || event.t === 'dm.new') {
        void queryClient.invalidateQueries({ queryKey: ['dm-list'] })
      }
    })
  }, [queryClient])

  const totalUnread = dms.reduce((sum, d) => sum + d.unreadCount, 0)

  return (
    <aside className="bg-kd-panel border-r border-kd-border flex flex-col min-h-0">
      <div className="px-3.5 py-2.5 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="text-[13px] font-bold text-kd-text">личные сообщения</div>
        <div className="text-[10px] text-kd-text-mute mt-0.5 font-mono">
          {dms.length} {pluralRu(dms.length, 'переписка', 'переписки', 'переписок')}
          {totalUnread > 0 && <> · {totalUnread} {pluralRu(totalUnread, 'непрочитанное', 'непрочитанных', 'непрочитанных')}</>}
        </div>
      </div>
      <div className="p-2 shrink-0">
        <button
          type="button"
          onClick={togglePalette}
          className="w-full bg-kd-panel-alt rounded px-2.5 py-1.5 flex items-center gap-1.5 text-left hover:bg-kd-panel-hi transition-colors"
        >
          <Icon.Search size={12} className="text-kd-text-mute shrink-0" />
          <span className="text-[11px] text-kd-text-mute flex-1">искать переписку…</span>
          <span className="text-[9px] text-kd-text-mute font-mono shrink-0">ctrl k</span>
        </button>
      </div>
      <div className="px-1.5 shrink-0">
        <SectionLabel
          action={
            <button
              type="button"
              title="новая переписка"
              onClick={togglePalette}
              className="text-kd-text-mute hover:text-kd-text-soft transition-colors"
            >
              <Icon.Plus size={11} />
            </button>
          }
        >
          — недавние
        </SectionLabel>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {dms.length === 0 && (
          <div className="px-3.5 py-4 text-[11px] text-kd-text-mute font-mono">
            пока никаких DM. напиши кому-нибудь из списка участников.
          </div>
        )}
        {dms.map((dm) => (
          <DmRow
            key={dm.channelId}
            dm={dm}
            active={dm.channelId === activeChannelId}
            currentUserId={user?.id ?? null}
            emojiMap={emojiMap}
            onClick={() => navigate(`/dm/${dm.channelId}`)}
          />
        ))}
      </div>
      <UserBar />
    </aside>
  )
}
