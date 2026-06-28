import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'

import type {
  CreateStickerRequest,
  Sticker,
  StickerListResponse,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'
import { listServers } from '../servers/api.js'

export async function listServerStickers(serverId: string): Promise<Sticker[]> {
  const data = await apiFetch<StickerListResponse>(`/api/servers/${serverId}/stickers`)
  return data.stickers
}

export async function createServerSticker(
  serverId: string,
  body: CreateStickerRequest,
): Promise<Sticker> {
  return apiFetch<Sticker>(`/api/servers/${serverId}/stickers`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteServerSticker(stickerId: string): Promise<void> {
  await apiFetch<void>(`/api/stickers/${stickerId}`, { method: 'DELETE' })
}

/** Стикеры одного сервера (для управления в настройках). */
export function useServerStickers(serverId: string | null) {
  const query = useQuery({
    queryKey: ['stickers', serverId],
    queryFn:  () => listServerStickers(serverId!),
    enabled:  serverId !== null,
    staleTime: 60_000,
  })
  return { stickers: query.data ?? [], isLoading: query.isLoading }
}

/**
 * Стикеры по ВСЕМ серверам пользователя — пикер в композере общий (работает и
 * в серверных каналах, и в личке). Все query шарят кеш с useServerStickers.
 */
export function useAllServerStickers(): { stickers: Sticker[]; isLoading: boolean } {
  const { data: servers } = useQuery({
    queryKey: ['servers'],
    queryFn:  listServers,
    staleTime: 30_000,
  })

  const results = useQueries({
    queries: (servers ?? []).map((s) => ({
      queryKey: ['stickers', s.id],
      queryFn:  () => listServerStickers(s.id),
      staleTime: 60_000,
    })),
  })

  const sig = results.map((r) => r.dataUpdatedAt).join('|')
  const stickers = useMemo(() => {
    const out: Sticker[] = []
    for (const r of results) for (const s of r.data ?? []) out.push(s)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  return { stickers, isLoading: results.some((r) => r.isLoading) }
}
