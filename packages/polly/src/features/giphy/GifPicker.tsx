// Пикер гифок (GIPHY). Тренды по умолчанию, поиск с дебаунсом (бережём лимит
// 100 запросов/час — основной кэш на сервере, но и тут не строчим на каждую
// букву). Клик по гифке вызывает onSelect — Composer отправляет её сообщением.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import type { GiphyGif } from '@kakdela/ginzu/api-types'

import { Icon } from '../../components/Icon.js'
import { ApiError } from '../../lib/api.js'
import { giphySearch, giphyTrending } from './api.js'

const LIMIT = 24
const DEBOUNCE_MS = 450

export default function GifPicker({ onSelect }: { onSelect: (gif: GiphyGif) => void }) {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')

  // Дебаунс ввода → реальный запрос.
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
  })

  const gifs = useMemo(() => query.data?.pages.flatMap((p) => p.gifs) ?? [], [query.data])

  // Бесконечная подгрузка через IntersectionObserver на «дне» (root — сам
  // скролл-контейнер, иначе с overflow-областью пересечение не срабатывает).
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    const root = scrollRef.current
    if (!el || !root) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage()
      }
    }, { root, threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [query, gifs.length])

  const errCode = query.error instanceof ApiError ? query.error.code : null
  const errMsg = query.error instanceof ApiError ? query.error.message : 'не удалось загрузить гифки'

  return (
    <div className="w-[340px] h-[380px] bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal flex flex-col overflow-hidden">
      <div className="px-2.5 py-2 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-kd-bg border border-kd-border">
          <Icon.Search size={13} className="text-kd-text-mute shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="искать гифки…"
            autoFocus
            className="flex-1 bg-transparent outline-none text-[12px] text-kd-text placeholder:text-kd-text-mute"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-2">
        {query.isError && (
          <div className="h-full flex items-center justify-center text-center px-4">
            <span className={`text-[11px] font-mono ${errCode === 'giphy-rate-limited' ? 'text-kd-warm' : 'text-kd-text-mute'}`}>
              {errMsg}
            </span>
          </div>
        )}
        {!query.isError && query.isLoading && (
          <div className="h-full flex items-center justify-center text-[11px] font-mono text-kd-text-mute">загружаем…</div>
        )}
        {!query.isError && !query.isLoading && gifs.length === 0 && (
          <div className="h-full flex items-center justify-center text-[11px] font-mono text-kd-text-mute">ничего не нашлось</div>
        )}
        {gifs.length > 0 && (
          <div className="columns-2 gap-1.5 [column-fill:_balance]">
            {gifs.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(g)}
                title={g.title || 'gif'}
                className="mb-1.5 block w-full overflow-hidden rounded bg-kd-panel-alt hover:ring-2 hover:ring-kd-accent transition-shadow"
                style={{ aspectRatio: `${g.width} / ${g.height}` }}
              >
                <img src={g.previewUrl} alt={g.title} loading="lazy" className="w-full h-full object-cover" draggable={false} />
              </button>
            ))}
            <div ref={sentinelRef} className="h-1 w-full" />
          </div>
        )}
        {query.isFetchingNextPage && (
          <div className="py-2 text-center text-[10px] font-mono text-kd-text-mute">…</div>
        )}
      </div>

      <div className="px-2.5 py-1.5 border-t border-kd-border bg-kd-panel-alt shrink-0 text-[9px] font-mono text-kd-text-mute select-none text-right">
        Powered by GIPHY
      </div>
    </div>
  )
}
