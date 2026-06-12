// Локальные предпочтения нативных уведомлений. Гейтят триггеры в triggers.ts;
// tray-badge и инбокс работают всегда — выключаются только всплывашки ОС.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotifyPrefs {
  /** Уведомлять при @упоминании. */
  mentions: boolean
  /** Уведомлять о новых личных сообщениях. */
  dms: boolean
  setMentions(on: boolean): void
  setDms(on: boolean): void
}

export const useNotifyPrefs = create<NotifyPrefs>()(
  persist(
    (set) => ({
      mentions: true,
      dms: true,
      setMentions: (mentions) => set({ mentions }),
      setDms: (dms) => set({ dms }),
    }),
    { name: 'kd:notify:prefs' },
  ),
)
