// Форматтеры списков переписок. Вынесены из DmList.tsx, чтобы переиспользовать
// в мобильном списке чатов (MobileDmList) без дублирования.

/** Относительное время последнего сообщения: «сейчас» / «28м» / «1ч» / «вчера» / «3дн» / «14.06». */
export function fmtWhen(iso: string | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'сейчас'
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}м`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}ч`
  const days = Math.round(ms / 86_400_000)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days}дн`
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' })
}

/** Русская плюрализация: pluralRu(n, 'переписка', 'переписки', 'переписок'). */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
