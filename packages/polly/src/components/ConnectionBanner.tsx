// Баннер потери соединения + toast о восстановлении.
// Источник дизайна: designs/final-extras.jsx (FinalConnection).
// Только ЧИТАЕТ статус из useRealtimeStore — ws.ts не трогаем.

import { useEffect, useRef } from 'react'

import { useRealtimeStore } from '../features/realtime/store.js'
import { useAuthStore } from '../features/auth/store.js'
import { wsClient } from '../lib/ws.js'
import { toast } from './toast/index.js'

export function ConnectionBanner() {
  const status = useRealtimeStore((s) => s.status)
  const authed = useAuthStore((s) => s.status) === 'authed'
  const prevRef = useRef(status)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = status
    if (!authed) return
    if ((prev === 'reconnecting' || prev === 'disconnected') && status === 'connected') {
      toast.success('соединение восстановлено')
    }
  }, [status, authed])

  if (!authed) return null
  if (status === 'connected' || status === 'connecting') return null

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-2 bg-kd-warm-bg border border-kd-warm-soft rounded-kd shadow-kd-modal backdrop-blur-[2px]">
      <span className="w-[18px] h-[18px] rounded-full bg-kd-warm text-white text-[11px] font-bold flex items-center justify-center shrink-0">
        !
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-bold text-kd-text leading-tight">
          {status === 'reconnecting' ? 'переподключаемся…' : 'нет соединения с сервером'}
        </div>
        <div className="text-[10px] font-mono text-kd-text-soft">
          сообщения отправятся после восстановления
        </div>
      </div>
      <button
        type="button"
        onClick={() => wsClient.connect()}
        className="shrink-0 px-2 py-1 rounded bg-kd-warm text-white text-[10px] font-mono font-bold hover:bg-kd-warm-deep"
      >
        повторить
      </button>
    </div>
  )
}
