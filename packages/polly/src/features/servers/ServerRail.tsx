import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { confirmDialog } from '../../components/ConfirmDialog.js'
import { ContextMenu, useContextMenu, type MenuEntry } from '../../components/ContextMenu.js'
import { Icon } from '../../components/Icon.js'
import { ServerIcon } from '../../components/ServerIcon.js'
import { toast } from '../../components/toast/index.js'
import { ApiError } from '../../lib/api.js'
import { wsClient } from '../../lib/ws.js'
import { leaveServer, markServerRead } from './api.js'
import { listDms } from '../dm/api.js'
import { listInboxMentions } from '../inbox/api.js'
import { useViewScope } from '../navigation/viewScope.js'
import { useUnreadByServer } from '../notify/unread.js'
import { getUiZoom } from '../settings/appearance.js'
import { useSettingsUi } from '../settings/store.js'
import { listServers } from './api.js'
import { useServerCreateJoinUi } from './store.js'

interface ServerRailProps {
  activeServerId: string | null
  inDmMode?: boolean
  inInboxMode?: boolean
  inSearchMode?: boolean
}

// Порядок серверов в рельсе — личное дело каждого устройства (как и в
// Discord порядок локален для аккаунта; бэкенд-поля у нас нет).
const useServerOrder = create<{ order: string[]; setOrder(order: string[]): void }>()(
  persist(
    (set) => ({
      order: [],
      setOrder: (order) => set({ order }),
    }),
    { name: 'kd:server-order' },
  ),
)

