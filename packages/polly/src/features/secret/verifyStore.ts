// T-103 — локальное (device-bound) состояние верификации секретных чатов.
//
// Храним ПРОВЕРЕННЫЙ safety number собеседника, а не голый булев флаг: если ключ
// собеседника сменится (переустановка) — текущий safety number перестанет
// совпадать с проверенным, и «проверено» само спадёт. Это и есть сигнал «ключ
// изменился». Только локально (через at-rest `secrets`), на сервер НЕ уходит.

import { secrets } from '../../lib/host/secrets.js'

const verifiedKey = (peerUserId: string) => `kd:secret-verified:${peerUserId}`
const seenKey = (peerUserId: string) => `kd:secret-seen:${peerUserId}`
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

/** Время (epoch ms) последнего входящего, которое пользователь уже видел. */
export async function getSeenTs(peerUserId: string): Promise<number> {
  const raw = await secrets.get(seenKey(peerUserId))
  return raw ? Number(raw) || 0 : 0
}

/** Запомнить, что входящие вплоть до ts просмотрены (гашение unread). */
export function setSeenTs(peerUserId: string, ts: number): Promise<void> {
  return secrets.set(seenKey(peerUserId), String(ts))
}

/** Показывали ли уже device-bound онбординг секретных чатов. */
export async function hasSeenOnboarding(): Promise<boolean> {
  return (await secrets.get(ONBOARDING_KEY)) === '1'
}

export function markOnboardingSeen(): Promise<void> {
  return secrets.set(ONBOARDING_KEY, '1')
}
