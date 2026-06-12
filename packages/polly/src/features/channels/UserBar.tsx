// Нижняя плашка с текущим пользователем (designs/final-chrome.jsx → KD_UserBar).
// Используется внизу ChannelList и DmList. Имя — displayName, на ховере
// показывается никнейм (логин). Клик по строке статуса открывает меню
// presence («в сети / отошёл / не беспокоить»). Кнопки микрофона и звука
// настоящие: переключают mute/deafen в voice store — состояния применятся
// при заходе в голосовой канал (runJoin читает их перед publish'ем).

import { useEffect, useRef, useState } from 'react'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { useAuthStore } from '../auth/store.js'
import { useMyStatus, type MyStatus } from '../presence/store.js'
import { useProfileUi } from '../profile/store.js'
import { VoiceDock } from '../voice/VoiceDock.js'
import { useVoiceInputSettings } from '../voice/inputSettings.js'
import { useVoiceStore } from '../voice/store.js'
import { useVoiceRoom } from '../voice/useVoiceRoom.js'

const STATUS_LABEL: Record<MyStatus, string> = {
  online: 'в сети',
  idle: 'отошёл',
  dnd: 'не беспокоить',
}

const STATUS_TEXT_CLS: Record<MyStatus, string> = {
  online: 'text-kd-online',
  idle: 'text-kd-idle',
  dnd: 'text-kd-dnd',
}

const STATUS_DOT_CLS: Record<MyStatus, string> = {
  online: 'bg-kd-online',
  idle: 'bg-kd-idle',
  dnd: 'bg-kd-dnd',
}

const STATUS_ORDER: MyStatus[] = ['online', 'idle', 'dnd']

export function UserBar() {
  const user = useAuthStore((s) => s.user)
  const openProfile = useProfileUi((s) => s.open)
  const myStatus = useMyStatus((s) => s.myStatus)
  const setMyStatus = useMyStatus((s) => s.setMyStatus)
  const muted = useVoiceStore((s) => s.muted)
  const deafened = useVoiceStore((s) => s.deafened)
  const inputMode = useVoiceInputSettings((s) => s.inputMode)
  const { toggleMute, toggleDeafen } = useVoiceRoom()

  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusMenuOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setStatusMenuOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [statusMenuOpen])

  if (!user) return null
  const customStatus = user.customStatus?.trim() || null
  const isPtt = inputMode === 'push-to-talk'
  // Deafen в Discord-семантике глушит и микрофон тоже.
  const micOff = muted || deafened

  return (
    <div className="shrink-0">
    {/* Док голосовой связи пристыковывается сверху, когда мы в ГС. */}
    <VoiceDock />
    <div className="relative flex items-center gap-2 px-3 py-2 bg-kd-panel-alt border-t border-kd-border">
      <button
        type="button"
        onClick={() => openProfile(user.id)}
        title="открыть профиль"
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        {/* Без статус-точки: статус уже показан текстовой строкой ниже (KD_UserBar). */}
        <Avatar name={user.displayName} avatarUrl={user.avatarUrl} size={28} />
      </button>
      <div className="flex-1 min-w-0">
        {/* Перелистывание: обе строки лежат столбиком в окне высотой в одну
            строку; на ховере обе уезжают вверх на свою высоту — имя
            прокручивается, открывая никнейм. */}
        <button
          type="button"
          onClick={() => openProfile(user.id)}
          title="открыть профиль"
          className="group block w-full h-4 overflow-hidden text-left text-[11px] font-bold font-mono text-kd-text"
        >
          <span className="block h-4 leading-4 truncate transition-transform duration-300 ease-out group-hover:-translate-y-full">
            {user.displayName}
          </span>
          <span
            aria-hidden
            className="block h-4 leading-4 truncate transition-transform duration-300 ease-out group-hover:-translate-y-full text-kd-text-soft"
          >
            {user.username}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusMenuOpen((o) => !o)}
          title="сменить статус"
          className={`block w-full text-left text-[9px] font-mono truncate hover:underline ${STATUS_TEXT_CLS[myStatus]}`}
        >
          ● {customStatus ?? STATUS_LABEL[myStatus]}
        </button>
      </div>

      <button
        type="button"
        onClick={() => { if (!isPtt) void toggleMute() }}
        disabled={isPtt}
        title={
          isPtt
            ? 'в режиме push-to-talk микрофон управляется клавишей'
            : micOff ? 'включить микрофон' : 'заглушить микрофон'
        }
        className={`transition-colors ${
          isPtt
            ? 'text-kd-text-mute opacity-50 cursor-not-allowed'
            : micOff
              ? 'text-kd-dnd hover:opacity-80'
              : 'text-kd-text-soft hover:text-kd-text'
        }`}
      >
        {micOff ? <Icon.MicOff size={13} /> : <Icon.Mic size={13} />}
      </button>
      <button
        type="button"
        onClick={() => void toggleDeafen()}
        title={deafened ? 'включить звук' : 'отключить звук'}
        className={`transition-colors ${
          deafened ? 'text-kd-dnd hover:opacity-80' : 'text-kd-text-soft hover:text-kd-text'
        }`}
      >
        {deafened ? <Icon.HeadphonesOff size={13} /> : <Icon.Headphones size={13} />}
      </button>

      {statusMenuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-2 mb-1 z-50 min-w-[150px] bg-kd-panel border border-kd-border rounded-kd shadow-lg py-1 select-none"
        >
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setMyStatus(s); setStatusMenuOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors hover:bg-kd-panel-alt ${
                s === myStatus ? 'text-kd-text font-semibold' : 'text-kd-text-soft'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_CLS[s]}`} />
              {STATUS_LABEL[s]}
              {s === myStatus && (
                <span className="ml-auto text-[10px] font-mono text-kd-text-mute">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
    </div>
  )
}
