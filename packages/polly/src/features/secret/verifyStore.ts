// T-103 — локальное (device-bound) состояние верификации секретных чатов.
//
// Храним ПРОВЕРЕННЫЙ safety number собеседника, а не голый булев флаг: если ключ
// собеседника сменится (переустановка) — текущий safety number перестанет
// совпадать с проверенным, и «проверено» само спадёт. Это и есть сигнал «ключ
// изменился». Только локально (через at-rest `secrets`), на сервер НЕ уходит.

import { secrets } from '../../lib/host/secrets.js'

const verifiedKey = (peerUserId: string) => `kd:secret-verified:${peerUserId}`
const ONBOARDING_KEY = 'kd:secret-onboarding-seen'

/** Проверенный ранее safety number собеседника (или null). */
export function getVerifiedSafetyNumber(peerUserId: string): Promise<string | null> {
  return secrets.get(verifiedKey(peerUserId))
}

/** Отметить текущий safety number проверенным. */
export function setVerifiedSafetyNumber(peerUserId: string, safetyNumber: string): Promise<void> {
  return secrets.set(verifiedKey(peerUserId), safetyNumber)
}

/** Снять отметку «проверено» (например, после смены ключа). */
export function clearVerified(peerUserId: string): Promise<void> {
  return secrets.delete(verifiedKey(peerUserId))
}

/** Показывали ли уже device-bound онбординг секретных чатов. */
export async function hasSeenOnboarding(): Promise<boolean> {
  return (await secrets.get(ONBOARDING_KEY)) === '1'
}

export function markOnboardingSeen(): Promise<void> {
  return secrets.set(ONBOARDING_KEY, '1')
}
