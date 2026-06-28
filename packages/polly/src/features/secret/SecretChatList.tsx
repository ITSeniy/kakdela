// T-103 — список секретных чатов. Стиль 1:1 с designs/final-secret-chat.jsx
// (SecretChatList): шапка с замком + «N переписок · сквозное шифрование», строка
// поиска, строки с avatar(46)+статус, 🔒, бейджем «проверено», unread-счётчиком и
// предупреждением о смене ключа. Источник — локальная история (T-102), НЕ сервер.

import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Avatar } from '../../components/Avatar.js'
import { EmptyState } from '../../components/EmptyState.js'
import { Icon } from '../../components/Icon.js'
import { cryptoSafetyNumber } from '../../lib/host/crypto.js'
import { getUserProfile } from '../profile/api.js'
import { fetchSecretMessages, fetchSecretPeers, secretMessagesKey, secretPeersKey } from './api.js'
import { useSecretSession } from './sessionStore.js'
import { getSeenTs, getVerifiedSafetyNumber } from './verifyStore.js'

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function SecretChatRow({ peerUserId, onOpen }: { peerUserId: string; onOpen: (id: string) => void }) {
  const rekey = useSecretSession((s) => Boolean(s.keyChanged[peerUserId]))

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
  const { data: seenTs = 0 } = useQuery({
    queryKey: ['secret-seen', peerUserId, messages.length],
    queryFn: () => getSeenTs(peerUserId),
    staleTime: 5_000,
  })
  // «проверено» = текущий safety number совпадает с ранее отмеченным.
  const { data: verified = false } = useQuery({
    queryKey: ['secret-row-verified', peerUserId, messages.length],
    queryFn: async () => {
      const [cur, saved] = await Promise.all([
        cryptoSafetyNumber(peerUserId).catch(() => null),
        getVerifiedSafetyNumber(peerUserId),
      ])
      return Boolean(cur && saved && cur === saved)
    },
    staleTime: 30_000,
  })

  const name = profile?.displayName ?? '…'
  const last = messages[messages.length - 1]
  const unread = messages.filter((m) => m.direction === 'in' && m.sentAtMs > seenTs).length
  const preview = rekey
    ? 'ключ обновился — сверь заново'
    : last
      ? `${last.direction === 'out' ? 'вы: ' : ''}${last.body}`
      : 'секретный чат'

  return (
    <button
      type="button"
      onClick={() => onOpen(peerUserId)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-kd-border hover:bg-kd-panel-hi transition-colors text-left"
    >
      <Avatar name={name} avatarUrl={profile?.avatarUrl ?? null} size={46} status={profile?.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[15px] text-kd-text truncate ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>{name}</span>
          <span className="text-[12px] text-kd-warm shrink-0" role="img" aria-label="секретный">🔒</span>
          {verified && <Icon.Check size={13} className="text-kd-online shrink-0" aria-label="проверено" />}
          <span className="flex-1" />
          {last && (
            <span className={`text-[11px] font-mono shrink-0 ${unread > 0 ? 'text-kd-warm font-bold' : 'text-kd-text-mute'}`}>
              {fmtTime(last.sentAtMs)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[13px] truncate flex-1 min-w-0 ${rekey ? 'text-kd-danger' : unread > 0 ? 'text-kd-text font-medium' : 'text-kd-text-soft'}`}>
            {rekey && <Icon.Alert size={11} className="text-kd-danger inline -translate-y-px mr-1" />}
            {preview}
          </span>
          {unread > 0 && (
            <span className="bg-kd-warm text-white text-[11px] font-bold font-mono min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center shrink-0">
              {unread}
            </span>
          )}
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
      {/* шапка раздела */}
      <div className="px-[18px] pt-3 pb-3.5 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="flex items-center gap-2">
          <Icon.Lock size={16} className="text-kd-accent" />
          <span className="text-[19px] font-bold text-kd-text">секретные чаты</span>
        </div>
        <div className="text-[11px] text-kd-text-mute mt-0.5 font-mono flex items-center gap-2">
          <span>{peers.length} {pluralChats(peers.length)}</span>
          <span className="opacity-50">·</span>
          <span className="text-kd-accent">сквозное шифрование</span>
        </div>
      </div>
      {/* поиск (визуальный — как в макете) */}
      <div className="px-3.5 pt-2.5 pb-1.5 shrink-0">
        <div className="bg-kd-panel-alt rounded-kd px-3 py-2.5 flex items-center gap-2 border border-kd-border">
          <Icon.Search size={14} className="text-kd-text-mute" />
          <span className="text-[13px] text-kd-text-mute">искать секретную переписку…</span>
        </div>
      </div>
      {/* список */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {peers.length === 0 ? (
          <div className="flex items-center justify-center px-6 py-12">
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

function pluralChats(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'переписка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'переписки'
  return 'переписок'
}
