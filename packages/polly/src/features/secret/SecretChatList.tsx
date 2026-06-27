// T-103 — список секретных чатов. Источник — локальная история (T-102), НЕ
// сервер. Каждая строка: avatar + имя + превью последнего сообщения + время +
// 🔒-бейдж. Визуально отделено от cloud-DM (замок, warm-акцент).

import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Avatar } from '../../components/Avatar.js'
import { EmptyState } from '../../components/EmptyState.js'
import { Icon } from '../../components/Icon.js'
import { getUserProfile } from '../profile/api.js'
import { fetchSecretMessages, fetchSecretPeers, secretMessagesKey, secretPeersKey } from './api.js'

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function SecretChatRow({ peerUserId, onOpen }: { peerUserId: string; onOpen: (id: string) => void }) {
  const { data: profile } = useQuery({
    queryKey: ['user-profile', peerUserId],
    queryFn: () => getUserProfile(peerUserId),
    staleTime: 60_000,
  })
  const { data: messages = [] } = useQuery({
    queryKey: secretMessagesKey(peerUserId),
    queryFn: () => fetchSecretMessages(peerUserId),
    staleTime: 5_000,
  })
  const last = messages[messages.length - 1]
  const name = profile?.displayName ?? '…'

  return (
    <button
      type="button"
      onClick={() => onOpen(peerUserId)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-kd-panel-hi transition-colors text-left"
    >
      <Avatar name={name} avatarUrl={profile?.avatarUrl ?? null} size={40} status={profile?.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon.Lock size={11} className="text-kd-warm shrink-0" />
          <span className="text-[13px] font-bold text-kd-text truncate">{name}</span>
          {last && <span className="ml-auto text-[10px] font-mono text-kd-text-mute shrink-0">{fmtTime(last.sentAtMs)}</span>}
        </div>
        <div className="text-[11px] text-kd-text-soft truncate mt-0.5">
          {last ? `${last.direction === 'out' ? 'вы: ' : ''}${last.body}` : 'секретный чат'}
        </div>
      </div>
    </button>
  )
}

export function SecretChatList() {
  const [, navigate] = useLocation()
  const { data: peers = [] } = useQuery({
    queryKey: secretPeersKey,
    queryFn: fetchSecretPeers,
    staleTime: 5_000,
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 py-2.5 border-b border-kd-border bg-kd-panel-alt flex items-center gap-2 shrink-0">
        <Icon.Lock size={15} className="text-kd-warm" />
        <span className="text-[13px] font-bold text-kd-text">секретные чаты</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {peers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <EmptyState
              glyph="🔒"
              title="нет секретных чатов"
              body={'секретный чат начинается из профиля собеседника.\nпереписка хранится только на этом устройстве.'}
            />
          </div>
        ) : (
          peers.map((peer) => <SecretChatRow key={peer} peerUserId={peer} onOpen={(id) => navigate(`/secret/${id}`)} />)
        )}
      </div>
    </div>
  )
}
