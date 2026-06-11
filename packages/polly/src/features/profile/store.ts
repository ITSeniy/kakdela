import { create } from 'zustand'

interface ProfileUiState {
  /** userId of currently open profile, or null if modal is closed. */
  openUserId: string | null
  /** Edit-mode is only meaningful when openUserId === current user. */
  editing: boolean
}

interface ProfileUiActions {
  open(userId: string): void
  close(): void
  setEditing(editing: boolean): void
}

export const useProfileUi = create<ProfileUiState & ProfileUiActions>()((set) => ({
  openUserId: null,
  editing: false,
  open(userId) { set({ openUserId: userId, editing: false }) },
  close() { set({ openUserId: null, editing: false }) },
  setEditing(editing) { set({ editing }) },
}))
