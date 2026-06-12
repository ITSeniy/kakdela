// Страница «уведомления»: гейты нативных уведомлений ОС. Бейдж в трее и
// инбокс продолжают работать всегда — выключаются только всплывашки.

import { Field } from '../../components/form/Field.js'
import { Toggle } from '../../components/form/Toggle.js'
import { useNotifyPrefs } from '../notify/prefs.js'

export function NotificationSettings() {
  const mentions = useNotifyPrefs((s) => s.mentions)
  const dms = useNotifyPrefs((s) => s.dms)
  const setMentions = useNotifyPrefs((s) => s.setMentions)
  const setDms = useNotifyPrefs((s) => s.setDms)

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
          hint="когда кто-то начинает с вами личный диалог"
        />
      </Field>

      <div className="px-3.5 py-3 bg-kd-panel border border-kd-border rounded-kd text-[11px] text-kd-text-soft leading-relaxed">
        счётчик непрочитанного в трее и инбокс работают независимо от этих
        переключателей — здесь выключаются только всплывающие уведомления.
        не чаще одного уведомления в минуту на канал.
      </div>
    </div>
  )
}
