// Входящий DM-звонок (T-087): тост в углу окна, НЕ модалка — не блокирует
// чат. Подписан на dm.call-invite/cancel через wsClient, зациклен звук «ring»,
// авто-снятие через ~32с (сервер шлёт cancel на 30с). «Принять» — join
// DM-комнаты + переход в переписку; «отклонить» — POST decline.

import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
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

  // Звук + авто-снятие, пока висит инвайт.
  useEffect(() => {
    if (!invite) return undefined
    playSound('ring')
    const ring = setInterval(() => playSound('ring'), RING_REPEAT_MS)
    const dismiss = setTimeout(() => setInvite(null), AUTO_DISMISS_MS)
    return () => {
      clearInterval(ring)
      clearTimeout(dismiss)
    }
  }, [invite])

  if (!invite) return null

  const accept = () => {
    const inv = invite
    setInvite(null)
    void joinDmCall(inv.channelId, {
      id: inv.fromUserId,
      name: inv.fromName,
      avatarUrl: inv.fromAvatarUrl,
    })
    navigate(`/dm/${inv.channelId}`)
  }

  const decline = () => {
    const inv = invite
    setInvite(null)
    void declineDmCall(inv.channelId).catch(() => {})
  }

  return (
    <div className="fixed z-[70] bottom-4 right-4 left-4 sm:left-auto sm:w-[320px] kd-safe-bottom">
      <div className="bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal p-3.5 flex items-center gap-3 kd-call-pop">
        <span className="relative shrink-0">
          <Avatar name={invite.fromName} avatarUrl={invite.fromAvatarUrl} size={44} />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-kd-online flex items-center justify-center border-2 border-kd-panel">
            <Icon.Phone size={11} className="text-white" />
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-kd-text truncate">{invite.fromName}</div>
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
    </div>
  )
}
