import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

const CYCLE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light'
  return mode
}

function apply(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset['theme'] = resolve(mode)
}

interface ThemeStore {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  cycleMode: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode(m) {
        apply(m)
        set({ mode: m })
      },
      cycleMode() {
        get().setMode(CYCLE[get().mode])
      },
    }),
    { name: 'kd:theme:mode' },
  ),
)

// Apply persisted/default theme on module load.
apply(useThemeStore.getState().mode)

// Hot-reload effective theme when the OS preference changes (only matters
// while we're in 'system' mode).
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') apply('system')
  })
}

export function effectiveTheme(mode: ThemeMode): EffectiveTheme {
  return resolve(mode)
}
