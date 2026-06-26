// «Недавнее» для командной палитры: последние посещённые каналы и личные чаты.
// Храним только идентификаторы (имена/иконки палитра резолвит из уже
// загруженных server-detail и dm-list) — персистим, чтобы пережить перезапуск.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentEntry {
  kind: 'channel' | 'dm'
  id: string
  /** Для канала — сервер, чтобы построить ссылку без обхода всех серверов. */
  serverId?: string
}

const MAX_RECENTS = 8

interface RecentsState {
  entries: RecentEntry[]
  push(entry: RecentEntry): void
}

export const useRecents = create<RecentsState>()(
  persist(
    (set) => ({
      entries: [],
      push: (entry) =>
        set((state) => {
          const rest = state.entries.filter((e) => !(e.kind === entry.kind && e.id === entry.id))
          return { entries: [entry, ...rest].slice(0, MAX_RECENTS) }
        }),
    }),
    { name: 'kd:recents' },
  ),
)
