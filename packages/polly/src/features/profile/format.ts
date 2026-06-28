// Форматтеры профиля. Вынесены из ProfileModal.tsx, чтобы переиспользовать в
// полноэкранном мобильном профиле (MobileProfileScreen).

// «с нами с осени 2023» — сезон читается теплее точного месяца.
export function fmtJoined(iso: string): string {
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const season = m <= 2 || m === 12 ? 'зимы' : m <= 5 ? 'весны' : m <= 8 ? 'лета' : 'осени'
  // Декабрьская зима относится к следующему году по ощущению, но год
  // оставляем календарный — «с зимы 2023» для 2023-12 читается верно.
  return `${season} ${d.getFullYear()}`
}

/** «МСК · 11:24» — короткое имя пояса + текущее время там. */
export function fmtTzNow(tz: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('ru', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).formatToParts(new Date())
    const get = (type: string) => parts.find((p) => p.type === type)?.value
    const hour = get('hour')
    const minute = get('minute')
    const name = get('timeZoneName')
    if (!hour || !minute) return null
    return `${name ?? tz} · ${hour}:${minute}`
  } catch {
    return null
  }
}
