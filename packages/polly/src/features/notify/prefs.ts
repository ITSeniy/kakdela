// Локальные предпочтения нативных уведомлений. Гейтят триггеры в triggers.ts;
// tray-badge и инбокс работают всегда — выключаются только всплывашки ОС.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotifyPrefs {
  /** Уведомлять при @упоминании. */
  mentions: boolean
  /** Уведомлять о новых личных сообщениях. */
  dms: boolean
  /** Серверы с подпиской «все сообщения»: serverId → true. По умолчанию для
      серверов приходят только упоминания; здесь — каждое сообщение. */
  serverAll: Record<string, boolean>
  setMentions(on: boolean): void
  setDms(on: boolean): void
  setServerAll(serverId: string, on: boolean): void
}

export const useNotifyPrefs = create<NotifyPrefs>()(
  persist(
    (set) => ({
      mentions: true,
      dms: true,
      serverAll: {},
      setMentions: (mentions) => set({ mentions }),
      setDms: (dms) => set({ dms }),
      setServerAll: (serverId, on) =>
        set((s) => {
          const next = { ...s.serverAll }
          if (on) next[serverId] = true
          else delete next[serverId]
          return { serverAll: next }
        }),
    }),
    { name: 'kd:notify:prefs' },
  ),
)
