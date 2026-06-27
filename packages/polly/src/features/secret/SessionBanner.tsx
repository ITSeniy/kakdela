// T-103 — баннеры состояния секретной сессии. Стиль 1:1 с
// designs/final-secret-chat.jsx (SessionStates) + системный баннер из
// SecretChatScreen. Тёплая палитра токенов.

import { Icon } from '../../components/Icon.js'

// Системный баннер «защищено E2EE» (всегда сверху установленного чата).
export function ProtectedBanner() {
  return (
    <div className="mx-4 mt-3 mb-1 px-3.5 py-3 rounded-kd bg-kd-panel-alt border border-kd-border flex items-start gap-3">
      <Icon.Lock size={16} className="text-kd-accent shrink-0 mt-px" />
      <div className="text-[12px] text-kd-text-soft leading-relaxed">
        сообщения защищены <b className="text-kd-accent-deep">сквозным шифрованием</b>. история
        хранится только на этом устройстве.
      </div>
    </div>
  )
}

// Установка PQXDH-сессии: спиннер + «обмен ключами · x3dh · double ratchet».
export function EstablishingBanner() {
  return (
    <div className="mx-4 my-3 px-4 py-4 rounded-kd bg-kd-panel-alt border border-kd-border flex items-center gap-3">
      <span className="w-[26px] h-[26px] rounded-full border-[2.5px] border-kd-panel-hi border-t-kd-accent animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-kd-text">устанавливаем защищённое соединение…</div>
        <div className="text-[11px] mt-0.5 font-mono flex items-center gap-1.5">
          <span className="text-kd-text-soft animate-pulse">обмен ключами</span>
          <span className="text-kd-accent">x3dh · double ratchet</span>
        </div>
      </div>
    </div>
  )
}

// Смена identity-ключа: СИГНАЛ БЕЗОПАСНОСТИ — отправка заблокирована до re-verify.
export function KeyChangedBanner({ name, onVerify }: { name: string; onVerify: () => void }) {
  return (
    <div
      className="mx-4 my-3 px-4 py-4 rounded-kd border border-kd-danger"
      style={{ backgroundColor: 'color-mix(in srgb, var(--kd-danger) 8%, transparent)' }}
    >
      <div className="flex items-start gap-3">
        <Icon.Alert size={20} className="text-kd-danger shrink-0 mt-px" />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-kd-danger leading-snug">
            ключ безопасности {name} изменился
          </div>
          <div className="text-[12px] text-kd-text-soft mt-1 leading-relaxed">
            возможно, {name} переустановил приложение. проверьте код заново, прежде чем продолжать.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 mt-3.5 pl-8">
        <button
          type="button"
          onClick={onVerify}
          className="px-4 py-2 rounded-kd bg-kd-danger text-white text-[13px] font-bold flex items-center gap-1.5 hover:opacity-90"
        >
          <Icon.ShieldCheck size={15} /> проверить
        </button>
        <span className="text-[10px] text-kd-danger font-mono flex items-center gap-1.5">
          <Icon.Lock size={10} /> отправка заблокирована
        </span>
      </div>
    </div>
  )
}

// Device-bound онбординг (показ один раз).
export function DeviceBoundOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 my-3 p-4 rounded-kd bg-kd-panel border border-kd-border flex flex-col gap-3">
      <div className="w-10 h-10 rounded-kd bg-kd-warm-bg flex items-center justify-center">
        <Icon.Lock size={20} className="text-kd-warm" />
      </div>
      <div>
        <div className="text-[15px] font-bold text-kd-text">это устройство — ваш единственный ключ</div>
        <div className="text-[13px] text-kd-text-soft mt-1.5 leading-relaxed">
          история секретных чатов хранится только здесь. потеряете телефон — переписка исчезнет.
          так задумано: её невозможно восстановить ни нам, ни кому-либо ещё.
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-kd-warm-deep">
          <span className="w-1.5 h-1.5 rounded-full bg-kd-warm" />
          device-bound · нет облачной копии
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-mono text-kd-text-soft hover:text-kd-text"
        >
          понятно
        </button>
      </div>
    </div>
  )
}
