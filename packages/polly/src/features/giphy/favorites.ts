// Избранные гифки (per-user, на бэкенде). Один query на список + мутации
// add/remove с инвалидацией. byUrl — быстрый lookup «в избранном ли» (+ id для
// удаления) по gifUrl.

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AddGifFavoriteRequest, GifFavorite, GifFavoritesResponse } from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function listGifFavorites(): Promise<GifFavorite[]> {
  const data = await apiFetch<GifFavoritesResponse>('/api/gif-favorites')
  return data.favorites
}

export async function addGifFavorite(body: AddGifFavoriteRequest): Promise<GifFavorite> {
  return apiFetch<GifFavorite>('/api/gif-favorites', { method: 'POST', body: JSON.stringify(body) })
}

export async function removeGifFavorite(id: string): Promise<void> {
  await apiFetch<void>(`/api/gif-favorites/${id}`, { method: 'DELETE' })
}

export function useGifFavorites() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['gif-favorites'],
    queryFn:  listGifFavorites,
    staleTime: 60_000,
  })
  const favorites = useMemo(() => query.data ?? [], [query.data])

  const byUrl = useMemo(() => {
    const m = new Map<string, GifFavorite>()
    for (const f of favorites) m.set(f.gifUrl, f)
    return m
  }, [favorites])

  const invalidate = () => { void qc.invalidateQueries({ queryKey: ['gif-favorites'] }) }
  const add = useMutation({ mutationFn: addGifFavorite, onSuccess: invalidate })
  const remove = useMutation({ mutationFn: removeGifFavorite, onSuccess: invalidate })

  return { favorites, byUrl, isLoading: query.isLoading, add, remove }
}
