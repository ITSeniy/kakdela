import { create } from 'zustand'

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

interface RealtimeState {
  status: RealtimeStatus
  latency: number | null
}

interface RealtimeActions {
  setStatus(s: RealtimeStatus): void
  setLatency(l: number | null): void
}

export const useRealtimeStore = create<RealtimeState & RealtimeActions>()((set) => ({
  status: 'disconnected',
  latency: null,
  setStatus: (s) => set({ status: s }),
  setLatency: (l) => set({ latency: l }),
}))
