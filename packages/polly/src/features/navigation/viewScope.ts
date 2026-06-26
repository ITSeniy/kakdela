// Область поиска/входящих: иконки в шапке канала открывают /search и /inbox,
// ограниченные текущим сервером (дубликаты глобальных кнопок в рельсе, но
// «в пределах данного сервера»). Глобальные кнопки рельсы сбрасывают scope.
// Живёт в памяти — это сиюминутный фильтр текущего экрана, не настройка.

import { create } from 'zustand'

interface ViewScopeState {
  serverId: string | null
  serverName: string | null
  setScope(serverId: string, serverName: string): void
  clear(): void
}

export const useViewScope = create<ViewScopeState>((set) => ({
  serverId: null,
  serverName: null,
  setScope: (serverId, serverName) => set({ serverId, serverName }),
  clear: () => set({ serverId: null, serverName: null }),
}))
