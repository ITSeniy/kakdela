import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client'

/**
 * Полные данные одного участника для рендера. Содержит и поля «лица»
 * (avatar / mute / speaking), и опциональный screen track — так VoiceScreen
 * может прокинуть один и тот же массив в `computeLayout`, не разделяя
 * руками «кто шарит» от «кто просто слушает».
 */
export interface TileData {
  userId: string
  displayName: string
  avatarUrl: string | null
  muted: boolean
  speaking: boolean
  isSelf: boolean
  screenTrack: LocalVideoTrack | RemoteVideoTrack | null
}

export interface FocusItem {
  userId: string
  displayName: string
  isSelf: boolean
  screenTrack: LocalVideoTrack | RemoteVideoTrack
}

/**
 * Театральный режим включается, как только хотя бы один участник шарит
 * экран. В этом режиме большие screen tile'ы — основной фокус, а ВСЕ
 * участники (включая шарящих) лежат в маленьком dock'е. Grid-режим —
 * наша обычная «сетка лиц», когда экранов нет.
 */
export type VoiceLayout =
  | { mode: 'grid'; focus: []; dock: TileData[] }
  | { mode: 'theater'; focus: FocusItem[]; dock: TileData[] }

export function computeLayout(
  tiles: readonly TileData[],
  pinnedScreenUserId: string | null,
): VoiceLayout {
  const screens: FocusItem[] = []
  for (const t of tiles) {
    if (t.screenTrack) {
      screens.push({
        userId: t.userId,
        displayName: t.displayName,
        isSelf: t.isSelf,
        screenTrack: t.screenTrack,
      })
    }
  }

  if (screens.length === 0) {
    return { mode: 'grid', focus: [], dock: [...tiles] }
  }

  // Если пин указывает на участника, который ещё шарит — оставляем в focus
  // только его. Если pinned ушёл или перестал шарить — пин неактивен (UI
  // должен в этот же тик его сбросить, но даже без этого мы тут не упадём
  // в пустой focus).
  const pinned = pinnedScreenUserId
    ? screens.find((s) => s.userId === pinnedScreenUserId)
    : null
  const focus = pinned ? [pinned] : screens

  return { mode: 'theater', focus, dock: [...tiles] }
}

/**
 * CSS-классы для focus-grid'а в театральном режиме. Высоту даёт родитель
 * (flex-1), мы только распределяем колонки.
 *
 * - 1 screen → 1 cell на всю ширину
 * - 2        → split 50/50
 * - 3-4      → 2×2
 * - 5+       → auto-fit с min 260px (примерно полполосы 1080p превью)
 */
export function focusGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1 grid-rows-1'
  if (count === 2) return 'grid-cols-2 grid-rows-1'
  if (count <= 4) return 'grid-cols-2 grid-rows-2'
  return ''
}

export function focusUsesAutoFit(count: number): boolean {
  return count >= 5
}
