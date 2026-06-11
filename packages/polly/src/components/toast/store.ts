// Состояние toast-уведомлений (T-092). Самописное, без sonner —
// дизайн тоста уже задан в designs/final-extras.jsx (FinalConnection).

import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  /** Кнопка действия («отменить» для undo-сценариев). */
  action?: { label: string; fn(): void }
  /** мс до автозакрытия. */
  duration: number
}

interface ToastState {
  items: ToastItem[]
  push(item: Omit<ToastItem, 'id'>): number
  dismiss(id: number): void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push(item) {
    const id = nextId++
    set((s) => ({ items: [...s.items, { ...item, id }] }))
    return id
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }))
  },
}))
