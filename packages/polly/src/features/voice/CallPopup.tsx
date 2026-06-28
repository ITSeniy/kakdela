// Содержимое отдельного окна входящего звонка (T-087, desktop). Рендерится в
// собственном Tauri-webview'е (label `call-popup`), который создаёт Rust поверх
// всех окон. Данные звонка приходят в query-параметре `cp` (base64url JSON) —
// надёжнее init-скрипта. Кнопки лишь шлют действие главному окну через
// emitCallAction и закрывают попап; сам join/decline исполняет главное окно.

import { useEffect } from 'react'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { closeSelfPopup, emitCallAction } from '../../lib/host/call-window.js'
import type { CallPopupData } from '../../lib/host/call-window.js'

function decodeData(encoded: string): CallPopupData | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const obj = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CallPopupData>
    if (typeof obj.channelId !== 'string' || typeof obj.fromName !== 'string') return null
    return { channelId: obj.channelId, fromName: obj.fromName, fromAvatarUrl: obj.fromAvatarUrl ?? null }
  } catch {
    return null
  }
}

export function CallPopup({ encoded }: { encoded: string }) {
  const data = decodeData(encoded)

  // Подстраховка: окно само закроется, даже если главное окно не успеет/не
  // сможет — чуть позже авто-сброса инвайта (32с) в IncomingCall.
  useEffect(() => {
    const t = window.setTimeout(() => void closeSelfPopup(), 34_000)
    return () => window.clearTimeout(t)
  }, [])

  if (!data) {
    // Данные не распарсились — не оставляем «белый ящик», закрываемся сразу.
    void closeSelfPopup()
    return null
  }

  const respond = (action: 'accept' | 'decline') => {
    void emitCallAction(action, data.channelId).finally(() => void closeSelfPopup())
  }

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
          onClick={() => respond('decline')}
          title="отклонить"
          className="w-9 h-9 rounded-full bg-kd-danger text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Icon.PhoneOff size={16} />
        </button>
        <button
          type="button"
          onClick={() => respond('accept')}
          title="принять"
          className="w-9 h-9 rounded-full bg-kd-online text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Icon.Phone size={16} />
        </button>
      </div>
    </div>
  )
}
