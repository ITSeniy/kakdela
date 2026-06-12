// Плотность отображения сообщений — как в Discord («Уютно» / «Компактно»).
// cozy: первое сообщение группы с аватаркой, продолжения — без аватарки
// и имени, время появляется на ховере. compact: все сообщения в одну
// строку, реплаи — с цитатой строкой выше.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ChatDensity = 'cozy' | 'compact'

interface ChatDisplayStore {
  density: ChatDensity
  setDensity(d: ChatDensity): void
}

export const useChatDisplaySettings = create<ChatDisplayStore>()(
  persist(
    (set) => ({
      density: 'cozy',
      setDensity: (d) => set({ density: d }),
    }),
    { name: 'kd:chat:density' },
  ),
)
