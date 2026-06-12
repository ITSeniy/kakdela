// Страница «клавиши»: справочник горячих клавиш приложения. Перенастройка
// есть только у push-to-talk (живёт в «голос и видео»).

import { describeKey, useVoiceInputSettings } from '../voice/inputSettings.js'

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

export function ShortcutsSettings() {
  const inputMode = useVoiceInputSettings((s) => s.inputMode)
  const pttKey = useVoiceInputSettings((s) => s.pttKey)

  return (
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
  )
}
