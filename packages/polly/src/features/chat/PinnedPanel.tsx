// Поповер закреплённых сообщений канала: открывается из шапки (значок 📌).
// Данные — listPins(channelId), кэш ['pins', channelId] инвалидируется по WS
// msg.pin (см. useMessages). Клик по строке скроллит к сообщению; для тех, у
// кого есть права, доступно «открепить».

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { MemberPublic } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { toast } from '../../components/toast/index.js'
import { listPins, unpinMessage } from './api.js'

function jumpToMessage(id: string) {
  const el = document.querySelector(`[data-message-id="${id}"]`)
  if (!el) {
    toast.info('сообщение выше — прокрути ленту, чтобы увидеть')
    return
  }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  setTimeout(() => {
    el.classList.add('kd-flash')
    el.addEventListener('animationend', () => el.classList.remove('kd-flash'), { once: true })
  }, 100)
}

interface PinnedPanelProps {
  channelId: string
  canPin: boolean
  memberMap: ReadonlyMap<string, MemberPublic>
  onClose(): void
}

export function PinnedPanel({ channelId, canPin, memberMap, onClose }: PinnedPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['pins', channelId],
    queryFn: () => listPins(channelId),
    staleTime: 30_000,
  })
  const pins = data?.messages ?? []

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function unpin(id: string) {
    unpinMessage(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['pins', channelId] }))
      .catch((err) => {
        toast.error('не удалось открепить')
        console.error('[pin] unpin failed', err)
      })
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+6px)] z-50 w-[340px] max-h-[60vh] bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal flex flex-col overflow-hidden"
    >
      <div className="px-3.5 py-2.5 bg-kd-panel-alt border-b border-kd-border text-[12px] font-bold text-kd-text shrink-0">
        закреплённые
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="px-4 py-6 text-center text-[11px] font-mono text-kd-text-mute">загружаем…</div>
        )}
        {!isLoading && pins.length === 0 && (
          <div className="px-4 py-8 text-center text-[11px] text-kd-text-mute leading-relaxed">
            тут пока пусто.<br />закрепляй важное через ПКМ → «закрепить».
          </div>
        )}
        {pins.map((m) => {
          const author = memberMap.get(m.authorId)
          const preview = m.content.trim() || (m.forwarded ? 'пересланное сообщение' : 'вложение')
          return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => { jumpToMessage(m.id); onClose() }}
              onKeyDown={(e) => { if (e.key === 'Enter') { jumpToMessage(m.id); onClose() } }}
              className="group flex gap-2.5 px-3.5 py-2.5 border-b border-kd-border-soft cursor-pointer hover:bg-kd-panel-alt/50 transition-colors"
            >
              <Avatar name={author?.displayName ?? '?'} avatarUrl={author?.avatarUrl ?? null} size={26} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-kd-text truncate">
                  {author?.displayName ?? 'неизвестно'}
                </div>
                <div className="text-[11px] text-kd-text-soft line-clamp-2 break-words">{preview}</div>
              </div>
              {canPin && (
                <button
                  type="button"
                  title="открепить"
                  onClick={(e) => { e.stopPropagation(); unpin(m.id) }}
                  className="self-start shrink-0 text-[10px] font-mono text-kd-text-mute hover:text-kd-danger opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
