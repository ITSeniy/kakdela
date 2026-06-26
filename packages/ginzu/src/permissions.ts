// Система разрешений уровня сервера (как в Discord, без per-channel overwrites).
// Единый источник истины для бэкенда и клиента: и проверка прав на сервере,
// и подсветка/скрытие кнопок в UI считаются по одной и той же битовой маске.
//
// Маску храним числом (умещается в < 2^53; флагов сильно меньше 53). В БД —
// колонка bigint (mode:'number'); в API — обычное число.

export const Permissions = {
  /** Полный доступ — игнорирует все остальные проверки (как admin сейчас). */
  ADMINISTRATOR:   1 << 0,
  /** Переименовать сервер, иконка, общие настройки. */
  MANAGE_SERVER:   1 << 1,
  /** Создавать/редактировать/удалять/назначать роли (в пределах иерархии). */
  MANAGE_ROLES:    1 << 2,
  /** Создавать/редактировать/удалять каналы и категории. */
  MANAGE_CHANNELS: 1 << 3,
  /** Удалять чужие сообщения, закреплять/откреплять. */
  MANAGE_MESSAGES: 1 << 4,
  /** Загружать/удалять кастомные эмодзи. */
  MANAGE_EMOJI:    1 << 5,
  /** Создавать и отзывать приглашения. */
  MANAGE_INVITES:  1 << 6,
  /** Выгонять участников с сервера. */
  KICK_MEMBERS:    1 << 7,
  /** Использовать @everyone / @here. */
  MENTION_EVERYONE: 1 << 8,
  /** Просмотр журнала аудита. */
  VIEW_AUDIT_LOG:  1 << 9,
  /** Модерация голоса: mute/deafen/move/kick из голосового канала. */
  MUTE_MEMBERS:    1 << 10,
} as const

export type PermissionFlag = keyof typeof Permissions

/** Все флаги, объединённые в одну маску (для ADMINISTRATOR / owner). */
export const ALL_PERMISSIONS: number = Object.values(Permissions).reduce((acc, p) => acc | p, 0)

/** Дефолт базовой роли @everyone: никаких управляющих прав. */
export const DEFAULT_EVERYONE_PERMISSIONS = 0

/** Метки и описания для админ-UI (порядок — порядок отображения). */
export const PERMISSION_META: { flag: PermissionFlag; label: string; hint: string }[] = [
  { flag: 'ADMINISTRATOR',    label: 'администратор',      hint: 'полный доступ ко всему — выдавайте осторожно' },
  { flag: 'MANAGE_SERVER',    label: 'управление сервером', hint: 'название, иконка, настройки' },
  { flag: 'MANAGE_ROLES',     label: 'управление ролями',  hint: 'создавать роли и назначать их (ниже своей)' },
  { flag: 'MANAGE_CHANNELS',  label: 'управление каналами', hint: 'создавать, менять и удалять каналы' },
  { flag: 'MANAGE_MESSAGES',  label: 'управление сообщениями', hint: 'удалять чужие, закреплять' },
  { flag: 'MANAGE_EMOJI',     label: 'управление эмодзи',   hint: 'загружать и удалять эмодзи сервера' },
  { flag: 'MANAGE_INVITES',   label: 'приглашения',         hint: 'создавать и отзывать инвайты' },
  { flag: 'KICK_MEMBERS',     label: 'выгонять участников', hint: 'удалять участников с сервера' },
  { flag: 'MENTION_EVERYONE', label: 'упоминать всех',      hint: 'использовать @everyone и @here' },
  { flag: 'VIEW_AUDIT_LOG',   label: 'журнал аудита',       hint: 'смотреть историю действий админов' },
  { flag: 'MUTE_MEMBERS',     label: 'модерация голоса',    hint: 'заглушать и перемещать в голосовых' },
]

/** Есть ли у маски конкретное право (ADMINISTRATOR перекрывает любое). */
export function hasPermission(mask: number, flag: PermissionFlag): boolean {
  if ((mask & Permissions.ADMINISTRATOR) !== 0) return true
  return (mask & Permissions[flag]) !== 0
}

/** Очистить маску от неизвестных битов (на случай рассинхрона версий). */
export function sanitizePermissions(mask: number): number {
  return mask & ALL_PERMISSIONS
}
