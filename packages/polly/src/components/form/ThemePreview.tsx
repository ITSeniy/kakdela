// Карточка превью темы: мини-layout (рельса + панель + строки текста) на
// цветах конкретной темы + radio с подписью и mono-hint.
// Источник паттерна: designs/final-settings.jsx (KD_ThemePreview).

export interface ThemePreviewColors {
  /** Фон мини-окна. */
  bg: string
  /** Рельса серверов слева. */
  rail: string
  /** Приглушённая строка-заголовок. */
  muted: string
  /** Обычные строки текста. */
  text: string
  /** Акцентная строка. */
  accent: string
}

/**
 * Палитры превью — фиксированные цвета тем из tokens.css. Превью обязано
 * показывать «чужую» тему независимо от активной, поэтому значения зашиты,
 * а не берутся из CSS-переменных.
 */
export const THEME_PREVIEW_PALETTES: Record<'light' | 'dark', ThemePreviewColors> = {
  light: { bg: '#e8e0cc', rail: '#ddd3bd', muted: '#8a7e64', text: '#2a2418', accent: '#c87a3a' },
  dark:  { bg: '#1a1610', rail: '#13100c', muted: '#7d6e54', text: '#e8ddc4', accent: '#e8a05c' },
}

interface ThemePreviewProps {
  colors: ThemePreviewColors
  label: string
  /** Подпись mono справа от label («тёплый беж», «auto»). */
  hint?: string
  active?: boolean
  onClick?(): void
  className?: string
}

export function ThemePreview({ colors, label, hint, active, onClick, className }: ThemePreviewProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active ?? false}
      onClick={onClick}
      className={[
        'flex-1 min-w-0 p-2.5 rounded-kd bg-kd-panel border-[1.5px] text-left cursor-pointer transition-colors',
        active ? 'border-kd-accent' : 'border-kd-border hover:border-kd-text-mute',
        className ?? '',
      ].join(' ')}
    >
      {/* мини-layout: цвета конкретной темы приходят пропом — инлайн легитимен */}
      <div className="h-20 rounded p-2 mb-2 flex gap-1.5 items-start" style={{ background: colors.bg }}>
        <div className="w-2 h-full rounded-[2px] shrink-0" style={{ background: colors.rail }} />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="h-[5px] rounded-[2px] w-[60%] opacity-60" style={{ background: colors.muted }} />
          <div className="h-[5px] rounded-[2px] w-[90%]" style={{ background: colors.text }} />
          <div className="h-[5px] rounded-[2px] w-[75%]" style={{ background: colors.text }} />
          <div className="h-[5px] rounded-[2px] w-[40%]" style={{ background: colors.accent }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={[
            'w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0',
            active ? 'border-kd-accent bg-kd-accent' : 'border-kd-text-mute',
          ].join(' ')}
        >
          {active && <span className="w-1 h-1 rounded-full bg-white" />}
        </span>
        <span className="text-[12px] font-semibold text-kd-text truncate">{label}</span>
        {hint && <span className="text-[10px] font-mono text-kd-text-mute ml-auto shrink-0">{hint}</span>}
      </div>
    </button>
  )
}
