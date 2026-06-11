import { useThemeStore, type ThemeMode } from '../lib/theme.js'

const TITLES: Record<ThemeMode, string> = {
  light:  'тема: светлая · клик → тёмная',
  dark:   'тема: тёмная · клик → системная',
  system: 'тема: системная · клик → светлая',
}

function SunIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MonitorIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function iconFor(mode: ThemeMode, size: number) {
  if (mode === 'light')  return <SunIcon     size={size} />
  if (mode === 'dark')   return <MoonIcon    size={size} />
  return <MonitorIcon size={size} />
}

interface ThemeToggleProps {
  size?: number
  className?: string
}

export function ThemeToggle({ size = 14, className }: ThemeToggleProps) {
  const { mode, cycleMode } = useThemeStore()
  return (
    <button
      type="button"
      onClick={cycleMode}
      title={TITLES[mode]}
      className={`inline-flex items-center justify-center text-kd-text-mute hover:text-kd-text-soft transition-colors ${className ?? ''}`}
    >
      {iconFor(mode, size)}
    </button>
  )
}
