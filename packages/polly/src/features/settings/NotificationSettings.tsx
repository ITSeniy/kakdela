// Страница «уведомления»: гейты нативных уведомлений ОС. Бейдж в трее и
// инбокс продолжают работать всегда — выключаются только всплывашки.

import { useEffect, useState } from 'react'

import { Field } from '../../components/form/Field.js'
import { Toggle } from '../../components/form/Toggle.js'
import { notify, notifyPermissionState } from '../../lib/host/notify.js'
import { playSound } from '../sounds/sounds.js'
import { useNotifyPrefs } from '../notify/prefs.js'

type Perm = 'granted' | 'denied' | 'default'

const PERM_LABEL: Record<Perm, { text: string; cls: string }> = {
  granted: { text: '● разрешены системой',  cls: 'text-kd-online' },
  default: { text: '◐ ещё не запрашивались', cls: 'text-kd-idle' },
  denied:  { text: '● запрещены системой',   cls: 'text-kd-dnd' },
}

export function NotificationSettings() {
  const mentions = useNotifyPrefs((s) => s.mentions)
  const dms = useNotifyPrefs((s) => s.dms)
  const setMentions = useNotifyPrefs((s) => s.setMentions)
  const setDms = useNotifyPrefs((s) => s.setDms)

  const [perm, setPerm] = useState<Perm | null>(null)

  useEffect(() => {
    void notifyPermissionState().then(setPerm)
  }, [])

  async function sendTest() {
    playSound('notification', { force: true })
    await notify({
      title: 'проверка уведомлений',
      body:  'если вы это видите — всё работает',
      tag:   'kd-test',
    })
    // notify() мог по пути запросить permission — освежаем статус.
    void notifyPermissionState().then(setPerm)
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="нативные уведомления" hint="всплывашки ОС, когда окно не в фокусе или открыт другой канал">
        <Toggle
          on={mentions}
          onChange={setMentions}
          label="упоминания"
          hint="когда вас @упомянули в канале или треде"
        />
        <Toggle
          on={dms}
          onChange={setDms}
          label="личные сообщения"
          hint="новые сообщения и диалоги в личке"
        />
      </Field>

      <Field label="диагностика">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void sendTest()}
            className="px-3.5 py-2 rounded-kd bg-kd-panel border border-kd-border hover:bg-kd-panel-hi transition-colors text-[12px] font-semibold text-kd-text"
          >
            проверить уведомление
          </button>
          {perm && (
            <span className={`text-[10px] font-mono ${PERM_LABEL[perm].cls}`}>
              {PERM_LABEL[perm].text}
            </span>
          )}
        </div>
        {perm === 'denied' && (
          <div className="mt-2 text-[11px] text-kd-text-soft leading-relaxed">
            система блокирует уведомления приложения — включите их в
            настройках Windows (система → уведомления) или в настройках
            сайта браузера, затем перезапустите клиент.
          </div>
        )}
      </Field>

      <div className="px-3.5 py-3 bg-kd-panel border border-kd-border rounded-kd text-[11px] text-kd-text-soft leading-relaxed">
        счётчик непрочитанного в трее и инбокс работают независимо от этих
        переключателей — здесь выключаются только всплывающие уведомления.
        упоминания — не чаще раза в минуту на канал, личка — не чаще раза
        в десять секунд на диалог.
      </div>
    </div>
  )
}
