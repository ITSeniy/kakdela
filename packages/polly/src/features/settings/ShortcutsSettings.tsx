// Страница «клавиши»: настраиваемые бинды голосовых функций + справочник
// горячих клавиш приложения. Push-to-talk перенастраивается в «голос и видео».

import { useEffect, useState } from 'react'

import { Field } from '../../components/form/Field.js'
import { describeKey, useVoiceInputSettings } from '../voice/inputSettings.js'
import {
  HOTKEY_ACTIONS,
  useHotkeySettings,
  type HotkeyAction,
  type KeyBinding,
} from '../voice/hotkeys.js'

interface ShortcutRow {
  keys: string[]
  desc: string
}

const ROWS: ShortcutRow[] = [
  { keys: ['Ctrl', 'K'], desc: 'командная палитра — быстрый переход по каналам и людям' },
  { keys: ['Esc'], desc: 'закрыть окно, меню или эти настройки' },
  { keys: ['Enter'], desc: 'отправить сообщение' },
  { keys: ['Shift', 'Enter'], desc: 'новая строка в сообщении' },
  { keys: ['Shift', 'клик 🗑'], desc: 'удалить сообщение без подтверждения' },
  { keys: ['ПКМ'], desc: 'контекстное меню сообщения, канала или участника голосового' },
]

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1 shrink-0">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-kd-text-mute text-[10px]">+</span>}
          <kbd className="px-1.5 py-0.5 rounded border border-kd-border bg-kd-panel-alt font-mono text-[11px] text-kd-text">
            {k}
          </kbd>
        </span>
      ))}
    </span>
  )
}

function bindingKeys(b: KeyBinding): string[] {
  const keys: string[] = []
  if (b.ctrl) keys.push('Ctrl')
  if (b.alt) keys.push('Alt')
  if (b.shift) keys.push('Shift')
  keys.push(describeKey(b.code))
  return keys
}

// Esc — отмена записи, Tab/Enter зарезервированы UI. Голые модификаторы —
// это «ждём основную клавишу», не результат.
const RESERVED_CODES = new Set(['Escape', 'Tab', 'Enter'])
const MODIFIER_CODES = new Set([
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight',
])

function ComboCapture({
  onCancel,
  onConfirm,
}: {
  onCancel(): void
  onConfirm(b: KeyBinding): void
}) {
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      ev.preventDefault()
      // Не отдаём дальше — иначе Esc закроет и экран настроек под нами.
      ev.stopPropagation()
      if (ev.code === 'Escape') {
        onCancel()
        return
      }
      if (MODIFIER_CODES.has(ev.code)) return // ждём основную клавишу
      if (RESERVED_CODES.has(ev.code)) return
      onConfirm({ code: ev.code, ctrl: ev.ctrlKey, alt: ev.altKey, shift: ev.shiftKey })
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel, onConfirm])

  return (
    <span className="px-2 py-1 rounded-kd border border-kd-accent bg-kd-accent-soft text-[11px] font-semibold text-kd-text">
      нажмите сочетание… <span className="font-mono text-[10px] text-kd-text-mute">esc — отмена</span>
    </span>
  )
}

function BindRow({ action }: { action: { id: HotkeyAction; label: string; hint: string } }) {
  const binding = useHotkeySettings((s) => s.bindings[action.id] ?? null)
  const setBinding = useHotkeySettings((s) => s.setBinding)
  const [capturing, setCapturing] = useState(false)

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-kd bg-kd-panel border border-kd-border">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-kd-text">{action.label}</div>
        <div className="text-[10px] text-kd-text-mute">{action.hint}</div>
      </div>
      {capturing ? (
        <ComboCapture
          onCancel={() => setCapturing(false)}
          onConfirm={(b) => {
            setBinding(action.id, b)
            setCapturing(false)
          }}
        />
      ) : (
        <>
          {binding
            ? <Keys keys={bindingKeys(binding)} />
            : <span className="text-[11px] font-mono text-kd-text-mute">не назначено</span>}
          <button
            type="button"
            onClick={() => setCapturing(true)}
            className="px-2.5 py-1 rounded-kd border border-kd-border bg-kd-panel-alt hover:bg-kd-panel-hi transition-colors text-[11px] text-kd-text"
          >
            {binding ? 'изменить' : 'назначить'}
          </button>
          {binding && (
            <button
              type="button"
              onClick={() => setBinding(action.id, null)}
              title="сбросить бинд"
              className="px-2 py-1 rounded-kd text-[11px] text-kd-text-mute hover:text-kd-dnd transition-colors"
            >
              ✕
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function ShortcutsSettings() {
  const inputMode = useVoiceInputSettings((s) => s.inputMode)
  const pttKey = useVoiceInputSettings((s) => s.pttKey)

  return (
    <div className="flex flex-col gap-[18px]">
      <Field
        label="бинды голосовых функций"
        hint="в десктоп-клиенте работают глобально (даже при свёрнутом окне), в браузере — только при фокусе"
      >
        <div className="flex flex-col gap-1.5">
          {HOTKEY_ACTIONS.map((a) => <BindRow key={a.id} action={a} />)}
        </div>
      </Field>

      <Field label="клавиши приложения">
        <div className="flex flex-col gap-1.5">
          {ROWS.map((row) => (
            <div
              key={row.desc}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-kd bg-kd-panel border border-kd-border"
            >
              <Keys keys={row.keys} />
              <span className="flex-1 text-[12px] text-kd-text-soft text-right">{row.desc}</span>
            </div>
          ))}

          {inputMode === 'push-to-talk' && (
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-kd bg-kd-panel border border-kd-border">
              <Keys keys={[describeKey(pttKey)]} />
              <span className="flex-1 text-[12px] text-kd-text-soft text-right">
                push-to-talk · настраивается в «голос и видео»
              </span>
            </div>
          )}
        </div>
      </Field>
    </div>
  )
}
