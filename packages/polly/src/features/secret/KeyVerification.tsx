// T-103 — сверка ключей (safety number), стиль 1:1 с
// designs/final-secret-chat.jsx (KeyVerification): контакт-аватар + пояснение,
// панель с mono-кодом 60 цифр (12 групп по 5, 18px), QR-плейсхолдер и
// полноширинная кнопка «отметить проверенным». Symmetric (T-101), флаг «проверено»
// хранится локально (device-bound).

import { useMemo } from 'react'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { Modal } from '../../components/Modal.js'

// 60 цифр → 12 групп по 5.
function groupSafetyNumber(sn: string): string[] {
  const groups: string[] = []
  for (let i = 0; i < sn.length; i += 5) groups.push(sn.slice(i, i + 5))
  return groups
}

interface KeyVerificationProps {
  peerName: string
  peerAvatarUrl?: string | null
  safetyNumber: string | null
  verified: boolean
  onMarkVerified: () => void
  onClose: () => void
}

export function KeyVerification({
  peerName, peerAvatarUrl, safetyNumber, verified, onMarkVerified, onClose,
}: KeyVerificationProps) {
  const groups = useMemo(() => (safetyNumber ? groupSafetyNumber(safetyNumber) : []), [safetyNumber])
  const firstName = peerName.split(' ')[0] || peerName

  return (
    <Modal onClose={onClose} width={393}>
      {/* шапка */}
      <div className="px-3.5 py-2.5 border-b border-kd-border bg-kd-panel-alt flex items-center gap-2.5">
        <button type="button" onClick={onClose} title="назад" className="text-kd-text-soft hover:text-kd-text p-0.5">
          <Icon.ArrowLeft size={22} />
        </button>
        <span className="text-[15px] font-bold text-kd-text">сверка ключей</span>
      </div>

      <div className="px-[18px] pt-[18px] pb-3">
        {/* контакт */}
        <div className="flex flex-col items-center gap-2">
          <Avatar name={peerName} avatarUrl={peerAvatarUrl ?? null} size={56} />
          <div className="text-[15px] font-bold text-kd-text">{peerName}</div>
          <div className="text-[12px] text-kd-text-soft text-center leading-relaxed max-w-[280px]">
            сравните этот код с <b className="text-kd-text">{firstName}</b> лично или по видеосвязи.
            совпал — значит чат защищён.
          </div>
        </div>

        {/* safety number */}
        <div className="mt-[18px] bg-kd-panel border border-kd-border rounded-kd px-4 py-[18px]">
          <div className="text-[9px] font-mono text-kd-text-mute tracking-[0.08em] uppercase mb-3 flex items-center gap-1.5">
            <Icon.Lock size={10} /> код безопасности · 60 цифр
          </div>
          {safetyNumber ? (
            <div className="grid grid-cols-3 gap-y-3 gap-x-2 justify-items-center select-all">
              {groups.map((g, i) => (
                <span key={i} className="font-mono text-[18px] font-semibold text-kd-text tracking-[0.06em]">{g}</span>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-kd-text-mute font-mono text-[11px]">
              код появится после установки защищённого соединения…
            </div>
          )}
        </div>

        {/* QR-плейсхолдер (полноценная QR-сверка — позже) */}
        <div className="mt-3.5 flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-kd shrink-0 border border-kd-border flex items-center justify-center"
            style={{ background: 'repeating-linear-gradient(45deg, var(--kd-panel-hi), var(--kd-panel-hi) 4px, var(--kd-panel-alt) 4px, var(--kd-panel-alt) 8px)' }}
          >
            <span className="font-mono text-[8px] text-kd-text-mute">QR</span>
          </div>
          <div className="text-[11px] text-kd-text-mute leading-relaxed font-mono">
            или поднесите камеры друг к другу —<br />QR сверит код автоматически
          </div>
        </div>
      </div>

      {/* действие */}
      <div className="px-[18px] pb-[18px]">
        {verified ? (
          <div className="py-3 rounded-kd bg-kd-panel-alt border border-kd-border text-[13px] font-mono text-kd-online text-center flex items-center justify-center gap-2">
            <Icon.Check size={14} /> ключ {firstName} проверен
          </div>
        ) : (
          <button
            type="button"
            onClick={onMarkVerified}
            disabled={!safetyNumber}
            className="w-full py-3 rounded-kd bg-kd-accent text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-kd-accent-deep disabled:opacity-50"
          >
            <Icon.ShieldCheck size={17} /> отметить проверенным
          </button>
        )}
      </div>
    </Modal>
  )
}
