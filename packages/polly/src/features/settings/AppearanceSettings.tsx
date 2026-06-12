// Страница «внешний вид» (designs/final-settings.jsx → FinalSettings).
// Тема, акцентный цвет, плотность сообщений, скругление углов.

import { Field } from '../../components/form/Field.js'
import { Slider } from '../../components/form/Slider.js'
import { Swatch } from '../../components/form/Swatch.js'
import { Toggle } from '../../components/form/Toggle.js'
import { ACCENTS, DEFAULT_RADIUS, useAppearance } from './appearance.js'
import { DensityPicker } from './DensityPicker.js'
import { ThemePicker } from './ThemePicker.js'

export function AppearanceSettings() {
  const accentId = useAppearance((s) => s.accentId)
  const radius = useAppearance((s) => s.radius)
  const hoverHighlight = useAppearance((s) => s.hoverHighlight)
  const setAccent = useAppearance((s) => s.setAccent)
  const setRadius = useAppearance((s) => s.setRadius)
  const setHoverHighlight = useAppearance((s) => s.setHoverHighlight)

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="тема" hint="следуем системе или фиксируем вручную">
        <ThemePicker />
      </Field>

      <Field label="акцентный цвет" hint="используется в активных каналах, кнопках и ссылках">
        <div role="radiogroup" aria-label="акцентный цвет" className="flex gap-3.5 flex-wrap">
          {ACCENTS.map((a) => (
            <Swatch
              key={a.id}
              color={a.color}
              label={a.label}
              active={a.id === accentId}
              onClick={() => setAccent(a.id)}
            />
          ))}
        </div>
      </Field>

      <Field label="плотность" hint="как близко друг к другу располагаются сообщения">
        <DensityPicker />
      </Field>

      <Field label="скругление углов" hint="0 — резкие, 12 — мягкие">
        <Slider
          label="радиус"
          display={`${radius} px`}
          value={radius}
          min={0}
          max={12}
          onChange={setRadius}
          hint={`по умолчанию для кнопок, аватаров, карточек${radius !== DEFAULT_RADIUS ? ` · стандарт ${DEFAULT_RADIUS}` : ''}`}
        />
      </Field>

      <Field label="прочее">
        <Toggle
          on={hoverHighlight}
          onChange={setHoverHighlight}
          label="подсветка при наведении"
          hint="заливка строки под курсором — в чате и списках голосовых"
        />
      </Field>

      <div className="px-3.5 py-3 bg-kd-warm-bg border border-kd-warm-soft rounded-kd text-[12px] text-kd-text flex items-center gap-2.5">
        <span className="text-[18px]">🌿</span>
        <span>настройки внешнего вида сохраняются на этом устройстве.</span>
      </div>
    </div>
  )
}
