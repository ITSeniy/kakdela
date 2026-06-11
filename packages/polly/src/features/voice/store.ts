import { create } from 'zustand'

import type { VoiceParticipantPublic } from '@kakdela/ginzu/api-types'

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed'

export interface ParticipantState {
  userId: string
  displayName: string
  isSpeaking: boolean
  isScreenSharing: boolean
  isMuted: boolean
}

interface VoiceState {
  activeChannelId: string | null
  status: VoiceStatus
  muted: boolean
  deafened: boolean
  screenSharing: boolean
  // PTT — пользователь сейчас удерживает hotkey. Только в memory: при
  // перезапуске сам по себе не «зажат».
  pttHolding: boolean
  participants: Map<string, ParticipantState>
  activeSpeakers: Set<string>
  // identity того участника, чей screen share «закреплён» в фокусе. Не
  // персистится — пин живёт только в текущей сессии театрального режима.
  pinnedScreenUserId: string | null
  error: string | null
}

interface VoiceActions {
  reset(): void
  setStatus(status: VoiceStatus): void
  setError(err: string | null): void
  setActiveChannelId(id: string | null): void
  setMuted(muted: boolean): void
  setDeafened(deafened: boolean): void
  setScreenSharing(s: boolean): void
  setPinnedScreenUserId(id: string | null): void
  setPttHolding(holding: boolean): void
  setActiveSpeakers(ids: Iterable<string>): void
  upsertParticipant(p: Partial<ParticipantState> & { userId: string; displayName: string }): void
  patchParticipant(userId: string, patch: Partial<Omit<ParticipantState, 'userId'>>): void
  removeParticipant(userId: string): void
  applySnapshot(items: VoiceParticipantPublic[]): void
}

const initialState: VoiceState = {
  activeChannelId: null,
  status: 'idle',
  muted: false,
  deafened: false,
  screenSharing: false,
  pttHolding: false,
  participants: new Map(),
  activeSpeakers: new Set(),
  pinnedScreenUserId: null,
  error: null,
}

// LiveKit убирает участника из ActiveSpeakers сразу же, как только звук стих —
// даже на коротких паузах между словами. Чтобы кольцо вокруг тайла не моргало,
// мы откладываем «погасание» на 500ms; если за это время участник снова заго-
// ворит, таймер отменяется. Таймеры держим в модуле, чтобы не сериализовать
// их вместе со state.
const SPEAKER_OFF_DELAY_MS = 500
const pendingSpeakerOff = new Map<string, ReturnType<typeof setTimeout>>()

function cancelSpeakerOff(userId: string): void {
  const t = pendingSpeakerOff.get(userId)
  if (t) {
    clearTimeout(t)
    pendingSpeakerOff.delete(userId)
  }
}

function cancelAllSpeakerOffs(): void {
  for (const t of pendingSpeakerOff.values()) clearTimeout(t)
  pendingSpeakerOff.clear()
}

export const useVoiceStore = create<VoiceState & VoiceActions>()((set) => ({
  ...initialState,

  reset() {
    cancelAllSpeakerOffs()
    // Не сохраняем error/lastChannel — это идеальная очистка после leave.
    set({
      ...initialState,
      participants: new Map(),
      activeSpeakers: new Set(),
    })
  },

  setStatus(status) {
    set({ status })
  },

  setError(err) {
    set({ error: err })
  },

  setActiveChannelId(id) {
    set({ activeChannelId: id })
  },

  setMuted(muted) {
    set({ muted })
  },

  setDeafened(deafened) {
    set({ deafened })
  },

  setScreenSharing(s) {
    set({ screenSharing: s })
  },

  setPinnedScreenUserId(id) {
    set({ pinnedScreenUserId: id })
  },

  setPttHolding(holding) {
    set({ pttHolding: holding })
  },

  setActiveSpeakers(ids) {
    const incoming = new Set(ids)
    set((state) => {
      const next = new Set(state.activeSpeakers)
      // Появление участника в эфире — применяем сразу и сбрасываем
      // pending-off если был.
      for (const id of incoming) {
        cancelSpeakerOff(id)
        next.add(id)
      }
      // Отсутствие — ставим таймер на 500ms. При следующем setActiveSpeakers
      // с этим же id таймер отменится в первой ветке выше.
      for (const id of state.activeSpeakers) {
        if (incoming.has(id)) continue
        if (pendingSpeakerOff.has(id)) continue
        const timer = setTimeout(() => {
          pendingSpeakerOff.delete(id)
          set((s) => {
            if (!s.activeSpeakers.has(id)) return s
            const cleaned = new Set(s.activeSpeakers)
            cleaned.delete(id)
            return { activeSpeakers: cleaned }
          })
        }, SPEAKER_OFF_DELAY_MS)
        pendingSpeakerOff.set(id, timer)
      }
      return { activeSpeakers: next }
    })
  },

  upsertParticipant(p) {
    set((state) => {
      const existing = state.participants.get(p.userId)
      const next = new Map(state.participants)
      next.set(p.userId, {
        userId: p.userId,
        displayName: p.displayName,
        isSpeaking: p.isSpeaking ?? existing?.isSpeaking ?? false,
        isScreenSharing: p.isScreenSharing ?? existing?.isScreenSharing ?? false,
        isMuted: p.isMuted ?? existing?.isMuted ?? false,
      })
      return { participants: next }
    })
  },

  patchParticipant(userId, patch) {
    set((state) => {
      const existing = state.participants.get(userId)
      if (!existing) return state
      const next = new Map(state.participants)
      next.set(userId, { ...existing, ...patch })
      return { participants: next }
    })
  },

  removeParticipant(userId) {
    cancelSpeakerOff(userId)
    set((state) => {
      if (!state.participants.has(userId)) return state
      const next = new Map(state.participants)
      next.delete(userId)
      const speakers = new Set(state.activeSpeakers)
      speakers.delete(userId)
      // Если ушёл pinned-демонстрирующий — снимаем пин, чтобы focus не
      // ушёл в пустоту в театральном режиме. computeLayout сам бы тоже
      // отработал корректно, но явная очистка экономит лишний фолбэк.
      const pinnedScreenUserId =
        state.pinnedScreenUserId === userId ? null : state.pinnedScreenUserId
      return { participants: next, activeSpeakers: speakers, pinnedScreenUserId }
    })
  },

  applySnapshot(items) {
    // Снапшот = новая комната или ре-джойн. Любые висящие debounce-таймеры
    // от предыдущей сессии больше не актуальны.
    cancelAllSpeakerOffs()
    const next = new Map<string, ParticipantState>()
    for (const item of items) {
      next.set(item.userId, {
        userId: item.userId,
        displayName: item.displayName,
        isSpeaking: false,
        isScreenSharing: item.isScreenSharing,
        isMuted: false,
      })
    }
    set({ participants: next, activeSpeakers: new Set() })
  },
}))
