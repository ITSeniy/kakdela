// Выбор часового пояса (IANA): для «у него сейчас 11:24» в карточке профиля.
// Список — из Intl.supportedValuesOf, с фолбэком на ходовые пояса СНГ.

const FALLBACK_TZ = [
  'Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg',
  'Asia/Omsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Yakutsk',
  'Asia/Vladivostok', 'Asia/Magadan', 'Asia/Kamchatka',
  'Europe/Minsk', 'Europe/Kyiv', 'Asia/Almaty', 'Asia/Tbilisi', 'Asia/Yerevan',
  'UTC',
]

function allTimezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] }
  try {
    return intl.supportedValuesOf?.('timeZone') ?? FALLBACK_TZ
  } catch {
    return FALLBACK_TZ
  }
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function timeIn(tz: string): string | null {
  try {
    return new Date().toLocaleTimeString('ru', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

interface TimezoneSelectProps {
  /** null — пояс не указан. */
  value: string | null
  onChange(tz: string | null): void
}

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  const now = value ? timeIn(value) : null
  return (
    <div className="flex items-center gap-2.5">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 rounded-kd bg-kd-bg border border-kd-border text-[13px] text-kd-text outline-none focus:border-kd-accent font-mono"
      >
        <option value="">не указывать</option>
        {allTimezones().map((tz) => (
          <option key={tz} value={tz}>{tz}</option>
        ))}
      </select>
      {now && (
        <span className="text-[11px] font-mono text-kd-text-mute shrink-0" title="сейчас там">
          сейчас {now}
        </span>
      )}
    </div>
  )
}
