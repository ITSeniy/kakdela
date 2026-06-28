// Избранное (гифки/стикеры/эмодзи) — единый клиентский модуль поверх
// /api/favorites. Один query на kind, мутации add/remove. byRef — быстрый
// lookup «в избранном ли» по refKey (+ id для удаления).

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  Favorite,
  FavoriteKind,
  FavoritePayload,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function listFavorites(kind: FavoriteKind): Promise<Favorite[]> {
  const data = await apiFetch<{ favorites: Favorite[] }>(`/api/favorites?kind=${kind}`)
  return data.favorites
}

export async function addFavorite(body: {
  kind: FavoriteKind
  refKey: string
  payload: FavoritePayload
}): Promise<Favorite> {
  return apiFetch<Favorite>('/api/favorites', { method: 'POST', body: JSON.stringify(body) })
}

export async function removeFavorite(id: string): Promise<void> {
  await apiFetch<void>(`/api/favorites/${id}`, { method: 'DELETE' })
}

export function useFavorites(kind: FavoriteKind) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['favorites', kind],
    queryFn:  () => listFavorites(kind),
    staleTime: 60_000,
  })
  const favorites = useMemo(() => query.data ?? [], [query.data])

  const byRef = useMemo(() => {
    const m = new Map<string, Favorite>()
    for (const f of favorites) m.set(f.refKey, f)
    return m
  }, [favorites])

  const invalidate = () => { void qc.invalidateQueries({ queryKey: ['favorites', kind] }) }
  const add = useMutation({
    mutationFn: (b: { refKey: string; payload: FavoritePayload }) => addFavorite({ kind, ...b }),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: removeFavorite, onSuccess: invalidate })

  return { favorites, byRef, isLoading: query.isLoading, add, remove }
}
