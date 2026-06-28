// Пикер гифок (GIPHY) + избранное. Две вкладки: «Тренды» (тренды по умолчанию,
// поиск с дебаунсом — бережём лимит 100 запросов/час) и «★ Избранное» (с
// бэкенда). Клик по гифке отправляет её структурным embed'ом (onSelect).
// Звёздочка на тайле добавляет/убирает из избранного.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import type { GifEmbed, GifFavoritePayload, GiphyGif } from '@kakdela/ginzu/api-types'

import { Icon } from '../../components/Icon.js'
import { ApiError } from '../../lib/api.js'
import { giphySearch, giphyTrending } from './api.js'
import { useFavorites } from '../favorites/api.js'

const LIMIT = 24
const DEBOUNCE_MS = 450

type Tab = 'trending' | 'favorites'

function toEmbed(g: { gifUrl: string; mp4Url: string | null; previewUrl: string; width: number; height: number }): GifEmbed {
  return { gifUrl: g.gifUrl, mp4Url: g.mp4Url, previewUrl: g.previewUrl, width: g.width, height: g.height }
}

// Один тайл грида: превью + звёздочка избранного поверх (видна на hover или
// когда уже в избранном).
function GifTile({
  previewUrl, width, height, title, faved, onPick, onToggleFav,
}: {
  previewUrl: string
  width: number
  height: number
  title: string
  faved: boolean
  onPick: () => void
  onToggleFav: () => void
}) {
  return (
    <div className="relative mb-1.5 break-inside-avoid group">
      <button
        type="button"
        onClick={onPick}
        title={title || 'gif'}
        className="block w-full overflow-hidden rounded bg-kd-panel-alt hover:ring-2 hover:ring-kd-accent transition-shadow"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <img src={previewUrl} alt={title} loading="lazy" className="w-full h-full object-cover" draggable={false} />
      </button>
      <button
        type="button"
        onClick={onToggleFav}
        title={faved ? 'убрать из избранного' : 'в избранное'}
        className={`absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded text-[13px] leading-none bg-kd-overlay-strong transition-opacity ${
          faved ? 'text-kd-warm opacity-100' : 'text-white opacity-0 group-hover:opacity-100'
        }`}
      >
        {faved ? '★' : '☆'}
      </button>
    </div>
  )
}

