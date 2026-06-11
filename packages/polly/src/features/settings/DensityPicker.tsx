// Переключатель плотности сообщений (designs/final-settings.jsx → блок
// «плотность»): сегменты в одну строку, активный — accent.

import { useChatDisplaySettings, type ChatDensity } from '../chat/displaySettings.js'

const OPTIONS: Array<{ value: ChatDensity; label: string; hint: string }> = [
  { value: 'cozy', label: 'уютно', hint: 'аватар у первого в группе' },
  { value: 'compact', label: 'компактно', hint: 'всё в одну строку' },
]

export function DensityPicker() {
  const density = useChatDisplaySettings((s) => s.density)
  const setDensity = useChatDisplaySettings((s) => s.setDensity)

  return (
    <div role="radiogroup" aria-label="плотность сообщений" className="grid grid-cols-2 gap-2">
      {OPTIONS.map((opt) => {
        const active = opt.value === density
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setDensity(opt.value)}
            className={[
              'px-3 py-2 rounded-kd border text-left transition-colors',
              active
                ? 'border-kd-accent bg-kd-accent text-white'
                : 'border-kd-border bg-kd-panel text-kd-text hover:bg-kd-panel-hi',
            ].join(' ')}
          >
            <div className="text-[12px] font-semibold">{opt.label}</div>
            <div className={`text-[10px] font-mono ${active ? 'text-white/75' : 'text-kd-text-mute'}`}>
              {opt.hint}
            </div>
          </button>
        )
      })}
    </div>
  )
}
