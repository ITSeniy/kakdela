// T-103 — кнопка «начать секретный чат» из профиля. Секретные чаты — мобайл-онли
// (device-bound), поэтому кнопка рендерится только на мобиле. Установка сессии
// (PQXDH) происходит уже на экране (ensureSecretSession в SecretChatScreen) — тут
// только переход.

import { useLocation } from 'wouter'

import { Icon } from '../../components/Icon.js'
import { useIsMobile } from '../../app/useIsMobile.js'
import { useProfileUi } from '../profile/store.js'

export function StartSecretChat({ userId }: { userId: string }) {
  const isMobile = useIsMobile()
  const [, navigate] = useLocation()
  const close = useProfileUi((s) => s.close)

  if (!isMobile) return null

  return (
    <button
      type="button"
      onClick={() => { close(); navigate(`/secret/${userId}`) }}
      className="w-full mt-2 mb-1 px-3 py-2 rounded-kd bg-kd-warm-bg border border-kd-warm-soft text-kd-warm flex items-center justify-center gap-2 text-[12px] font-mono font-semibold hover:bg-kd-warm hover:text-white transition-colors"
    >
      <Icon.Lock size={14} />
      начать секретный чат
    </button>
  )
}
