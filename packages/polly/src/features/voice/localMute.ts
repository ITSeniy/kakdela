// Локальные мьюты: «не хочу слышать этого человека» — действует только на
// моём клиенте, персистится между сессиями. Применение громкости к живой
// комнате делает lib/livekit.ts (toggleLocalParticipantMute) — этот стор
// только источник истины «кто заглушен».

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocalMuteStore {
  mutedUserIds: string[]
  isMuted(userId: string): boolean
  setMuted(userId: string, muted: boolean): void
}

export const useLocalMute = create<LocalMuteStore>()(
  persist(
    (set, get) => ({
      mutedUserIds: [],
      isMuted: (userId) => get().mutedUserIds.includes(userId),
      setMuted: (userId, muted) =>
        set((s) => ({
          mutedUserIds: muted
            ? s.mutedUserIds.includes(userId) ? s.mutedUserIds : [...s.mutedUserIds, userId]
            : s.mutedUserIds.filter((id) => id !== userId),
        })),
    }),
    { name: 'kd:voice:local-mute' },
  ),
)
