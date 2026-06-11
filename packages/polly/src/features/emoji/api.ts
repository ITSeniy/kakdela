import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import type {
  CreateEmojiRequest,
  CustomEmoji,
  EmojiListResponse,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

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
