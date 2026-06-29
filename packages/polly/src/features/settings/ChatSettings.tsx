// Страница «чат»: поведение композера и ленты + приватность. Всё локальное
// (useChatPrefs), сервер о настройках не знает.

import { Field } from '../../components/form/Field.js'
import { Toggle } from '../../components/form/Toggle.js'
import {
  IDLE_PRESETS,
  useChatPrefs,
  type SendKey,
  type TimeFormat,
} from './chatPrefs.js'

interface SegOption<T extends string | number> {
  value: T
  label: string
  hint?: string
}

/** Сегмент-переключатель в духе блоков «плотность»/«масштаб». */
function Segmented<T extends string | number>({
  value, options, onChange, ariaLabel,
}: {
  value: T
  options: SegOption<T>[]
  onChange(v: T): void
  ariaLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex bg-kd-panel border border-kd-border rounded-kd p-[3px] gap-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 px-2.5 py-2 rounded text-center transition-colors',
              active ? 'bg-kd-panel-hi' : 'hover:bg-kd-panel-soft',
            ].join(' ')}
          >
            <div className={`text-[12px] font-semibold ${active ? 'text-kd-text' : 'text-kd-text-soft'}`}>
              {opt.label}
            </div>
            {opt.hint && <div className="text-[10px] font-mono text-kd-text-mute mt-0.5">{opt.hint}</div>}
          </button>
        )
      })}
    </div>
  )
}

export function ChatSettings() {
  const sendKey = useChatPrefs((s) => s.sendKey)
  const timeFormat = useChatPrefs((s) => s.timeFormat)
  const autoplayGifs = useChatPrefs((s) => s.autoplayGifs)
  const showLinkPreviews = useChatPrefs((s) => s.showLinkPreviews)
  const sendTyping = useChatPrefs((s) => s.sendTyping)
  const showTyping = useChatPrefs((s) => s.showTyping)
  const idleAfterMin = useChatPrefs((s) => s.idleAfterMin)
  const setSendKey = useChatPrefs((s) => s.setSendKey)
  const setTimeFormat = useChatPrefs((s) => s.setTimeFormat)
  const setAutoplayGifs = useChatPrefs((s) => s.setAutoplayGifs)
  const setShowLinkPreviews = useChatPrefs((s) => s.setShowLinkPreviews)
  const setSendTyping = useChatPrefs((s) => s.setSendTyping)
  const setShowTyping = useChatPrefs((s) => s.setShowTyping)
  const setIdleAfterMin = useChatPrefs((s) => s.setIdleAfterMin)

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="отправка" hint="как клавиша Enter ведёт себя в поле сообщения">
        <Segmented<SendKey>
          ariaLabel="клавиша отправки"
          value={sendKey}
          onChange={setSendKey}
          options={[
            { value: 'enter',      label: 'Enter',      hint: 'shift+⏎ — перенос' },
            { value: 'ctrl-enter', label: 'Ctrl+Enter', hint: '⏎ — перенос' },
          ]}
        />
      </Field>

      <Field label="формат времени" hint="у меток времени сообщений">
        <Segmented<TimeFormat>
          ariaLabel="формат времени"
          value={timeFormat}
          onChange={setTimeFormat}
          options={[
            { value: '24h', label: '24 часа', hint: '14:30' },
            { value: '12h', label: '12 часов', hint: '2:30 PM' },
          ]}
        />
      </Field>

      <Field label="лента">
        <Toggle
          on={autoplayGifs}
          onChange={setAutoplayGifs}
          label="автопроигрывание GIF"
          hint="гифки оживают сами; иначе показываем кадр — клик открывает"
        />
        <Toggle
          on={showLinkPreviews}
          onChange={setShowLinkPreviews}
          label="превью ссылок"
          hint="карточки с заголовком и картинкой под ссылками"
        />
      </Field>

      <Field label="приватность" hint="что видят другие и как ведёт себя статус">
        <Toggle
          on={sendTyping}
          onChange={setSendTyping}
          label="показывать, что я печатаю"
          hint="другие видят «вы печатаете…»; выключите, чтобы не отправлять"
        />
        <Toggle
          on={showTyping}
          onChange={setShowTyping}
          label="показывать, кто печатает"
          hint="индикатор «кто-то печатает…» у поля ввода"
        />
      </Field>

      <Field label="авто-«отошёл»" hint="через сколько без активности статус станет «отошёл»">
        <Segmented<number>
          ariaLabel="таймаут авто-отошёл"
          value={idleAfterMin}
          onChange={setIdleAfterMin}
          options={IDLE_PRESETS.map((p) => ({ value: p.min, label: p.label }))}
        />
      </Field>

      <div className="px-3.5 py-3 bg-kd-warm-bg border border-kd-warm-soft rounded-kd text-[12px] text-kd-text flex items-center gap-2.5">
        <span className="text-[18px]">🌿</span>
        <span>настройки чата сохраняются на этом устройстве.</span>
      </div>
    </div>
  )
}
