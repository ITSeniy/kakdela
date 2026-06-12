// Переключатель плотности сообщений (designs/final-settings.jsx → блок
// «плотность»): сегменты в общей панели, активный — panel-hi. Заливка
// акцентом здесь не используется: тёмный --kd-accent светлый (он для текста
// и обводок), и залитый им сегмент выглядит блёкло.

import { useChatDisplaySettings, type ChatDensity } from '../chat/displaySettings.js'

const OPTIONS: Array<{ value: ChatDensity; label: string; hint: string }> = [
  { value: 'cozy', label: 'уютно', hint: 'аватар у первого в группе' },
  { value: 'compact', label: 'компактно', hint: 'всё в одну строку' },
]

export function DensityPicker() {
  const density = useChatDisplaySettings((s) => s.density)
  const setDensity = useChatDisplaySettings((s) => s.setDensity)

  return (
    <div
      role="radiogroup"
      aria-label="плотность сообщений"
      className="flex bg-kd-panel border border-kd-border rounded-kd p-[3px] gap-0.5"
    >
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
              'flex-1 px-2.5 py-2 rounded text-center transition-colors',
              active ? 'bg-kd-panel-hi' : 'hover:bg-kd-panel-soft',
            ].join(' ')}
          >
            <div className={`text-[12px] font-semibold ${active ? 'text-kd-text' : 'text-kd-text-soft'}`}>
              {opt.label}
            </div>
            <div className="text-[10px] font-mono text-kd-text-mute mt-0.5">{opt.hint}</div>
          </button>
        )
      })}
    </div>
  )
}
