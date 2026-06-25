import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'

import type {
  CreateEmojiRequest,
  CustomEmoji,
  EmojiListResponse,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'
import { listServers } from '../servers/api.js'

export async function listServerEmoji(serverId: string): Promise<CustomEmoji[]> {
  const data = await apiFetch<EmojiListResponse>(`/api/servers/${serverId}/emoji`)
  return data.emoji
}

export async function createServerEmoji(
  serverId: string,
  body: CreateEmojiRequest,
): Promise<CustomEmoji> {
  return apiFetch<CustomEmoji>(`/api/servers/${serverId}/emoji`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteServerEmoji(emojiId: string): Promise<void> {
  await apiFetch<void>(`/api/emoji/${emojiId}`, { method: 'DELETE' })
}

/**
 * Подписка на список emoji сервера. Один query на сервер — все компоненты,
 * которым нужно резолвить `:name:`, ходят через этот кеш, чтобы при сотне
 * сообщений с emoji не получить сотню сетевых запросов.
 */
export function useServerEmoji(serverId: string | null) {
  const query = useQuery({
    queryKey: ['emoji', serverId],
    queryFn:  () => listServerEmoji(serverId!),
    enabled:  serverId !== null,
    staleTime: 60_000,
  })

  const byName = useMemo(() => {
    const map = new Map<string, CustomEmoji>()
    for (const e of query.data ?? []) map.set(e.name, e)
    return map
  }, [query.data])

  return { emoji: query.data ?? [], byName, isLoading: query.isLoading }
}

/**
 * Карта `name → custom emoji`, собранная по ВСЕМ серверам пользователя.
 * Нужна там, где нет привязки к одному серверу — личка, инбокс, превью: чтобы
 * `:name:` всё равно резолвился в картинку. Все query шарят кеш с
 * useServerEmoji (ключ ['emoji', serverId]), лишних запросов не плодим.
 */
export function useAllServerEmoji(): ReadonlyMap<string, CustomEmoji> {
  const { data: servers } = useQuery({
    queryKey: ['servers'],
    queryFn:  listServers,
    staleTime: 30_000,
  })

  const results = useQueries({
    queries: (servers ?? []).map((s) => ({
      queryKey: ['emoji', s.id],
      queryFn:  () => listServerEmoji(s.id),
      staleTime: 60_000,
    })),
  })

  // Пересобираем карту только когда какой-то из query реально обновился
  // (dataUpdatedAt меняется) — массив results свежий каждый рендер.
  const sig = results.map((r) => r.dataUpdatedAt).join('|')
  return useMemo(() => {
    const map = new Map<string, CustomEmoji>()
    for (const r of results) {
      for (const e of r.data ?? []) if (!map.has(e.name)) map.set(e.name, e)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
}

/** Конвертирует File в base64 без `data:...` префикса. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned non-string result'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsDataURL(file)
  })
}
