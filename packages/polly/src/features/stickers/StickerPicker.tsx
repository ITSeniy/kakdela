// Пикер стикеров для композера. Две вкладки: «Стикеры» (со всех серверов
// пользователя, поиск по имени) и «★ Избранное» (с бэкенда). Клик отправляет
// стикер сообщением. Звёздочка на тайле добавляет/убирает из избранного —
// избранный стикер хранится снимком, поэтому переживает удаление с сервера.

import { useMemo, useState } from 'react'

import type { Sticker, StickerFavoritePayload, StickerRef } from '@kakdela/ginzu/api-types'

import { Icon } from '../../components/Icon.js'
import { useFavorites } from '../favorites/api.js'
import { useAllServerStickers } from './api.js'

type Tab = 'all' | 'favorites'

function toRef(s: { stickerId: string; name: string; imageUrl: string; width: number; height: number }): StickerRef {
  return { stickerId: s.stickerId, name: s.name, imageUrl: s.imageUrl, width: s.width, height: s.height }
}

function StickerTile({
  imageUrl, name, faved, onPick, onToggleFav,
}: {
  imageUrl: string
  name: string
  faved: boolean
  onPick: () => void
  onToggleFav: () => void
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onPick}
        title={name}
        className="w-full aspect-square rounded-kd bg-kd-panel-alt hover:bg-kd-panel-hi border border-transparent hover:border-kd-accent flex items-center justify-center p-2 transition-colors"
      >
        <img src={imageUrl} alt={name} loading="lazy" draggable={false} className="max-w-full max-h-full object-contain" />
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

export default function StickerPicker({ onSelect }: { onSelect: (sticker: StickerRef) => void }) {
  const { stickers, isLoading } = useAllServerStickers()
  const fav = useFavorites('sticker')
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return stickers
    return stickers.filter((s) => s.name.toLowerCase().includes(term))
  }, [stickers, q])

  function toggleFav(s: { stickerId: string; name: string; imageUrl: string; width: number; height: number }) {
    const existing = fav.byRef.get(s.stickerId)
    if (existing) fav.remove.mutate(existing.id)
    else fav.add.mutate({ refKey: s.stickerId, payload: s })
  }

  return (
    <div className="w-[320px] h-[400px] bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal flex flex-col overflow-hidden kd-pop-in">
      <div className="px-2.5 py-2 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-kd-bg border border-kd-border">
          <Icon.Search size={13} className="text-kd-text-mute shrink-0" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); if (e.target.value.trim()) setTab('all') }}
            placeholder="искать стикеры…"
            autoFocus
            className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-kd-text placeholder:text-kd-text-mute"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} title="очистить" className="shrink-0 text-kd-text-mute hover:text-kd-text">
              <Icon.X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2">
          {([['all', 'Стикеры'], ['favorites', '★ Избранное']] as const).map(([id, label]) => (
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

      <div className="flex-1 overflow-y-auto min-h-0 p-2">
        {tab === 'favorites' ? (
          fav.isLoading ? (
            <div className="h-full flex items-center justify-center text-[11px] font-mono text-kd-text-mute">загружаем…</div>
          ) : fav.favorites.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-6 text-[11px] font-mono text-kd-text-mute">
              пусто · нажми ☆ на стикере, чтобы добавить
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {fav.favorites.map((f) => {
                const p = f.payload as StickerFavoritePayload
                return (
                  <StickerTile
                    key={f.id}
                    imageUrl={p.imageUrl}
                    name={p.name}
                    faved
                    onPick={() => onSelect(toRef(p))}
                    onToggleFav={() => fav.remove.mutate(f.id)}
                  />
                )
              })}
            </div>
          )
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center text-[11px] font-mono text-kd-text-mute">загружаем…</div>
        ) : stickers.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6 text-[11px] font-mono text-kd-text-mute">
            пусто · добавь стикеры в настройках сервера
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] font-mono text-kd-text-mute">ничего не нашлось</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((s: Sticker) => (
              <StickerTile
                key={s.id}
                imageUrl={s.imageUrl}
                name={s.name}
                faved={fav.byRef.has(s.id)}
                onPick={() => onSelect(toRef({ stickerId: s.id, name: s.name, imageUrl: s.imageUrl, width: s.width, height: s.height }))}
                onToggleFav={() => toggleFav({ stickerId: s.id, name: s.name, imageUrl: s.imageUrl, width: s.width, height: s.height })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
