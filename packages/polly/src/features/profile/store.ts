import { create } from 'zustand'

interface ProfileUiState {
  /** userId of currently open profile, or null if modal is closed. */
  openUserId: string | null
}

interface ProfileUiActions {
  open(userId: string): void
  close(): void
}

export const useProfileUi = create<ProfileUiState & ProfileUiActions>()((set) => ({
  openUserId: null,
  open(userId) { set({ openUserId: userId }) },
  close() { set({ openUserId: null }) },
}))
