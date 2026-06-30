// Запоминает, для каких каналов 18+ пользователь уже подтвердил вход —
// предупреждение показывается только при первом посещении. Локально, persisted.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NsfwGateState {
  accepted: Record<string, true>
  accept(channelId: string): void
}

export const useNsfwGate = create<NsfwGateState>()(
  persist(
    (set) => ({
      accepted: {},
      accept: (channelId) => set((s) => ({ accepted: { ...s.accepted, [channelId]: true } })),
    }),
    { name: 'kd:nsfw:accepted' },
  ),
)
