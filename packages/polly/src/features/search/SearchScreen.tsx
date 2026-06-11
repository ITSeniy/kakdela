import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { SearchResultItem, SearchSort } from '@kakdela/ginzu/api-types'

import { EmptyState } from '../../components/EmptyState.js'
import { Icon } from '../../components/Icon.js'
import { searchMessages } from './api.js'

const DEBOUNCE_MS = 250

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ru', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// `ts_headline` returns content with `<mark>` tags around matched lexemes —
// никакого экранирования postgres не делает, поэтому пропускаем через
// DOMPurify, разрешая только `<mark>`.
function sanitizeHeadline(html: string): string {
  if (typeof window === 'undefined') return html
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: [] })
}

interface FilterBarProps {
  sort: SearchSort
  onSort: (s: SearchSort) => void
}

function FilterBar({ sort, onSort }: FilterBarProps) {
  return (
    <div className="px-4 py-2 border-b border-kd-border bg-kd-panel-alt flex items-center gap-2 shrink-0">
      <span className="text-[10px] font-mono font-bold text-kd-text-mute uppercase tracking-[0.05em]">
        — сортировка
      </span>
      <div className="flex gap-0.5 p-0.5 bg-kd-panel rounded border border-kd-border">
        {([
          { id: 'rank' as const,   label: 'релевантность' },
          { id: 'recent' as const, label: 'свежие' },
        ]).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSort(m.id)}
            className={[
              'px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors',
              sort === m.id ? 'bg-kd-panel-hi text-kd-text' : 'text-kd-text-soft hover:text-kd-text',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <span className="text-[10px] text-kd-text-mute font-mono">⏎ открыть · esc закрыть</span>
    </div>
  )
}

function ResultRow({ result, onClick }: { result: SearchResultItem; onClick: () => void }) {
  const where = result.serverName
    ? `${result.serverName} · #${result.channelName}`
    : result.channelKind === 'dm'
      ? `лс · ${result.authorName}`
      : `#${result.channelName}`
  const headlineHtml = useMemo(() => sanitizeHeadline(result.headline), [result.headline])
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-baseline gap-2 px-4 py-1.5 border-b border-kd-border-soft hover:bg-kd-panel-alt/50 transition-colors"
    >
      <span className="text-[10px] text-kd-text-mute font-mono shrink-0">
        {fmtDate(result.createdAt)}
      </span>
      <span className="text-[13px] font-bold text-kd-text shrink-0 max-w-[160px] truncate">
        {result.authorName}
      </span>
      <span
        className="flex-1 min-w-0 truncate text-[13px] text-kd-text leading-snug kd-search-hit"
        dangerouslySetInnerHTML={{ __html: headlineHtml }}
      />
      <span className="text-[10px] text-kd-text-mute font-mono shrink-0 max-w-[200px] truncate">
        {where}
      </span>
    </button>
  )
}

export function SearchScreen() {
  const [, navigate] = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [sort, setSort] = useState<SearchSort>('rank')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  const { data, isFetching, error } = useQuery({
    queryKey: ['search', debounced, sort],
    queryFn: () => searchMessages({ q: debounced, sort }),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  })

  function openResult(r: SearchResultItem) {
    const path = r.channelKind === 'dm'
      ? `/dm/${r.channelId}`
      : r.serverId
        ? `/servers/${r.serverId}/channels/${r.channelId}`
        : null
    if (!path) return
    navigate(`${path}#msg:${r.messageId}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (query) {
        setQuery('')
      } else {
        navigate('/')
      }
    }
    if (e.key === 'Enter' && data && data.results.length > 0) {
      const first = data.results[0]
      if (first) openResult(first)
    }
  }

  const results = data?.results ?? []
  const showEmptyHint = debounced.length === 0
  const showNoResults = !showEmptyHint && !isFetching && results.length === 0
  const errorMsg = error instanceof Error ? error.message : null

  return (
    <div className="flex-1 min-w-0 min-h-0 col-span-2 flex flex-col bg-kd-bg">
      <div className="px-4 py-2.5 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="bg-kd-panel border border-kd-border rounded-kd px-3 py-2 flex items-center gap-2.5">
          <Icon.Search size={16} className="text-kd-text-mute shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="искать сообщения…"
            className="flex-1 bg-transparent text-[14px] text-kd-text outline-none placeholder:text-kd-text-mute font-sans"
          />
          {data && (
            <span className="text-[10px] text-kd-text-mute font-mono shrink-0">
              {data.total} {data.total === 1 ? 'совпадение' : 'совпадений'}
            </span>
          )}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="очистить · esc"
              className="text-kd-text-mute hover:text-kd-text px-0.5 transition-colors"
            >
              <Icon.X size={13} />
            </button>
          )}
        </div>
      </div>
      <FilterBar sort={sort} onSort={setSort} />
      <div className="flex-1 overflow-y-auto min-h-0">
        {showEmptyHint && (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              glyph="⌕"
              title="поиск по сообщениям"
              body={'введи слово или фразу.\n"кавычки" — точная фраза, -слово — исключить.'}
            />
          </div>
        )}
        {errorMsg && (
          <div className="px-4 py-6 text-[12px] text-kd-danger font-mono">
            ошибка поиска: {errorMsg}
          </div>
        )}
        {showNoResults && !errorMsg && (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              glyph="∅"
              title="ничего не нашлось"
              body={`по запросу «${debounced}» пусто.\nпопробуй другое слово или сними минус-фильтры.`}
            />
          </div>
        )}
        {data && results.length > 0 && (
          <>
            <div className="px-4 py-1.5 text-[10px] font-bold text-kd-text-mute font-mono uppercase tracking-[0.05em] bg-kd-bg-deep border-b border-kd-border-soft">
              — найдено {data.total} {data.total === 1 ? 'сообщение' : 'сообщений'}
              {data.total > results.length && (
                <span className="opacity-60"> · показаны первые {results.length}</span>
              )}
            </div>
            {results.map((r) => (
              <ResultRow key={r.messageId} result={r} onClick={() => openResult(r)} />
            ))}
          </>
        )}
        {isFetching && (
          <div className="px-4 py-2 text-[10px] text-kd-text-mute font-mono text-center">
            ищем…
          </div>
        )}
      </div>
    </div>
  )
}
