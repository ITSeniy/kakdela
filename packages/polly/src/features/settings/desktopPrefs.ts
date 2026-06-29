// Десктоп-настройки (только Tauri-клиент), persisted локально. Автозапуск тут
// НЕ хранится — он живёт в плагине autostart (реестр), запрашивается через
// host/desktop. Здесь — поведение, которым управляет фронт.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DesktopPrefsState {
  /** Прятать окно в трей при автозапуске (--minimized). */
  startMinimized: boolean
  /** Закрытие окна сворачивает в трей (true) или завершает приложение (false). */
  closeToTray: boolean
  /** Мигать иконкой таскбара при упоминании без фокуса. */
  flashOnMention: boolean
  /** Не давать ПК уснуть во время голосового звонка. */
  keepAwakeInCall: boolean
  setStartMinimized(v: boolean): void
  setCloseToTray(v: boolean): void
  setFlashOnMention(v: boolean): void
  setKeepAwakeInCall(v: boolean): void
}

export const useDesktopPrefs = create<DesktopPrefsState>()(
  persist(
    (set) => ({
      startMinimized: true,
      closeToTray: true,
      flashOnMention: true,
      keepAwakeInCall: true,
      setStartMinimized: (startMinimized) => set({ startMinimized }),
      setCloseToTray: (closeToTray) => set({ closeToTray }),
      setFlashOnMention: (flashOnMention) => set({ flashOnMention }),
      setKeepAwakeInCall: (keepAwakeInCall) => set({ keepAwakeInCall }),
    }),
    { name: 'kd:desktop:prefs' },
  ),
)
