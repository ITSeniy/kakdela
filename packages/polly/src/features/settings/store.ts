import { create } from 'zustand'

// Страницы полноэкранных настроек (designs/final-settings.jsx → KD_SetNav).
// Группа «сервер» доступна, только когда настройки открыты с serverId.
export type SettingsPage =
  | 'server-overview'
  | 'server-emoji'
  | 'server-members'
  | 'server-roles'
  | 'server-invites'
  | 'server-audit'
  | 'profile'
  | 'notifications'
  | 'appearance'
  | 'voice'
  | 'sounds'
  | 'shortcuts'

interface SettingsUiState {
  isOpen: boolean
  page: SettingsPage
  /** Сервер, чья группа «сервер» показана в навигации. null — только аккаунт. */
  serverId: string | null
}

interface SettingsUiActions {
  open(page?: SettingsPage, serverId?: string | null): void
  close(): void
  setPage(page: SettingsPage): void
}

export const useSettingsUi = create<SettingsUiState & SettingsUiActions>()((set) => ({
  isOpen: false,
  page: 'profile',
  serverId: null,
  // С serverId — серверные настройки (только группа «сервер»), без — личные.
  open(page, serverId) {
    set({ isOpen: true, page: page ?? 'profile', serverId: serverId ?? null })
  },
  close() { set({ isOpen: false }) },
  setPage(page) { set({ page }) },
}))
