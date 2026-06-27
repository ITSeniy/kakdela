// T-103 — верификация ключей: safety number в стиле Signal (60 цифр, группы по
// 5, mono-шрифт). Симметричен у обеих сторон (crypto_safety_number, T-101).
// Флаг «проверено» хранится локально (device-bound), на сервер не уходит.

import { useMemo } from 'react'

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
  safetyNumber: string | null
  verified: boolean
  onMarkVerified: () => void
  onClose: () => void
}

export function KeyVerification({
  peerName, safetyNumber, verified, onMarkVerified, onClose,
}: KeyVerificationProps) {
  const groups = useMemo(() => (safetyNumber ? groupSafetyNumber(safetyNumber) : []), [safetyNumber])

  return (
    <Modal onClose={onClose} width={400}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Icon.ShieldCheck size={18} className={verified ? 'text-kd-online' : 'text-kd-warm'} />
          <div className="text-[15px] font-bold text-kd-text">
            {verified ? 'ключ проверен' : 'проверка ключа'}
          </div>
        </div>
        <div className="text-[12px] text-kd-text-soft leading-relaxed mb-3">
          сравните этот код с <b className="text-kd-text">{peerName}</b> лично или по другому
          надёжному каналу. если коды совпадают — переписка защищена и её никто не читает.
        </div>

        {safetyNumber ? (
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 p-3.5 rounded-kd bg-kd-panel-alt border border-kd-border font-mono text-[15px] tracking-[0.08em] text-kd-text text-center select-all mb-4">
            {groups.map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-kd-text-mute font-mono text-[11px] mb-4">
            код появится после установки защищённого соединения…
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-[12px] font-mono text-kd-text-soft hover:text-kd-text"
          >
            закрыть
          </button>
          {!verified && safetyNumber && (
            <button
              type="button"
              onClick={onMarkVerified}
              className="px-3 py-1.5 rounded bg-kd-accent text-white text-[12px] font-mono font-semibold hover:bg-kd-accent-deep"
            >
              отметить проверенным
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
