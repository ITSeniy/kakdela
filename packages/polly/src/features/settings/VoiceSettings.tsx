import { useEffect, useRef, useState } from 'react'

import { Field } from '../../components/form/Field.js'
import { Toggle } from '../../components/form/Toggle.js'
import {
  describeKey,
  useVoiceInputSettings,
  type InputMode,
} from '../voice/inputSettings.js'
import { useNoiseSettings } from '../voice/noiseSettings.js'

interface ModeOption {
  mode: InputMode
  label: string
  hint: string
}

const MODES: ModeOption[] = [
  {
    mode: 'voice-activated',
    label: 'голосовая активация',
    hint: 'микрофон всегда слышит',
  },
  {
    mode: 'push-to-talk',
    label: 'push-to-talk',
    hint: 'говорите по клавише',
  },
]

// Игнорируемые клавиши при capture — иначе можно случайно повесить мик на
// Escape или Tab и заблокировать UI.
const RESERVED_KEYS = new Set(['Escape', 'Tab', 'Enter'])

function KeyCapture({
  current,
  onCancel,
  onConfirm,
}: {
  current: string
  onCancel(): void
  onConfirm(code: string): void
}) {
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.code === 'Escape') {
        ev.preventDefault()
        onCancel()
        return
      }
      if (RESERVED_KEYS.has(ev.code)) return
      ev.preventDefault()
      onConfirm(ev.code)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, onConfirm])

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-kd border border-kd-accent bg-kd-accent-soft">
      <span className="text-[11px] text-kd-text font-semibold">нажмите клавишу…</span>
      <span className="text-[10px] font-mono text-kd-text-mute">
        текущая: {describeKey(current)} · Esc — отмена
      </span>
    </div>
  )
}

export function VoiceSettings() {
  const inputMode = useVoiceInputSettings((s) => s.inputMode)
  const pttKey = useVoiceInputSettings((s) => s.pttKey)
  const setInputMode = useVoiceInputSettings((s) => s.setInputMode)
  const setPttKey = useVoiceInputSettings((s) => s.setPttKey)
  const noiseSuppression = useNoiseSettings((s) => s.noiseSuppression)
  const setNoiseSuppression = useNoiseSettings((s) => s.setNoiseSuppression)

  const [capturing, setCapturing] = useState(false)
  // Если режим вдруг сменился во время capture (например, через другую
  // вкладку — но даже sync-load) — закрываем capture, чтобы не лишний UI.
  const lastMode = useRef(inputMode)
  useEffect(() => {
    if (lastMode.current !== inputMode) {
      lastMode.current = inputMode
      setCapturing(false)
    }
  }, [inputMode])

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="режим микрофона" hint="как включается передача голоса">
        {/* сегмент-переключатель в духе блока «плотность» (designs/final-settings.jsx) */}
        <div
          role="radiogroup"
          aria-label="режим микрофона"
          className="flex bg-kd-panel border border-kd-border rounded-kd p-[3px] gap-0.5"
        >
          {MODES.map((opt) => {
            const active = opt.mode === inputMode
            return (
              <button
                key={opt.mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setInputMode(opt.mode)}
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
      </Field>

      <Field label="обработка микрофона">
        <Toggle
          on={noiseSuppression}
          onChange={setNoiseSuppression}
          label="шумоподавление"
          hint={noiseSuppression
            ? 'фильтруем кулер, клавиатуру и фоновое'
            : 'микрофон передаёт всё как есть'}
        />
      </Field>

      {inputMode === 'push-to-talk' && (
        <Field label="клавиша" hint="привязка к физической клавише (любая раскладка)">
          {capturing ? (
            <KeyCapture
              current={pttKey}
              onCancel={() => setCapturing(false)}
              onConfirm={(code) => {
                setPttKey(code)
                setCapturing(false)
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded border border-kd-border bg-kd-panel-alt font-mono text-[12px] text-kd-text">
                {describeKey(pttKey)}
              </kbd>
              <button
                type="button"
                onClick={() => setCapturing(true)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded border border-kd-border text-kd-text hover:bg-kd-panel-hi transition-colors"
              >
                изменить
              </button>
            </div>
          )}
        </Field>
      )}
    </div>
  )
}
