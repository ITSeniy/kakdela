// Тёплый баннер-приветствие над лентой. Источник: designs/final-chat.jsx
// (KD_GreetingBanner): warm-bg плашка, ☕, bold-приветствие + mono-строка
// статистики, тёплая CTA-кнопка справа.

interface GreetingBannerProps {
  /** Имя пользователя — подставляется в приветствие. */
  userName?: string | undefined
  /** Mono-строка под приветствием (статистика / подсказка). */
  subtitle?: string
  /** Тёплая CTA-кнопка справа («наверстать ⏵», «написать ⏵»…). */
  cta?: { label: string; onClick: () => void }
  className?: string
}

function greetingByHour(): string {
  const h = new Date().getHours()
  if (h < 5) return 'доброй ночи'
  if (h < 12) return 'доброе утро'
  if (h < 18) return 'добрый день'
  return 'добрый вечер'
}

export function GreetingBanner({ userName, subtitle, cta, className }: GreetingBannerProps) {
  const greeting = userName
    ? `${greetingByHour()}, ${userName} · как ты сегодня?`
    : `${greetingByHour()} · как ты сегодня?`
  return (
    <div
      className={`mx-4 my-2 px-3.5 py-2.5 bg-kd-warm-bg border border-kd-warm-soft rounded-kd flex items-center gap-3 ${className ?? ''}`}
    >
      <div className="text-[22px] select-none" aria-hidden>☕</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-kd-text">{greeting}</div>
        {subtitle && (
          <div className="text-[11px] text-kd-text-soft font-mono mt-px truncate">{subtitle}</div>
        )}
      </div>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="px-2.5 py-1 bg-kd-warm text-white rounded text-[11px] font-semibold font-mono hover:bg-kd-warm-deep transition-colors shrink-0"
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}
