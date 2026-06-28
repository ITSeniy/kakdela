// Содержимое отдельного окна входящего звонка (T-087, desktop). Рендерится в
// собственном Tauri-webview'е (label `call-popup`), который создаёт Rust поверх
// всех окон. Данные звонка кладёт init-скрипт в window.__CALL_POPUP__; кнопки
// лишь шлют действие главному окну через emitCallAction — сам join/decline и
// закрытие попапа исполняет главное окно (IncomingCall).

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { emitCallAction } from '../../lib/host/call-window.js'
import type { CallPopupData } from '../../lib/host/call-window.js'

function readPopupData(): CallPopupData | null {
  const raw = (window as unknown as { __CALL_POPUP__?: CallPopupData }).__CALL_POPUP__
  if (!raw || typeof raw.channelId !== 'string') return null
  return {
    channelId: raw.channelId,
    fromName: raw.fromName,
    fromAvatarUrl: raw.fromAvatarUrl ?? null,
  }
}

export function CallPopup() {
  const data = readPopupData()
  if (!data) return null

  const accept = () => void emitCallAction('accept', data.channelId)
  const decline = () => void emitCallAction('decline', data.channelId)

  return (
    <div className="fixed inset-0 flex items-center gap-3 px-3.5 bg-kd-panel border border-kd-border select-none overflow-hidden kd-call-pop">
      <span className="relative shrink-0">
        <Avatar name={data.fromName} avatarUrl={data.fromAvatarUrl} size={44} />
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-kd-online flex items-center justify-center border-2 border-kd-panel">
          <Icon.Phone size={11} className="text-white" />
        </span>
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-kd-text truncate">{data.fromName}</div>
        <div className="text-[10px] font-mono text-kd-text-soft">входящий звонок…</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={decline}
          title="отклонить"
          className="w-9 h-9 rounded-full bg-kd-danger text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Icon.PhoneOff size={16} />
        </button>
        <button
          type="button"
          onClick={accept}
          title="принять"
          className="w-9 h-9 rounded-full bg-kd-online text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Icon.Phone size={16} />
        </button>
      </div>
    </div>
  )
}
