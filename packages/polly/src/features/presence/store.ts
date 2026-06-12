// Свой presence-статус («в сети / отошёл / не беспокоить»). Персистится:
// сервер при каждом коннекте принудительно ставит online, поэтому после
// события ready клиент пере-отправляет сохранённый статус (см. App.tsx).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { wsClient } from '../../lib/ws.js'

export type MyStatus = 'online' | 'idle' | 'dnd'

interface MyStatusStore {
  myStatus: MyStatus
  setMyStatus(s: MyStatus): void
}

export const useMyStatus = create<MyStatusStore>()(
  persist(
    (set) => ({
      myStatus: 'online',
      setMyStatus: (s) => {
        set({ myStatus: s })
        wsClient.send({ t: 'presence', status: s })
      },
    }),
    { name: 'kd:presence:self' },
  ),
)
