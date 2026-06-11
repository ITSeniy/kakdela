import { create } from 'zustand'

import type { User } from '@kakdela/ginzu'

export type AuthStatus = 'idle' | 'loading' | 'authed' | 'unauthed'

interface AuthState {
  user: User | null
  accessToken: string | null
  status: AuthStatus
}

interface AuthActions {
  setSession(user: User, accessToken: string): void
  clear(): void
  setStatus(s: AuthStatus): void
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  user: null,
  accessToken: null,
  status: 'idle',

  setSession(user, accessToken) {
    set({ user, accessToken, status: 'authed' })
  },

  clear() {
    set({ user: null, accessToken: null, status: 'unauthed' })
  },

  setStatus(status) {
    set({ status })
  },
}))
