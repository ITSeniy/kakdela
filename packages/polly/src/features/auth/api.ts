import type { User } from '@kakdela/ginzu'

import { ApiError, apiFetch } from '../../lib/api.js'
import { secrets } from '../../lib/host/secrets.js'
import { useAuthStore } from './store.js'

const SPEEDY_URL = import.meta.env.VITE_SPEEDY_URL ?? 'http://localhost:3001'

export type InviteInfo = { serverName: string; serverIcon: string | null; expiresAt: string | null }

export async function lookupInvite(code: string): Promise<InviteInfo> {
  const res = await fetch(`${SPEEDY_URL}/api/invites/${encodeURIComponent(code)}`)
  if (!res.ok) {
    let body: { error?: { code: string; message: string } } = {}
    try { body = await res.json() as typeof body } catch { /* ignore */ }
    throw new ApiError(
      body.error?.code ?? 'unknown-error',
      body.error?.message ?? res.statusText,
      res.status,
    )
  }
  return res.json() as Promise<InviteInfo>
}

type AuthResponse = { accessToken: string; user: User }

export async function login(email: string, password: string): Promise<void> {
  const data = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  await secrets.set('kd:accessToken', data.accessToken)
  useAuthStore.getState().setSession(data.user, data.accessToken)
}

export async function register(params: {
  inviteCode: string
  username: string
  /** Опционально: имя задаётся на втором шаге, сервер подставит username. */
  displayName?: string
  email: string
  password: string
}): Promise<void> {
  const data = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  await secrets.set('kd:accessToken', data.accessToken)
  useAuthStore.getState().setSession(data.user, data.accessToken)
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/api/auth/logout', { method: 'POST' })
  } catch { /* ignore network errors on logout */ }
  await secrets.delete('kd:accessToken')
  useAuthStore.getState().clear()
}

export async function initAuth(): Promise<void> {
  useAuthStore.getState().setStatus('loading')
  try {
    const res = await fetch(`${SPEEDY_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      useAuthStore.getState().clear()
      return
    }
    const json = await res.json() as { accessToken: string; user: User }
    await secrets.set('kd:accessToken', json.accessToken)
    useAuthStore.getState().setSession(json.user, json.accessToken)
  } catch {
    useAuthStore.getState().clear()
  }
}
