// T-103 — эфемерное состояние секретных сессий, которое наполняет приём-pipeline
// (features/secret/api.ts) и читает экран чата.
//   • keyChanged — у собеседника сменился identity-ключ (untrusted-identity при
//     расшифровке). Пока флаг стоит — экран блокирует отправку и показывает баннер.
//   • typingAt   — метка времени последнего typing-конверта (эфемерный индикатор).
// Это НЕ персистентное состояние (в отличие от verifyStore) — живёт в памяти.

import { create } from 'zustand'

interface SecretSessionState {
  keyChanged: Record<string, boolean>
  typingAt: Record<string, number>
  flagKeyChanged(peerUserId: string): void
  clearKeyChanged(peerUserId: string): void
  setTyping(peerUserId: string, ts: number): void
}

export const useSecretSession = create<SecretSessionState>()((set) => ({
  keyChanged: {},
  typingAt: {},
  flagKeyChanged: (peer) => set((s) => ({ keyChanged: { ...s.keyChanged, [peer]: true } })),
  clearKeyChanged: (peer) => set((s) => {
    if (!s.keyChanged[peer]) return s
    const next = { ...s.keyChanged }
    delete next[peer]
    return { keyChanged: next }
  }),
  setTyping: (peer, ts) => set((s) => ({ typingAt: { ...s.typingAt, [peer]: ts } })),
}))
