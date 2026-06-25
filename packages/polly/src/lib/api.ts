import type { User } from '@kakdela/ginzu'

import { useAuthStore } from '../features/auth/store.js'
import { friendlyMessage } from './errorMessages.js'

const SPEEDY_URL = import.meta.env.VITE_SPEEDY_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${SPEEDY_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json() as { accessToken: string; user: User }
    useAuthStore.getState().setSession(data.user, data.accessToken)
    return data.accessToken
  } catch {
    return null
  }
}

async function doRequest(path: string, token: string | null, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${SPEEDY_URL}${path}`, {
      ...init,
      headers: {
        // Content-Type только при наличии тела: Fastify 5 отвергает пустой
        // body с заголовком application/json (FST_ERR_CTP_EMPTY_JSON_BODY),
        // что ломало DELETE-запросы (удаление сообщений, снятие реакций).
        ...(init?.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers as Record<string, string> ?? {}),
      },
      credentials: 'include',
    })
  } catch {
    // fetch reject = сеть лежит / сервер недоступен (а не HTTP-ошибка).
    // Даём дружелюбный код вместо «Failed to fetch».
    throw new ApiError('network-error', friendlyMessage('network-error', 'нет связи с сервером'), 0)
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken

  let res = await doRequest(path, token, init)

  if (res.status === 401) {
    const fresh = await tryRefresh()
    if (fresh) {
      res = await doRequest(path, fresh, init)
    } else {
      useAuthStore.getState().clear()
    }
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  if (!res.ok) {
    let body: { error?: { code: string; message: string } } = {}
    try {
      body = await res.json() as typeof body
    } catch { /* ignore parse errors */ }
    const code = body.error?.code ?? 'unknown-error'
    throw new ApiError(
      code,
      friendlyMessage(code, body.error?.message ?? res.statusText),
      res.status,
    )
  }

  return res.json() as Promise<T>
}