export function ServerRail({
  activeServerId,
  inDmMode = false,
  inInboxMode = false,
  inSearchMode = false,
}: ServerRailProps) {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const clearScope = useViewScope((s) => s.clear)
  const openCreate = useServerCreateJoinUi((s) => s.openCreate)
  const openJoin = useServerCreateJoinUi((s) => s.openJoin)
  const openSettings = useSettingsUi((s) => s.open)
  const closeSettings = useSettingsUi((s) => s.close)
  const settingsOpen = useSettingsUi((s) => s.isOpen)
  // Позиция fixed-меню «добавить сервер». null = закрыто. Меню нельзя
  // позиционировать absolute внутри списка: overflow-y-auto контейнера
  // обрезает всё, что выходит за ширину рельсы, — fixed клипу не подвержен.
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null)
  const addRef = useRef<HTMLDivElement>(null)

  // ПКМ по иконке сервера: настройки / пригласить / покинуть.
  const srvMenu = useContextMenu()
  const [menuServer, setMenuServer] = useState<{ id: string; name: string } | null>(null)

  function serverMenuItems(s: { id: string; name: string }): MenuEntry[] {
    return [
      {
        label: 'пометить прочитанным',
        onClick: () => {
          void markServerRead(s.id).then(() => queryClient.invalidateQueries({ queryKey: ['unread', s.id] }))
        },
      },
      { label: 'настройки сервера', onClick: () => openSettings('server-overview', s.id) },
      { label: 'пригласить на сервер', onClick: () => openSettings('server-invites', s.id) },
      { kind: 'sep' },
      {
        label: 'покинуть сервер',
        danger: true,
        onClick: () => {
          void confirmDialog({ title: `покинуть «${s.name}»?`, confirmLabel: 'покинуть', danger: true })
            .then((ok) => {
              if (!ok) return
              leaveServer(s.id)
                .then(() => {
                  void queryClient.invalidateQueries({ queryKey: ['servers'] })
                  navigate('/')
                })
                .catch((err) => {
                  toast.error(
                    err instanceof ApiError && err.code === 'owner-cannot-leave'
                      ? 'хозяин не может покинуть сервер — сначала передайте владение или удалите его'
                      : 'не удалось покинуть сервер',
                  )
                })
            })
        },
      },
    ]
  }

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

  // Drag&drop порядка серверов: сортируем по сохранённому списку id,
  // новые сервера — в конец в исходном порядке.
  const order = useServerOrder((s) => s.order)
  const setOrder = useServerOrder((s) => s.setOrder)
  const [dragServerId, setDragServerId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const sortedServers = useMemo(() => {
    const idx = new Map(order.map((id, i) => [id, i]))
    return [...servers].sort((a, b) => {
      const ia = idx.get(a.id) ?? Number.MAX_SAFE_INTEGER
      const ib = idx.get(b.id) ?? Number.MAX_SAFE_INTEGER
      return ia - ib
    })
  }, [servers, order])

  function performServerDrop() {
    const dragged = dragServerId
    const target = dropIndex
    setDragServerId(null)
    setDropIndex(null)
    if (!dragged || target === null) return
    const ids = sortedServers.map((s) => s.id).filter((id) => id !== dragged)
    const from = sortedServers.findIndex((s) => s.id === dragged)
    // target — индекс «вставить перед»; после удаления перетаскиваемого
    // индексы правее него сдвигаются на 1.
    const insertAt = target > from ? target - 1 : target
    ids.splice(Math.max(0, Math.min(ids.length, insertAt)), 0, dragged)
    setOrder(ids)
  }

  // Глобальный счётчик непрочитанных упоминаний для бейджа на иконке Inbox.
  // Лимит 1 — нас интересует только unreadTotal, выдаваемый эндпоинтом.
  const { data: inboxData } = useQuery({
    queryKey: ['inbox-unread'],
    queryFn: () => listInboxMentions({ limit: 1, unreadOnly: true }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  const inboxUnread = inboxData?.unreadTotal ?? 0

  // Непрочитанные упоминания по серверам — для точек-бейджей на иконках.
  const unreadByServer = useUnreadByServer()

  // Суммарный непрочитанный личных сообщений — бейдж на «кд»-кнопке (дом).
  const { data: dms } = useQuery({
    queryKey: ['dm-list'],
    queryFn: listDms,
    staleTime: 10_000,
  })
  const dmUnread = (dms ?? []).reduce((sum, d) => sum + d.unreadCount, 0)

  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t === 'mention') {
        void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
        void queryClient.invalidateQueries({ queryKey: ['inbox-unread-by-server'] })
      }
    })
  }, [queryClient])

  return (
    <aside className="bg-kd-bg-deep border-r border-kd-border flex flex-col items-center py-2.5 gap-1.5 min-h-0">
      <button
        type="button"
        onClick={() => navigate('/dm')}
        title={`личные сообщения${dmUnread > 0 ? ` · ${dmUnread} непрочитанных` : ''}`}
        className={[
          'relative w-9 h-9 rounded-kd flex items-center justify-center text-white font-extrabold text-[13px]',
          'tracking-[-0.04em] select-none transition-all shrink-0',
          inDmMode
            ? 'bg-kd-warm shadow-kd-ring-active'
            : 'bg-kd-warm hover:bg-kd-warm-deep',
        ].join(' ')}
      >
        кд
        {dmUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-kd-danger text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none ring-2 ring-kd-bg-deep pointer-events-none">
            {dmUnread > 99 ? '99+' : dmUnread}
          </span>
        )}
      </button>
      <div className="w-7 h-px bg-kd-border my-[3px] shrink-0" />

      {/* py-1: ring активного сервера выступает на 3px за иконку — паддинг
          поменьше его подрезал у первого/последнего элемента. */}
      <div className="flex-1 min-h-0 overflow-y-auto kd-scrollbar-hide flex flex-col items-center gap-2.5 w-full py-1">
        {sortedServers.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', s.id)
              e.dataTransfer.effectAllowed = 'move'
              setDragServerId(s.id)
            }}
            onDragEnd={() => { setDragServerId(null); setDropIndex(null) }}
            onDragOver={(e) => {
              if (!dragServerId) return
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const above = e.clientY < rect.top + rect.height / 2
              setDropIndex(above ? i : i + 1)
            }}
            onDrop={(e) => { e.preventDefault(); performServerDrop() }}
            className="relative"
          >
            {/* индикатор вставки */}
            {dragServerId && dropIndex === i && (
              <span className="absolute -top-[6px] left-1 right-1 h-0.5 rounded bg-kd-accent pointer-events-none" />
            )}
            {dragServerId && dropIndex === i + 1 && (
              <span className="absolute -bottom-[6px] left-1 right-1 h-0.5 rounded bg-kd-accent pointer-events-none" />
            )}
            <span
              className={dragServerId === s.id ? 'opacity-40 block' : 'block'}
              onContextMenu={(e) => { setMenuServer({ id: s.id, name: s.name }); srvMenu.open(e) }}
            >
              <ServerIcon
                name={s.name}
                iconUrl={s.iconUrl ?? null}
                active={s.id === activeServerId}
                // Клик по серверу в настройках — выход из них (возврат на сервер).
                onClick={() => { if (settingsOpen) closeSettings(); navigate(`/servers/${s.id}`) }}
                title={s.name}
              />
            </span>
            {(() => {
              const u = unreadByServer.get(s.id) ?? 0
              if (u === 0 || dragServerId === s.id) return null
              return (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-kd-warm text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none ring-2 ring-kd-bg-deep pointer-events-none z-10">
                  {u > 99 ? '99+' : u}
                </span>
              )
            })()}
          </div>
        ))}

        <div className="relative" ref={addRef}>
          <button
            type="button"
            title="добавить сервер"
            onClick={(e) => {
              if (addMenuPos) { setAddMenuPos(null); return }
              const rect = e.currentTarget.getBoundingClientRect()
              // CSS zoom масштабирует и fixed-слой: координаты якоря делим на
              // zoom, иначе на 125/150% меню уезжает вправо от кнопки.
              const z = getUiZoom()
              setAddMenuPos({
                x: (rect.right + 8) / z,
                // Не даём меню уехать за нижний край окна.
                y: Math.min(rect.top, window.innerHeight - 92) / z,
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
          onClick={() => { clearScope(); navigate('/inbox') }}
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
          onClick={() => { clearScope(); navigate('/search') }}
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

      {srvMenu.pos && menuServer && (
        <ContextMenu x={srvMenu.pos.x} y={srvMenu.pos.y} items={serverMenuItems(menuServer)} onClose={srvMenu.close} />
      )}
    </aside>
  )
}
