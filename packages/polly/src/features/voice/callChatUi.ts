// Состояние панели «чат звонка»: видимость и ширина (ресайз за левую
// кромку, как в Discord). Персистится — раз настроил ширину, она твоя.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const CALL_CHAT_MIN_W = 280
export const CALL_CHAT_MAX_W = 560
export const CALL_CHAT_DEFAULT_W = 340

interface CallChatUi {
  open: boolean
  width: number
  setOpen(open: boolean): void
  toggle(): void
  setWidth(width: number): void
}

export const useCallChatUi = create<CallChatUi>()(
  persist(
    (set) => ({
      open: true,
      width: CALL_CHAT_DEFAULT_W,
      setOpen: (open) => set({ open }),
      toggle: () => set((s) => ({ open: !s.open })),
      setWidth: (width) =>
        set({ width: Math.min(CALL_CHAT_MAX_W, Math.max(CALL_CHAT_MIN_W, Math.round(width))) }),
    }),
    { name: 'kd:voice:chat-ui' },
  ),
)
