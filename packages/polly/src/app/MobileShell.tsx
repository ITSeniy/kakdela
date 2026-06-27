import { useEffect } from 'react'
import { useLocation, useRoute } from 'wouter'

import { EmptyState } from '../components/EmptyState.js'
import { Icon } from '../components/Icon.js'
import { DmList } from '../features/dm/DmList.js'
import { DmOpener } from '../features/dm/DmOpener.js'
import { DmScreen } from '../features/dm/DmScreen.js'

type MobileTab = 'chats' | 'calls' | 'profile'

/**
 * Мобильный shell (T-100). Личный мессенджер, НЕ «мобильный Discord»:
 * только личные переписки (cloud-DM) + bottom-nav. Серверов, каналов,
 * серверных голос-комнат и демо экрана здесь нет.
 *
 * Подключается из Router при `useIsMobile()`; desktop остаётся на `<Shell/>`.
 * Экраны переиспользуются из `features/dm/*` — копий не плодим (T-100 п.4).
 */
export function MobileShell() {
  const [location, navigate] = useLocation()
  const [, dmChannel] = useRoute<{ channelId: string }>('/dm/:channelId')
  const [, dmWith] = useRoute<{ userId: string }>('/dm/with/:userId')
  const [isCalls] = useRoute('/calls')
  const [isProfile] = useRoute('/profile')

  // «Дом» мобилки — список чатов. Корень и любые серверные маршруты (если в
  // них как-то попали) сводим на /dm: на мобиле серверов нет.
  useEffect(() => {
    if (location === '/' || location === '' || location.startsWith('/servers')) {
      navigate('/dm', { replace: true })
    }
  }, [location, navigate])

  const openChannelId = dmChannel?.channelId ?? null
  const openWithUserId = dmWith?.userId ?? null

  // Внутри переписки — полноэкранный чат с кнопкой «назад», без bottom-nav
  // (как в обычном мессенджере).
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

  const tab: MobileTab = isCalls ? 'calls' : isProfile ? 'profile' : 'chats'

  return (
    <div className="h-full grid grid-rows-[minmax(0,1fr)_auto] bg-kd-bg text-kd-text font-sans overflow-hidden kd-safe-top">
      <div className="min-h-0 overflow-hidden flex flex-col">
        {tab === 'chats' && <DmList activeChannelId={null} />}
        {tab === 'calls' && (
          <div className="flex-1 flex items-center justify-center px-6">
            <EmptyState
              glyph="📞"
              title="звонки"
              body={'история звонков появится здесь.\nзвонок 1:1 — из переписки (T-087).'}
            />
          </div>
        )}
        {tab === 'profile' && (
          <div className="flex-1 flex items-center justify-center px-6">
            <EmptyState
              glyph="🙂"
              title="профиль"
              body={'настройки профиля приедут в T-089.'}
            />
          </div>
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
