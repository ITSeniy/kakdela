// Детерминированные палитры для аватаров и иконок серверов.
// Источник: designs/common.jsx (AVATAR_COLORS). Цвета сознательно не зависят
// от темы — это «личные» цвета сущностей, одинаковые в light/dark.

export const AVATAR_COLORS = [
  '#c96442', '#d68b6c', '#a87b56', '#7d9268',
  '#b88c4e', '#8d6e4d', '#c98870', '#9c7f5e',
] as const

export const SERVER_COLORS = [
  '#c96442', '#a55e26', '#7d9268', '#8a6e4d',
  '#7a6850', '#6e6856', '#b88c4e', '#9c7f5e',
] as const

function djb2(seed: string): number {
  let hash = 5381
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

export function pickAvatarColor(seed: string): string {
  return AVATAR_COLORS[djb2(seed) % AVATAR_COLORS.length]!
}

export function pickServerColor(seed: string): string {
  return SERVER_COLORS[djb2(seed) % SERVER_COLORS.length]!
}
