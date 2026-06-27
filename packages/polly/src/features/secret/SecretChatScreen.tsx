// T-103 — экран секретного чата. Шапка с замком и presence, системный баннер,
// пузыри из локальной истории (T-102), composer (только текст). Геометрия —
// как у DmScreen (designs/final-dm.jsx), плюс E2EE-аффордансы: верификация
// (safety number), баннер «ключ изменился» с блокировкой отправки, device-bound
// онбординг.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { MemberPublic } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { DayDivider } from '../../components/DayDivider.js'
import { Icon } from '../../components/Icon.js'
import { toast } from '../../components/toast/index.js'
import { cryptoClearSession, cryptoSafetyNumber } from '../../lib/host/crypto.js'
import type { StoredSecretMessage } from '../../lib/host/secret-store.js'
import { getUserProfile } from '../profile/api.js'
import {
  ensureSecretSession,
  fetchSecretMessages,
  requestSecretDrain,
  secretMessagesKey,
  sendReadReceipt,
  sendSecretText,
} from './api.js'
import { KeyVerification } from './KeyVerification.js'
import { SecretBubble } from './SecretBubble.js'
import {
  DeviceBoundOnboarding,
  EstablishingBanner,
  KeyChangedBanner,
  ProtectedBanner,
} from './SessionBanner.js'
import { useSecretSession } from './sessionStore.js'
import {
  clearVerified,
  getVerifiedSafetyNumber,
  hasSeenOnboarding,
  markOnboardingSeen,
  setVerifiedSafetyNumber,
} from './verifyStore.js'

const STATUS_LABEL: Record<MemberPublic['status'], string> = {
  online:  '● в сети',
  idle:    '◐ отошёл',
  dnd:     '● не беспокоить',
  offline: '○ не в сети',
}
const STATUS_COLOR: Record<MemberPublic['status'], string> = {
  online:  'text-kd-online',
  idle:    'text-kd-idle',
  dnd:     'text-kd-dnd',
  offline: 'text-kd-text-mute',
}

const TYPING_TTL_MS = 6000

function sameDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}
function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' })
}

