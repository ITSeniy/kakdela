// Страница «звуки»: тумблер, громкость, выбор пака и прослушивание
// каждого события.

import { Field } from '../../components/form/Field.js'
import { Slider } from '../../components/form/Slider.js'
import { Toggle } from '../../components/form/Toggle.js'
import {
  SOUND_EVENT_LABELS,
  SOUND_PACKS,
  playSound,
  useSoundSettings,
  type SoundEvent,
} from '../sounds/sounds.js'

const EVENT_ORDER = Object.keys(SOUND_EVENT_LABELS) as SoundEvent[]

export function SoundSettings() {
  const enabled = useSoundSettings((s) => s.enabled)
  const volume = useSoundSettings((s) => s.volume)
  const pack = useSoundSettings((s) => s.pack)
  const setEnabled = useSoundSettings((s) => s.setEnabled)
  const setVolume = useSoundSettings((s) => s.setVolume)
  const setPack = useSoundSettings((s) => s.setPack)

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="звуки интерфейса">
        <Toggle
          on={enabled}
          onChange={setEnabled}
          label="проигрывать звуки"
          hint="мьют, заходы в голосовые, стримы, уведомления"
        />
      </Field>

      <Field label="громкость">
        <Slider
          label="громкость звуков"
          display={`${Math.round(volume * 100)}%`}
          value={Math.round(volume * 100)}
          min={0}
          max={100}
          onChange={(v) => setVolume(v / 100)}
        />
      </Field>

      <Field label="пак звуков" hint="у каждого свой характер — послушай оба">
        <div role="radiogroup" className="flex bg-kd-panel border border-kd-border rounded-kd p-[3px] gap-0.5">
          {SOUND_PACKS.map((p) => {
            const active = p.id === pack
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setPack(p.id)
                  playSound('voice-join', { force: true, pack: p.id })
                }}
                className={[
                  'flex-1 px-2.5 py-2 rounded text-center transition-colors',
                  active ? 'bg-kd-panel-hi' : 'hover:bg-kd-panel-soft',
                ].join(' ')}
              >
                <div className={`text-[12px] font-semibold ${active ? 'text-kd-text' : 'text-kd-text-soft'}`}>
                  {p.label}
                </div>
                <div className="text-[10px] font-mono text-kd-text-mute mt-0.5">{p.hint}</div>
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="послушать" hint="клик — проиграть событие текущим паком">
        <div className="grid grid-cols-2 gap-1.5">
          {EVENT_ORDER.map((ev) => (
            <button
              key={ev}
              type="button"
              onClick={() => playSound(ev, { force: true })}
              className="flex items-center gap-2 px-3 py-2 rounded-kd bg-kd-panel border border-kd-border hover:bg-kd-panel-hi transition-colors text-left"
            >
              <span className="text-kd-accent text-[11px] shrink-0">▶</span>
              <span className="text-[12px] text-kd-text truncate">{SOUND_EVENT_LABELS[ev]}</span>
            </button>
          ))}
        </div>
      </Field>
    </div>
  )
}
