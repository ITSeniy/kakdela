// T-103 — баннеры состояния секретной сессии. Тёплая палитра токенов.
//   • establishing  — поднимаем PQXDH-сессию (нейтральный warm-баннер).
//   • protected     — системное «защищено E2EE, история только здесь».
//   • key-changed   — СИГНАЛ БЕЗОПАСНОСТИ: ключ собеседника сменился, отправка
//                     заблокирована до повторной верификации (kd-danger).
//   • device-bound  — онбординг-карточка при первом секретном чате (показ 1 раз).

import { Icon } from '../../components/Icon.js'

export function ProtectedBanner() {
  return (
    <div className="mx-4 my-2 px-3 py-2 rounded-kd bg-kd-panel-alt border border-kd-border flex items-center gap-2.5">
      <Icon.Lock size={14} className="text-kd-warm shrink-0" />
      <div className="text-[11px] text-kd-text-soft leading-snug">
        сообщения защищены сквозным шифрованием. история хранится только на этом устройстве.
      </div>
    </div>
  )
}

export function EstablishingBanner() {
  return (
    <div className="mx-4 my-2 px-3 py-2 rounded-kd bg-kd-warm-bg border border-kd-warm-soft flex items-center gap-2.5">
      <span className="w-2 h-2 rounded-full bg-kd-warm shrink-0 animate-pulse" />
      <div className="text-[11px] text-kd-text leading-snug font-mono">
        устанавливаем защищённое соединение…
      </div>
    </div>
  )
}

export function KeyChangedBanner({ name, onVerify }: { name: string; onVerify: () => void }) {
  return (
    <div className="mx-4 my-2 px-3 py-2.5 rounded-kd bg-kd-panel-alt border border-kd-danger flex items-start gap-2.5">
      <Icon.ShieldCheck size={16} className="text-kd-danger shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-kd-danger leading-snug">
          ключ безопасности {name} изменился
        </div>
        <div className="text-[11px] text-kd-text-soft leading-snug mt-0.5">
          возможно, {name} переустановил{' '}приложение. отправка заблокирована — сверьте код
          заново, прежде чем продолжить.
        </div>
        <button
          type="button"
          onClick={onVerify}
          className="mt-1.5 px-2.5 py-1 rounded bg-kd-danger text-white text-[11px] font-mono font-semibold hover:opacity-90"
        >
          проверить заново
        </button>
      </div>
    </div>
  )
}

export function DeviceBoundOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 my-2 p-3.5 rounded-kd bg-kd-warm-bg border border-kd-warm-soft">
      <div className="flex items-center gap-2 mb-1">
        <Icon.Lock size={15} className="text-kd-warm shrink-0" />
        <div className="text-[13px] font-bold text-kd-text">только на этом телефоне</div>
      </div>
      <div className="text-[11px] text-kd-text-soft leading-relaxed">
        переписка в секретном чате хранится зашифрованной только здесь и нигде не дублируется.
        потеряете устройство — история исчезнет. это сделано намеренно, ради приватности.
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 px-2.5 py-1 rounded bg-kd-warm text-white text-[11px] font-mono font-semibold hover:opacity-90"
      >
        понятно
      </button>
    </div>
  )
}
