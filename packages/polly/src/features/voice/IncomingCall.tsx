// Входящий DM-звонок (T-087): тост в углу окна, НЕ модалка — не блокирует
// чат. Подписан на dm.call-invite/cancel через wsClient, зациклен звук «ring»,
// авто-снятие через ~32с (сервер шлёт cancel на 30с). «Принять» — join
// DM-комнаты + переход в переписку; «отклонить» — POST decline.
//
// На desktop параллельно с тостом поднимается ОТДЕЛЬНОЕ окно поверх всех окон
// (open/closeCallPopup) — его кнопки шлют действие сюда через onCallPopupAction.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { closeCallPopup, onCallPopupAction, openCallPopup } from '../../lib/host/call-window.js'
import { focusMainWindow } from '../../lib/host/tray.js'
import { wsClient } from '../../lib/ws.js'
import { useAuthStore } from '../auth/store.js'
import { playSound } from '../sounds/sounds.js'
import { declineDmCall } from './api.js'
import { joinDmCall } from './useVoiceRoom.js'

interface Invite {
  channelId: string
  fromUserId: string
  fromName: string
  fromAvatarUrl: string | null
}

const RING_REPEAT_MS = 2200
const AUTO_DISMISS_MS = 32_000

export function IncomingCall() {
  const [, navigate] = useLocation()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [invite, setInvite] = useState<Invite | null>(null)
  // Реф на текущий invite: слушатель действий из попап-окна регистрируется один
  // раз, а актуальный invite читает отсюда (без перерегистрации listener'а).
  const inviteRef = useRef<Invite | null>(null)
  inviteRef.current = invite

  // accept/decline принимают invite явно — их зовёт и UI тоста, и действия из
  // отдельного попап-окна (desktop).
  const accept = useCallback((inv: Invite) => {
    setInvite(null)
    void joinDmCall(inv.channelId, {
      id: inv.fromUserId,
      name: inv.fromName,
      avatarUrl: inv.fromAvatarUrl,
    })
    // Звонок идёт в главном окне — поднимаем его, если было свёрнуто.
    void focusMainWindow()
    navigate(`/dm/${inv.channelId}`)
  }, [navigate])

  const decline = useCallback((inv: Invite) => {
    setInvite(null)
    void declineDmCall(inv.channelId).catch(() => {})
  }, [])

  // Подписка на сигналинг звонка. Реф'ом сравниваем canceled-канал с текущим.
  useEffect(() => {
    if (!userId) return undefined
    return wsClient.on((event) => {
      if (event.t === 'dm.call-invite') {
        setInvite({
          channelId: event.channelId,
          fromUserId: event.fromUserId,
          fromName: event.fromName,
          fromAvatarUrl: event.fromAvatarUrl,
        })
      } else if (event.t === 'dm.call-cancel') {
        setInvite((cur) => (cur && cur.channelId === event.channelId ? null : cur))
      }
    })
  }, [userId])

  // Действия из попап-окна (desktop): принять/отклонить. На web — no-op.
  useEffect(() => {
    return onCallPopupAction(({ action, channelId }) => {
      const inv = inviteRef.current
      if (!inv || inv.channelId !== channelId) return
      if (action === 'accept') accept(inv)
      else decline(inv)
    })
  }, [accept, decline])

  // Звук + авто-снятие + попап поверх всех окон (desktop), пока висит инвайт.
  useEffect(() => {
    if (!invite) return undefined
    void openCallPopup({
      channelId: invite.channelId,
      fromName: invite.fromName,
      fromAvatarUrl: invite.fromAvatarUrl,
    })
    playSound('ring')
    const ring = setInterval(() => playSound('ring'), RING_REPEAT_MS)
    const dismiss = setTimeout(() => setInvite(null), AUTO_DISMISS_MS)
    return () => {
      clearInterval(ring)
      clearTimeout(dismiss)
      void closeCallPopup()
    }
  }, [invite])

  if (!invite) return null
  const inv = invite

  return (
    <div className="fixed z-[70] bottom-4 right-4 left-4 sm:left-auto sm:w-[320px] kd-safe-bottom">
      <div className="bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal p-3.5 flex items-center gap-3 kd-call-pop">
        <span className="relative shrink-0">
          <Avatar name={inv.fromName} avatarUrl={inv.fromAvatarUrl} size={44} />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-kd-online flex items-center justify-center border-2 border-kd-panel">
            <Icon.Phone size={11} className="text-white" />
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-kd-text truncate">{inv.fromName}</div>
          <div className="text-[10px] font-mono text-kd-text-soft">входящий звонок…</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => decline(inv)}
            title="отклонить"
            className="w-9 h-9 rounded-full bg-kd-danger text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Icon.PhoneOff size={16} />
          </button>
          <button
            type="button"
            onClick={() => accept(inv)}
            title="принять"
            className="w-9 h-9 rounded-full bg-kd-online text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Icon.Phone size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
