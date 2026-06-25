// Глобальное состояние диалога пересыла: контекст-меню сообщения вызывает
// open(message), сам диалог (<ForwardDialog/> в App) читает message. Так не
// нужно пробрасывать диалог через MessageList/DmBubbleList.

import { create } from 'zustand'

import type { Message } from '@kakdela/ginzu/api-types'

interface ForwardUi {
  message: Message | null
  open(message: Message): void
  close(): void
}

export const useForwardUi = create<ForwardUi>((set) => ({
  message: null,
  open: (message) => set({ message }),
  close: () => set({ message: null }),
}))
