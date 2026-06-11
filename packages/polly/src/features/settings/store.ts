import { create } from 'zustand'

export type ServerSettingsTab = 'general' | 'emoji' | 'invites' | 'audit'

interface ServerSettingsUiState {
  /** id сервера, чью админ-панель открыли. null — закрыто. */
  openServerId: string | null
  tab:          ServerSettingsTab
}

interface ServerSettingsUiActions {
  open(serverId: string, tab?: ServerSettingsTab): void
  close(): void
  setTab(tab: ServerSettingsTab): void
}

export const useServerSettingsUi = create<ServerSettingsUiState & ServerSettingsUiActions>()((set) => ({
  openServerId: null,
  tab:          'general',
  open(serverId, tab) { set({ openServerId: serverId, tab: tab ?? 'general' }) },
  close()             { set({ openServerId: null }) },
  setTab(tab)         { set({ tab }) },
}))
