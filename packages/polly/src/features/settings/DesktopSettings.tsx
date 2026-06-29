// Страница «приложение» (только в десктоп-клиенте): автозапуск, поведение окна,
// бейдж/мигание, keep-awake и разрешения ОС (уведомления + микрофон).

import { useEffect, useState } from 'react'

import { Field } from '../../components/form/Field.js'
import { Toggle } from '../../components/form/Toggle.js'
import { isAutostartEnabled, setAutostart } from '../../lib/host/desktop.js'
import { notify, notifyPermissionState } from '../../lib/host/notify.js'
import { openExternal } from '../../lib/host/shell.js'
import { useDesktopPrefs } from './desktopPrefs.js'

type PermState = 'granted' | 'denied' | 'default' | 'unknown'

const PERM_BADGE: Record<PermState, { text: string; cls: string }> = {
  granted: { text: '● разрешено',   cls: 'text-kd-online' },
  default: { text: '◐ не запрошено', cls: 'text-kd-idle' },
  denied:  { text: '● запрещено',   cls: 'text-kd-dnd' },
  unknown: { text: '○ неизвестно',  cls: 'text-kd-text-mute' },
}

function PermRow({
  label, state, onRequest, settingsUrl,
}: {
  label: string
  state: PermState
  onRequest: () => void
  settingsUrl: string
}) {
  const badge = PERM_BADGE[state]
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-kd-panel border border-kd-border rounded-kd">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-kd-text">{label}</div>
        <div className={`text-[10px] font-mono mt-0.5 ${badge.cls}`}>{badge.text}</div>
      </div>
      {state !== 'granted' && (
        <button
          type="button"
          onClick={onRequest}
          className="shrink-0 px-2.5 py-1.5 rounded text-[11px] font-semibold bg-kd-accent text-white hover:bg-kd-accent-deep transition-colors"
        >
          запросить
        </button>
      )}
      <button
        type="button"
        onClick={() => void openExternal(settingsUrl)}
        title="открыть настройки Windows"
        className="shrink-0 px-2.5 py-1.5 rounded text-[11px] font-semibold bg-kd-panel-alt border border-kd-border text-kd-text hover:bg-kd-panel-hi transition-colors"
      >
        Windows
      </button>
    </div>
  )
}

export function DesktopSettings() {
  const startMinimized = useDesktopPrefs((s) => s.startMinimized)
  const closeToTray = useDesktopPrefs((s) => s.closeToTray)
  const flashOnMention = useDesktopPrefs((s) => s.flashOnMention)
  const keepAwakeInCall = useDesktopPrefs((s) => s.keepAwakeInCall)
  const setStartMinimized = useDesktopPrefs((s) => s.setStartMinimized)
  const setCloseToTrayPref = useDesktopPrefs((s) => s.setCloseToTray)
  const setFlashOnMention = useDesktopPrefs((s) => s.setFlashOnMention)
  const setKeepAwakeInCall = useDesktopPrefs((s) => s.setKeepAwakeInCall)

  // Автозапуск — состояние в плагине (реестр), не в desktopPrefs.
  const [autostart, setAutostartState] = useState(false)
  useEffect(() => {
    void isAutostartEnabled().then(setAutostartState)
  }, [])
  async function toggleAutostart(on: boolean) {
    setAutostartState(on) // оптимистично
    await setAutostart(on)
    setAutostartState(await isAutostartEnabled())
  }

  // Разрешения ОС.
  const [notifPerm, setNotifPerm] = useState<PermState>('unknown')
  const [micPerm, setMicPerm] = useState<PermState>('unknown')

  async function refreshPerms() {
    setNotifPerm(await notifyPermissionState())
    try {
      const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName })
      // PermissionState даёт 'prompt' — приводим к нашему 'default'.
      if (status) setMicPerm(status.state === 'prompt' ? 'default' : status.state)
    } catch {
      setMicPerm('unknown')
    }
  }
  useEffect(() => {
    void refreshPerms()
  }, [])

  async function requestNotif() {
    await notify({ title: 'проверка уведомлений', body: 'если вы это видите — всё работает', tag: 'kd-test' })
    void refreshPerms()
  }
  async function requestMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch { /* отказ — статус обновим ниже */ }
    void refreshPerms()
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="запуск" hint="как приложение ведёт себя при входе в Windows">
        <Toggle
          on={autostart}
          onChange={(v) => void toggleAutostart(v)}
          label="запускать при входе в систему"
          hint="«какдела» стартует автоматически вместе с Windows"
        />
        <Toggle
          on={startMinimized}
          onChange={setStartMinimized}
          label="стартовать свёрнутым в трей"
          hint="при автозапуске окно не открывается — приложение сидит в трее"
        />
      </Field>

      <Field label="окно">
        <Toggle
          on={closeToTray}
          onChange={setCloseToTrayPref}
          label="сворачивать в трей при закрытии"
          hint={closeToTray
            ? 'крестик прячет окно; выход — через меню трея'
            : 'крестик закрывает приложение полностью'}
        />
      </Field>

      <Field label="внимание">
        <Toggle
          on={flashOnMention}
          onChange={setFlashOnMention}
          label="мигать таскбаром при упоминании"
          hint="иконка в панели задач мигнёт, когда вас упомянули вне фокуса"
        />
        <Toggle
          on={keepAwakeInCall}
          onChange={setKeepAwakeInCall}
          label="не давать ПК уснуть во время звонка"
          hint="экран и система не уходят в сон, пока вы в голосовом"
        />
      </Field>

      <Field label="разрешения" hint="что приложению позволяет Windows">
        <div className="flex flex-col gap-2">
          <PermRow
            label="уведомления"
            state={notifPerm}
            onRequest={() => void requestNotif()}
            settingsUrl="ms-settings:notifications"
          />
          <PermRow
            label="микрофон"
            state={micPerm}
            onRequest={() => void requestMic()}
            settingsUrl="ms-settings:privacy-microphone"
          />
        </div>
        <button
          type="button"
          onClick={() => void refreshPerms()}
          className="mt-2 text-[10px] font-mono text-kd-text-mute hover:text-kd-text transition-colors"
        >
          обновить статус
        </button>
      </Field>
    </div>
  )
}
