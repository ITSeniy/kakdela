import { create } from 'zustand'

export type ServerCreateJoinView = 'create' | 'join' | null

interface ServerCreateJoinState {
  view: ServerCreateJoinView
  /** Опциональный initial-код, если открыли через какую-нибудь deep-link. */
  initialInviteCode: string
}

interface ServerCreateJoinActions {
  openCreate(): void
  openJoin(initialCode?: string): void
  close(): void
}

export const useServerCreateJoinUi = create<ServerCreateJoinState & ServerCreateJoinActions>()((set) => ({
  view: null,
  initialInviteCode: '',
  openCreate()                { set({ view: 'create', initialInviteCode: '' }) },
  openJoin(initialCode = '')  { set({ view: 'join', initialInviteCode: initialCode }) },
  close()                     { set({ view: null, initialInviteCode: '' }) },
}))