export default function GifPicker({ onSelect }: { onSelect: (gif: GifEmbed) => void }) {
  const [tab, setTab] = useState<Tab>('trending')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')

  const fav = useFavorites('gif')

  // Дебаунс ввода → реальный запрос. Ввод также переключает на вкладку трендов
  // (поиск живёт там), чтобы результаты были видны.
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [input])

  const query = useInfiniteQuery({
    queryKey: ['giphy', q],
    queryFn: ({ pageParam }) =>
      q ? giphySearch(q, { offset: pageParam, limit: LIMIT }) : giphyTrending({ offset: pageParam, limit: LIMIT }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    staleTime: 5 * 60_000,
    enabled: tab === 'trending',
  })

  const gifs = useMemo(() => query.data?.pages.flatMap((p) => p.gifs) ?? [], [query.data])

  // Бесконечная подгрузка. Observer создаём ОДИН раз на вкладку (а не каждый
  // рендер) — иначе пересоздание дёргало initial-callback при видимом сентинеле
  // и поиск «сходил с ума», прожигая лимит GIPHY. Живые значения читаем из ref.
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fetchNextRef = useRef(query.fetchNextPage)
  const canFetchRef = useRef(false)
  fetchNextRef.current = query.fetchNextPage
  canFetchRef.current = query.hasNextPage === true && !query.isFetchingNextPage

  useEffect(() => {
    if (tab !== 'trending') return
    const el = sentinelRef.current
    const root = scrollRef.current
    if (!el || !root) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && canFetchRef.current) void fetchNextRef.current()
    }, { root, rootMargin: '120px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [tab])

  function pick(embed: GifEmbed) {
    onSelect(embed)
  }

  function toggleFav(g: { gifUrl: string; mp4Url: string | null; previewUrl: string; width: number; height: number; title: string }) {
    const existing = fav.byRef.get(g.gifUrl)
    if (existing) fav.remove.mutate(existing.id)
    else fav.add.mutate({ refKey: g.gifUrl, payload: { gifUrl: g.gifUrl, mp4Url: g.mp4Url, previewUrl: g.previewUrl, width: g.width, height: g.height, title: g.title } })
  }

  const errCode = query.error instanceof ApiError ? query.error.code : null
  const errMsg = query.error instanceof ApiError ? query.error.message : 'не удалось загрузить гифки'

  function onInputChange(v: string) {
    setInput(v)
    if (v.trim() && tab !== 'trending') setTab('trending')
  }

  return (
    <div className="w-[340px] h-[400px] bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal flex flex-col overflow-hidden kd-pop-in">
      <div className="px-2.5 py-2 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-kd-bg border border-kd-border">
          <Icon.Search size={13} className="text-kd-text-mute shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="искать гифки…"
            autoFocus
            className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-kd-text placeholder:text-kd-text-mute"
          />
          {input && (
            <button type="button" onClick={() => onInputChange('')} title="очистить" className="shrink-0 text-kd-text-mute hover:text-kd-text">
              <Icon.X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2">
          {([['trending', 'Тренды'], ['favorites', '★ Избранное']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                tab === id ? 'bg-kd-accent-bg text-kd-accent' : 'text-kd-text-mute hover:bg-kd-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-2">
        {tab === 'favorites' ? (
          fav.isLoading ? (
            <div className="h-full flex items-center justify-center text-[11px] font-mono text-kd-text-mute">загружаем…</div>
          ) : fav.favorites.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-6 text-[11px] font-mono text-kd-text-mute">
              пусто · нажми ☆ на гифке, чтобы добавить
            </div>
          ) : (
            <div className="columns-2 gap-1.5 [column-fill:_balance]">
              {fav.favorites.map((f) => {
                const p = f.payload as GifFavoritePayload
                return (
                  <GifTile
                    key={f.id}
                    previewUrl={p.previewUrl}
                    width={p.width}
                    height={p.height}
                    title={p.title}
                    faved
                    onPick={() => pick(toEmbed(p))}
                    onToggleFav={() => fav.remove.mutate(f.id)}
                  />
                )
              })}
            </div>
          )
        ) : query.isError ? (
          <div className="h-full flex items-center justify-center text-center px-4">
            <span className={`text-[11px] font-mono ${errCode === 'giphy-rate-limited' ? 'text-kd-warm' : 'text-kd-text-mute'}`}>
              {errMsg}
            </span>
          </div>
        ) : query.isLoading ? (
          <div className="h-full flex items-center justify-center text-[11px] font-mono text-kd-text-mute">загружаем…</div>
        ) : gifs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6 text-[11px] font-mono text-kd-text-mute">
            {q ? `по запросу «${q}» ничего не нашлось` : 'ничего не нашлось'}
          </div>
        ) : (
          <div className="columns-2 gap-1.5 [column-fill:_balance]">
            {gifs.map((g: GiphyGif) => (
              <GifTile
                key={g.id}
                previewUrl={g.previewUrl}
                width={g.width}
                height={g.height}
                title={g.title}
                faved={fav.byRef.has(g.url)}
                onPick={() => pick(toEmbed({ gifUrl: g.url, mp4Url: g.mp4Url, previewUrl: g.previewUrl, width: g.width, height: g.height }))}
                onToggleFav={() => toggleFav({ gifUrl: g.url, mp4Url: g.mp4Url, previewUrl: g.previewUrl, width: g.width, height: g.height, title: g.title })}
              />
            ))}
            <div ref={sentinelRef} className="h-1 w-full" />
            {query.isFetchingNextPage && (
              <div className="py-2 text-center text-[10px] font-mono text-kd-text-mute">…</div>
            )}
          </div>
        )}
      </div>

      <div className="px-2.5 py-1.5 border-t border-kd-border bg-kd-panel-alt shrink-0 text-[9px] font-mono text-kd-text-mute select-none text-right">
        Powered by GIPHY
      </div>
    </div>
  )
}
