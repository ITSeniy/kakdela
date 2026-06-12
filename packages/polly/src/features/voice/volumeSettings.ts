// Персональная громкость участников: отдельно голос (микрофон) и звук
// стрима (screen share audio). 0..1 — это volume аудио-элемента, выше
// единицы браузер не умеет. Персистится: выставил тихоню погромче один
// раз — настройка переживает перезаходы. Применение к живой комнате
// делает lib/livekit.ts (applyParticipantVolume).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserVolumes {
  user: number
  stream: number
}

interface VolumeStore {
  volumes: Record<string, Partial<UserVolumes>>
  setVolume(userId: string, kind: keyof UserVolumes, value: number): void
}

export const useVoiceVolumes = create<VolumeStore>()(
  persist(
    (set) => ({
      volumes: {},
      setVolume: (userId, kind, value) =>
        set((s) => ({
          volumes: {
            ...s.volumes,
            [userId]: { ...s.volumes[userId], [kind]: Math.min(1, Math.max(0, value)) },
          },
        })),
    }),
    { name: 'kd:voice:volumes' },
  ),
)

export function volumesFor(
  volumes: Record<string, Partial<UserVolumes>>,
  userId: string,
): UserVolumes {
  return {
    user: volumes[userId]?.user ?? 1,
    stream: volumes[userId]?.stream ?? 1,
  }
}
