import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Icon } from '../../components/Icon.js'
import { ServerIcon } from '../../components/ServerIcon.js'
import { wsClient } from '../../lib/ws.js'
import { listInboxMentions } from '../inbox/api.js'
import { useSettingsUi } from '../settings/store.js'
import { listServers } from './api.js'
import { useServerCreateJoinUi } from './store.js'

interface ServerRailProps {
  activeServerId: string | null
  inDmMode?: boolean
  inInboxMode?: boolean
  inSearchMode?: boolean
}

export function ServerRail({
  activeServerId,
  inDmMode = false,
  inInboxMode = false,
  inSearchMode = false,
}: ServerRailProps) {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const openCreate = useServerCreateJoinUi((s) => s.openCreate)
  const openJoin = useServerCreateJoinUi((s) => s.openJoin)
  const openSettings = useSettingsUi((s) => s.open)
  // Позиция fixed-меню «добавить сервер». null = закрыто. Меню нельзя
  // позиционировать absolute внутри списка: overflow-y-auto контейнера
  // обрезает всё, что выходит за ширину рельсы, — fixed клипу не подвержен.
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null)
  const addRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addMenuPos) return
    function onDown(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddMenuPos(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAddMenuPos(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [addMenuPos])

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: listServers,
    staleTime: 30_000,
  })

  // Глобальный счётчик непрочитанных упоминаний для бейджа на иконке Inbox.
  // Лимит 1 — нас интересует только unreadTotal, выдаваемый эндпоинтом.
  const { data: inboxData } = useQuery({
    queryKey: ['inbox-unread'],
    queryFn: () => listInboxMentions({ limit: 1, unreadOnly: true }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  const inboxUnread = inboxData?.unreadTotal ?? 0

  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t === 'mention') {
        void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
      }
    })
  }, [queryClient])

  return (
    <aside className="bg-kd-bg-deep border-r border-kd-border flex flex-col items-center py-2.5 gap-1.5 min-h-0">
      <button
        type="button"
        onClick={() => navigate('/dm')}
        title="личные сообщения"
        className={[
          'w-9 h-9 rounded-kd flex items-center justify-center text-white font-extrabold text-[13px]',
          'tracking-[-0.04em] select-none transition-all shrink-0',
          inDmMode
            ? 'bg-kd-warm shadow-kd-ring-active'
            : 'bg-kd-warm hover:bg-kd-warm-deep',
        ].join(' ')}
      >
        кд
      </button>
      <div className="w-7 h-px bg-kd-border my-[3px] shrink-0" />

      {/* py-1: ring активного сервера выступает на 3px за иконку — паддинг
          поменьше его подрезал у первого/последнего элемента. */}
      <div className="flex-1 min-h-0 overflow-y-auto kd-scrollbar-hide flex flex-col items-center gap-2.5 w-full py-1">
        {servers.map((s) => (
          <ServerIcon
            key={s.id}
            name={s.name}
            iconUrl={s.iconUrl ?? null}
            active={s.id === activeServerId}
            onClick={() => navigate(`/servers/${s.id}`)}
            title={s.name}
          />
        ))}

        <div className="relative" ref={addRef}>
          <button
            type="button"
            title="добавить сервер"
            onClick={(e) => {
              if (addMenuPos) { setAddMenuPos(null); return }
              const rect = e.currentTarget.getBoundingClientRect()
              setAddMenuPos({
                x: rect.right + 8,
                // Не даём меню уехать за нижний край окна.
                y: Math.min(rect.top, window.innerHeight - 92),
              })
            }}
            className="w-9 h-9 rounded-kd border-[1.5px] border-dashed border-kd-text-mute text-kd-text-mute flex items-center justify-center hover:text-kd-text-soft hover:border-kd-text-soft transition-colors"
          >
            <Icon.Plus size={14} />
          </button>
          {addMenuPos && (
            <div
              className="fixed z-50 w-44 bg-kd-panel rounded-kd border border-kd-border shadow-kd-modal overflow-hidden"
              style={{ left: addMenuPos.x, top: addMenuPos.y }}
            >
              <button
                type="button"
                onClick={() => { setAddMenuPos(null); openCreate() }}
                className="w-full text-left px-3 py-2 text-[12px] text-kd-text hover:bg-kd-panel-hi flex items-center gap-2"
              >
                <span className="font-mono text-[11px] text-kd-accent">+</span>
                создать сервер
              </button>
              <div className="h-px bg-kd-border mx-2" />
              <button
                type="button"
                onClick={() => { setAddMenuPos(null); openJoin() }}
                className="w-full text-left px-3 py-2 text-[12px] text-kd-text hover:bg-kd-panel-hi flex items-center gap-2"
              >
                <span className="font-mono text-[11px] text-kd-warm">↪</span>
                принять инвайт
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mb-1 text-kd-text-soft shrink-0">
        <button
          type="button"
          onClick={() => navigate('/inbox')}
          title={`входящие${inboxUnread > 0 ? ` · ${inboxUnread} непрочитанных` : ''}`}
          className={`relative transition-colors ${inInboxMode ? 'text-kd-warm' : 'hover:text-kd-text'}`}
        >
          <Icon.Inbox size={15} />
          {inboxUnread > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-kd-warm text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none">
              {inboxUnread > 99 ? '99+' : inboxUnread}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => navigate('/search')}
          title="поиск · Ctrl+K"
          className={`transition-colors ${inSearchMode ? 'text-kd-warm' : 'hover:text-kd-text'}`}
        >
          <Icon.Search size={15} />
        </button>
        <button
          type="button"
          onClick={() => openSettings('profile')}
          title="настройки"
          className="transition-colors hover:text-kd-text"
        >
          <Icon.Settings size={15} />
        </button>
      </div>
    </aside>
  )
}
