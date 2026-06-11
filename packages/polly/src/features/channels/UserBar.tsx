// Нижняя плашка с текущим пользователем (designs/final-chrome.jsx → KD_UserBar).
// Используется внизу ChannelList и DmList.

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { useAuthStore } from '../auth/store.js'
import { useProfileUi } from '../profile/store.js'

export function UserBar() {
  const user = useAuthStore((s) => s.user)
  const openProfile = useProfileUi((s) => s.open)
  if (!user) return null
  const customStatus = user.customStatus?.trim() || null
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-kd-panel-alt border-t border-kd-border shrink-0">
      <button
        type="button"
        onClick={() => openProfile(user.id)}
        title="открыть профиль"
        className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
      >
        {/* Без статус-точки: статус уже показан текстовой строкой ниже (KD_UserBar). */}
        <Avatar name={user.displayName} avatarUrl={user.avatarUrl} size={28} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold font-mono text-kd-text truncate">
            {user.username}
          </div>
          <div className="text-[9px] font-mono text-kd-online truncate">
            ● {customStatus ?? 'в сети'}
          </div>
        </div>
      </button>
      <button type="button" title="микрофон" className="text-kd-text-soft hover:text-kd-text transition-colors">
        <Icon.Mic size={13} />
      </button>
      <button type="button" title="звук" className="text-kd-text-soft hover:text-kd-text transition-colors">
        <Icon.Headphones size={13} />
      </button>
    </div>
  )
}