export function SecretChatScreen({ peerUserId, onBack }: { peerUserId: string; onBack?: () => void }) {
  const queryClient = useQueryClient()
  const [establishing, setEstablishing] = useState(false)
  const [establishError, setEstablishError] = useState<string | null>(null)
  const [showVerify, setShowVerify] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const keyChanged = useSecretSession((s) => Boolean(s.keyChanged[peerUserId]))
  const clearKeyChanged = useSecretSession((s) => s.clearKeyChanged)
  const typingAt = useSecretSession((s) => s.typingAt[peerUserId] ?? 0)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const { data: profile } = useQuery({
    queryKey: ['user-profile', peerUserId],
    queryFn: () => getUserProfile(peerUserId),
    staleTime: 30_000,
  })
  const name = profile?.displayName ?? '…'
  const status = profile?.status ?? 'offline'

  const { data: messages = [] } = useQuery({
    queryKey: secretMessagesKey(peerUserId),
    queryFn: () => fetchSecretMessages(peerUserId),
    staleTime: 2_000,
  })

  // Safety number — только когда сессия есть. verified = совпадает с проверенным.
  const { data: safetyNumber = null } = useQuery({
    queryKey: ['secret-safety', peerUserId, messages.length, keyChanged],
    queryFn: () => cryptoSafetyNumber(peerUserId).catch(() => null),
    staleTime: 30_000,
  })
  const { data: verifiedSn = null } = useQuery({
    queryKey: ['secret-verified', peerUserId, safetyNumber],
    queryFn: () => getVerifiedSafetyNumber(peerUserId),
    staleTime: 30_000,
  })
  const verified = Boolean(safetyNumber && verifiedSn && safetyNumber === verifiedSn)

  // Установка сессии при входе (если ещё нет). Состояние «устанавливаем…».
  useEffect(() => {
    let cancelled = false
    setEstablishError(null)
    setEstablishing(true)
    ensureSecretSession(peerUserId)
      .then(() => { if (!cancelled) setEstablishing(false) })
      .catch((err: { code?: string; message?: string }) => {
        if (cancelled) return
        setEstablishing(false)
        setEstablishError(
          err?.code === 'keys-not-found'
            ? 'у собеседника ещё нет ключей для секретного чата'
            : 'не удалось установить защищённое соединение',
        )
      })
    return () => { cancelled = true }
  }, [peerUserId])

  // Device-bound онбординг — один раз за всё время.
  useEffect(() => {
    void hasSeenOnboarding().then((seen) => { if (!seen) setShowOnboarding(true) })
  }, [])

  // Read-receipt: при открытии/новых входящих сообщаем собеседнику «прочитал»
  // (его ✓✓ обновятся). Шлём по времени последнего входящего.
  const lastIncomingTs = useMemo(() => {
    let ts = 0
    for (const m of messages) if (m.direction === 'in' && m.sentAtMs > ts) ts = m.sentAtMs
    return ts
  }, [messages])
  useEffect(() => {
    if (lastIncomingTs > 0 && !keyChanged) {
      sendReadReceipt(peerUserId, lastIncomingTs).catch(() => { /* контрол не критичен */ })
    }
  }, [peerUserId, lastIncomingTs, keyChanged])

  // Тикаем раз в секунду, пока активен typing-индикатор (для авто-скрытия).
  const typingVisible = typingAt > 0 && nowTick - typingAt < TYPING_TTL_MS
  useEffect(() => {
    if (typingAt === 0) return undefined
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [typingAt])

  async function handleVerifyConfirm() {
    if (!safetyNumber) return
    await setVerifiedSafetyNumber(peerUserId, safetyNumber)
    void queryClient.invalidateQueries({ queryKey: ['secret-verified', peerUserId] })
    setShowVerify(false)
  }

  // Re-verify после смены ключа: забыть старую сессию/identity → переобработать
  // зависший prekey-конверт (TOFU примет новый ключ) → снять блок.
  async function handleReverify() {
    try {
      await clearVerified(peerUserId)
      await cryptoClearSession(peerUserId)
      clearKeyChanged(peerUserId)
      void queryClient.invalidateQueries({ queryKey: ['secret-verified', peerUserId] })
      requestSecretDrain()
      setShowVerify(true)
    } catch {
      toast.error('не удалось сбросить сессию')
    }
  }

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || keyChanged) return
    try {
      await sendSecretText(peerUserId, trimmed)
      void queryClient.invalidateQueries({ queryKey: secretMessagesKey(peerUserId) })
    } catch {
      toast.error('не удалось отправить')
    }
  }

  function dismissOnboarding() {
    setShowOnboarding(false)
    void markOnboardingSeen()
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-kd-bg">
      {/* шапка */}
      <div className="px-4 py-2 border-b border-kd-border bg-kd-panel-alt flex items-center gap-3 shrink-0">
        {onBack && (
          <button type="button" onClick={onBack} title="назад" className="-ml-1 shrink-0 text-kd-text-soft hover:text-kd-text transition-colors">
            <Icon.ArrowLeft size={22} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowVerify(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
          title="проверить ключ"
        >
          <Avatar name={name} avatarUrl={profile?.avatarUrl ?? null} size={30} status={status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon.Lock size={12} className="text-kd-warm shrink-0" />
              <span className="text-[13px] font-bold text-kd-text truncate">{name}</span>
              {verified && <Icon.ShieldCheck size={13} className="text-kd-online shrink-0" aria-label="ключ проверен" />}
            </div>
            <div className={`text-[10px] font-mono ${typingVisible ? 'text-kd-accent' : STATUS_COLOR[status]}`}>
              {typingVisible ? 'печатает…' : `секретный · ${STATUS_LABEL[status]}`}
            </div>
          </div>
        </button>
      </div>

      {/* лента */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        {showOnboarding && <DeviceBoundOnboarding onDismiss={dismissOnboarding} />}
        {keyChanged ? (
          <KeyChangedBanner name={name} onVerify={handleReverify} />
        ) : establishing ? (
          <EstablishingBanner />
        ) : (
          <ProtectedBanner />
        )}
        {establishError && !keyChanged && (
          <div className="mx-4 my-2 px-3 py-2 rounded-kd bg-kd-panel-alt border border-kd-danger text-[11px] text-kd-danger">
            {establishError}
          </div>
        )}
        <SecretMessageList messages={messages} />
      </div>

      {/* composer */}
      <SecretComposer name={name} disabled={keyChanged} onSend={handleSend} />

      {showVerify && (
        <KeyVerification
          peerName={name}
          safetyNumber={safetyNumber}
          verified={verified}
          onMarkVerified={handleVerifyConfirm}
          onClose={() => setShowVerify(false)}
        />
      )}
    </div>
  )
}

function SecretMessageList({ messages }: { messages: StoredSecretMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 gap-2 text-center">
        <div className="w-14 h-14 rounded-2xl bg-kd-warm-bg border border-dashed border-kd-warm text-kd-warm flex items-center justify-center">
          <Icon.Lock size={24} />
        </div>
        <div className="text-[14px] font-bold text-kd-text">секретный чат начат</div>
        <div className="text-[11px] text-kd-text-soft max-w-[280px]">
          напишите первое сообщение — оно уйдёт зашифрованным и осядет только на ваших устройствах.
        </div>
      </div>
    )
  }

  const rows: React.ReactNode[] = []
  let prevTs: number | null = null
  for (const m of messages) {
    if (prevTs === null || !sameDay(prevTs, m.sentAtMs)) {
      rows.push(<DayDivider key={`day-${m.id}`} label={formatDay(m.sentAtMs)} />)
    }
    rows.push(<SecretBubble key={m.id} message={m} />)
    prevTs = m.sentAtMs
  }
  return (
    <>
      {rows}
      <div ref={bottomRef} className="h-1" />
    </>
  )
}

function SecretComposer({ name, disabled, onSend }: { name: string; disabled: boolean; onSend: (text: string) => void }) {
  const [value, setValue] = useState('')
  const submit = () => {
    const v = value.trim()
    if (!v || disabled) return
    onSend(v)
    setValue('')
  }
  return (
    <div className="px-4 py-2.5 shrink-0 kd-safe-bottom">
      {disabled && (
        <div className="text-[10px] font-mono text-kd-danger mb-1 px-1">
          отправка заблокирована — сверьте ключ заново
        </div>
      )}
      <div className="bg-kd-panel rounded-kd px-3 py-1.5 flex items-center gap-2.5 border border-kd-border">
        <Icon.Lock size={14} className="text-kd-text-mute shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          disabled={disabled}
          placeholder={disabled ? 'сверьте ключ, чтобы продолжить' : `секретное сообщение для ${name}…`}
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-kd-text font-sans py-1 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          className="shrink-0 text-kd-accent disabled:text-kd-text-mute disabled:opacity-50 transition-colors"
          title="отправить"
        >
          <Icon.Send size={18} />
        </button>
      </div>
    </div>
  )
}
