import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Preset выбирается пользователем. На VPS с 2 vCPU и домашнем 50 Mbps upload
 * пять одновременных 1080p30 (3 Mbps × 5 = 15 Mbps) — впритык; поэтому дефолт
 * '720p30' (1.5 Mbps × 5 = 7.5 Mbps). 'auto' — публикуем simulcast layers,
 * SFU сам решает, что отдавать каждому зрителю.
 */
export type ScreenQuality = 'auto' | '1080p30' | '720p30' | '720p15'

export const SCREEN_QUALITY_LABELS: Readonly<Record<ScreenQuality, string>> = {
  auto: 'авто',
  '1080p30': '1080p · 30',
  '720p30': '720p · 30',
  '720p15': '720p · 15',
}

export const SCREEN_QUALITY_ORDER: readonly ScreenQuality[] = [
  'auto',
  '1080p30',
  '720p30',
  '720p15',
]

interface ScreenShareSettingsState {
  /**
   * Включать ли захват системного звука вместе с экраном. Default true —
   * это критично для демо игр / YouTube. UI делает toggle disabled, если
   * платформа звук не отдаёт (см. `audioCaptureSupported`).
   */
  withAudio: boolean
  /**
   * Поддерживает ли платформа захват системного звука. `null` = ещё не
   * проверяли (первый запуск); `true` / `false` — кэш результата первой
   * успешной публикации. Кэш переживает рестарты, чтобы UI на «холодном»
   * входе сразу показал корректное состояние toggle'а, не дожидаясь второго
   * запуска screen share.
   *
   * T-050a — это и есть задача, в рамках которой мы выясняем реальное
   * поведение WebView2 на Win10/11. Записывается из `useScreenShare` после
   * каждой попытки startShare({ withAudio: true }).
   */
  audioCaptureSupported: boolean | null
  /**
   * Выбранный preset качества screen share. Применяется при каждом startShare
   * и при «restart» в случае смены на лету.
   */
  screenQuality: ScreenQuality
}

interface ScreenShareSettingsActions {
  setWithAudio(v: boolean): void
  setAudioCaptureSupported(v: boolean): void
  setScreenQuality(q: ScreenQuality): void
}

export const useScreenShareSettings = create<
  ScreenShareSettingsState & ScreenShareSettingsActions
>()(
  persist(
    (set) => ({
      withAudio: true,
      audioCaptureSupported: null,
      screenQuality: '720p30',
      setWithAudio(v) {
        set({ withAudio: v })
      },
      setAudioCaptureSupported(v) {
        set({ audioCaptureSupported: v })
      },
      setScreenQuality(q) {
        set({ screenQuality: q })
      },
    }),
    { name: 'kd:voice:screen-share' },
  ),
)
