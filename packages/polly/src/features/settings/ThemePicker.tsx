// Выбор темы: три карточки-превью (светлая/тёмная/системная).
// Источник паттерна: designs/final-settings.jsx (блок «тема»).

import { THEME_PREVIEW_PALETTES, ThemePreview } from '../../components/form/ThemePreview.js'
import { useThemeStore, type ThemeMode } from '../../lib/theme.js'

interface Option {
  mode: ThemeMode
  label: string
  hint: string
  palette: keyof typeof THEME_PREVIEW_PALETTES
}

const OPTIONS: Option[] = [
  { mode: 'light',  label: 'светлая',       hint: 'тёплый беж',   palette: 'light' },
  { mode: 'dark',   label: 'тёмная',        hint: 'ночная свеча', palette: 'dark' },
  // В эталоне системная карточка рисуется светлой палитрой с hint «auto».
  { mode: 'system', label: 'как у системы', hint: 'auto',         palette: 'light' },
]

export function ThemePicker() {
  const { mode, setMode } = useThemeStore()
  return (
    <div role="radiogroup" aria-label="тема" className="flex gap-2.5">
      {OPTIONS.map((opt) => (
        <ThemePreview
          key={opt.mode}
          colors={THEME_PREVIEW_PALETTES[opt.palette]}
          label={opt.label}
          hint={opt.hint}
          active={opt.mode === mode}
          onClick={() => setMode(opt.mode)}
        />
      ))}
    </div>
  )
}
