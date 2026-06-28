import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useRoute } from 'wouter'

import { EmptyState } from '../components/EmptyState.js'
import { Icon } from '../components/Icon.js'
import { useAuthStore } from '../features/auth/store.js'
import { DmOpener } from '../features/dm/DmOpener.js'
import { DmScreen } from '../features/dm/DmScreen.js'
import { MobileDmList } from '../features/dm/MobileDmList.js'
import { NewChatScreen } from '../features/dm/NewChatScreen.js'
import { MobileProfileScreen } from '../features/profile/MobileProfileScreen.js'
import { initSecretChats, startSecretChatListener } from '../features/secret/api.js'
import { SecretChatList } from '../features/secret/SecretChatList.js'
import { SecretChatScreen } from '../features/secret/SecretChatScreen.js'

type MobileTab = 'chats' | 'calls' | 'profile'

/**
 * Мобильный shell (T-100). Личный мессенджер, НЕ «мобильный Discord»:
 * только личные переписки (cloud-DM) + секретные чаты + bottom-nav. Серверов,
 * каналов, серверных голос-комнат и демо экрана здесь нет.
 *
 * Подключается из Router при `useIsMobile()`; desktop остаётся на `<Shell/>`.
 * Экраны: список чатов (MobileDmList), переписка (DmScreen), секретные чаты,
 * «новая переписка» (NewChatScreen), профиль (MobileProfileScreen).
 */
export function MobileShell() {
  const [location, navigate] = useLocation()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [, dmChannel] = useRoute<{ channelId: string }>('/dm/:channelId')
  const [, dmWith] = useRoute<{ userId: string }>('/dm/with/:userId')
  const [, secretPeer] = useRoute<{ userId: string }>('/secret/:userId')
  const [, otherProfile] = useRoute<{ userId: string }>('/u/:userId')
  const [isSecretList] = useRoute('/secret')
  const [isNewChat] = useRoute('/new')
  const [isCalls] = useRoute('/calls')
  const [isProfile] = useRoute('/profile')

  // «Дом» мобилки — список чатов. Корень и любые серверные маршруты (если в
  // них как-то попали) сводим на /dm: на мобиле серверов нет.
  useEffect(() => {
    if (location === '/' || location === '' || location.startsWith('/servers')) {
      navigate('/dm', { replace: true })
    }
  }, [location, navigate])

  // Секретные чаты (T-101…T-103): поднять крипто-ядро + опубликовать бандл, и
  // подписаться на входящие конверты (WS secret.envelope → слив inbox). Только
  // на мобиле и при наличии нативного крипто (web-путь бросит unsupported —
  // глушим). Снимаем подписку при размонтировании/смене пользователя.
  useEffect(() => {
    if (!userId) return undefined
    initSecretChats(userId).catch(() => { /* web/без нативного крипто — секретных чатов нет */ })
    return startSecretChatListener(queryClient)
  }, [userId, queryClient])

  const openChannelId = dmChannel?.channelId ?? null
  const openWithUserId = dmWith?.userId ?? null
  const openSecretPeer = secretPeer?.userId ?? null
  const openOtherProfile = otherProfile?.userId ?? null

  // ── Полноэкранные экраны (без bottom-nav, как обычный мессенджер) ──
  if (openSecretPeer) {
    return (
      <div className="h-full flex flex-col bg-kd-bg kd-safe-top">
        <SecretChatScreen peerUserId={openSecretPeer} onBack={() => navigate('/secret')} />
      </div>
    )
  }
  if (openOtherProfile) {
    return (
      <div className="h-full flex flex-col bg-kd-bg kd-safe-top">
        <MobileProfileScreen userId={openOtherProfile} />
      </div>
    )
  }
  if (isNewChat) {
    return (
      <div className="h-full flex flex-col bg-kd-bg kd-safe-top">
        <NewChatScreen />
      </div>
    )
  }
  if (openWithUserId) {
    return (
      <div className="h-full flex flex-col bg-kd-bg kd-safe-top">
        <DmOpener userId={openWithUserId} />
      </div>
    )
  }
  if (openChannelId) {
    return (
      <div className="h-full flex flex-col bg-kd-bg kd-safe-top">
        <DmScreen channelId={openChannelId} onBack={() => navigate('/dm')} />
      </div>
    )
  }
  // Полноэкранный список секретных чатов (из списка чатов → «секретные чаты»).
  if (isSecretList) {
    return (
      <div className="h-full flex flex-col bg-kd-bg kd-safe-top">
        <div className="px-2 py-1.5 border-b border-kd-border bg-kd-panel-alt shrink-0">
          <button type="button" onClick={() => navigate('/dm')} className="flex items-center gap-1.5 text-kd-text-soft hover:text-kd-text text-[12px] font-mono">
            <Icon.ArrowLeft size={18} /> чаты
          </button>
        </div>
        <SecretChatList />
      </div>
    )
  }

  const tab: MobileTab = isCalls ? 'calls' : isProfile ? 'profile' : 'chats'

  return (
    <div className="h-full grid grid-rows-[minmax(0,1fr)_auto] bg-kd-bg text-kd-text font-sans overflow-hidden kd-safe-top">
      <div className="min-h-0 overflow-hidden flex flex-col">
        {tab === 'chats' && <MobileDmList />}
        {tab === 'calls' && (
          <div className="flex-1 flex items-center justify-center px-6">
            <EmptyState
              glyph="📞"
              title="звонки"
              body={'история звонков появится здесь.\nзвонок 1:1 — из переписки или профиля.'}
            />
          </div>
        )}
        {tab === 'profile' && (
          userId
            ? <MobileProfileScreen userId={userId} />
            : <div className="flex-1 flex items-center justify-center font-mono text-[11px] text-kd-text-mute">загрузка…</div>
        )}
      </div>
      <MobileBottomNav
        tab={tab}
        onSelect={(t) => navigate(t === 'chats' ? '/dm' : `/${t}`)}
      />
    </div>
  )
}

function MobileBottomNav({
  tab,
  onSelect,
}: {
  tab: MobileTab
  onSelect: (t: MobileTab) => void
}) {
  const items: { id: MobileTab; label: string; icon: typeof Icon.Smile }[] = [
    { id: 'chats', label: 'чаты', icon: Icon.Smile },
    { id: 'calls', label: 'звонки', icon: Icon.Phone },
    { id: 'profile', label: 'профиль', icon: Icon.Users },
  ]
  return (
    <nav className="shrink-0 flex border-t border-kd-border bg-kd-panel-alt kd-safe-bottom">
      {items.map(({ id, label, icon: I }) => {
        const on = id === tab
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={[
              'flex-1 flex flex-col items-center gap-1 pt-2 pb-1 transition-colors',
              on ? 'text-kd-accent' : 'text-kd-text-mute',
            ].join(' ')}
          >
            <I size={22} />
            <span className={`text-[10px] ${on ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
