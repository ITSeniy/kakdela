// Строка-переключатель: title + hint слева, тумблер 36×20 справа.
// Источник паттерна: designs/final-settings.jsx (KD_Toggle).

interface ToggleProps {
  on: boolean
  onChange(next: boolean): void
  label: React.ReactNode
  hint?: React.ReactNode
  disabled?: boolean
  className?: string
}

export function Toggle({ on, onChange, label, hint, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={[
        'w-full flex items-center gap-3 px-3.5 py-2.5 bg-kd-panel border border-kd-border rounded-kd',
        'text-left transition-colors hover:border-kd-text-mute disabled:opacity-50 disabled:cursor-not-allowed',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-kd-text">{label}</div>
        {hint && <div className="text-[10px] text-kd-text-soft mt-0.5">{hint}</div>}
      </div>
      <div
        aria-hidden
        className={[
          'w-9 h-5 rounded-full p-0.5 shrink-0 transition-colors',
          on ? 'bg-kd-accent' : 'bg-kd-panel-hi',
        ].join(' ')}
      >
        <div
          className={[
            'w-4 h-4 rounded-full bg-white transition-transform',
            on ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </div>
    </button>
  )
}
