import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type {
  Channel,
  ChannelCategory,
  MemberPublic,
  VoiceParticipantPublic,
} from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { confirmDialog } from '../../components/ConfirmDialog.js'
import { Icon } from '../../components/Icon.js'
import { toast } from '../../components/toast/index.js'
import { useAuthStore } from '../auth/store.js'
import {
  deleteCategory,
  deleteChannel,
  getServerDetail,
  leaveServer,
  listMembers,
  patchChannel,
  type ServerDetail,
} from '../servers/api.js'
import { clampFixed, useAppearance } from '../settings/appearance.js'
import { useSettingsUi } from '../settings/store.js'
import { ThreadList } from '../threads/ThreadList.js'
import { moderateVoice } from '../voice/api.js'
import { VoiceUserMenu } from '../voice/VoiceUserMenu.js'
import { useVoiceStore } from '../voice/store.js'
import { useVoiceChannelPresence } from '../voice/useVoiceChannelPresence.js'
import { ChannelSettingsModal } from './ChannelSettingsModal.js'
import { CreateChannelModal, type CreateChannelMode } from './CreateChannelModal.js'
import { UserBar } from './UserBar.js'

interface ChannelListProps {
  serverId: string | null
  activeChannelId: string | null
}

interface CategoryGroup {
  name: string | null
  channels: Channel[]
}

const UNCATEGORIZED_KEY = '__uncategorized__'

// Категории — отдельная сущность (могут быть пустыми): сначала каналы без
// категории, затем категории из таблицы по position. Метки на каналах,
// которых нет в таблице (легаси/гонки), добавляются в конец.
function groupChannels(channels: Channel[], categories: ChannelCategory[]): CategoryGroup[] {
  const uncategorized: CategoryGroup = { name: null, channels: [] }
  const groups: CategoryGroup[] = [uncategorized]
  const byName = new Map<string, CategoryGroup>()
  for (const cat of [...categories].sort((a, b) => a.position - b.position)) {
    const g: CategoryGroup = { name: cat.name, channels: [] }
    groups.push(g)
    byName.set(cat.name, g)
  }
  for (const ch of channels) {
    if (ch.kind === 'dm') continue
    const name = ch.category ?? null
    if (name === null) {
      uncategorized.channels.push(ch)
      continue
    }
    let g = byName.get(name)
    if (!g) {
      g = { name, channels: [] }
      groups.push(g)
      byName.set(name, g)
    }
    g.channels.push(ch)
  }
  for (const g of groups) g.channels.sort((a, b) => a.position - b.position)
  // Безымянную группу без каналов не рендерим, именованные живут и пустыми.
  return groups.filter((g) => g.name !== null || g.channels.length > 0)
}

function ChannelRow({
  channel, active, live, onClick,
}: {
  channel: Channel
  active: boolean
  live: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-[calc(100%-8px)] mx-1 flex items-center gap-1.5 text-[12px] rounded text-left transition-colors',
        'px-2 py-[3px] mb-px',
        active
          ? 'bg-kd-panel-hi text-kd-text font-semibold border-l-2 border-kd-accent pl-[6px]'
          : 'text-kd-text-soft hover:text-kd-text font-medium border-l-2 border-transparent',
      ].join(' ')}
    >
      {channel.kind === 'voice' ? <Icon.Speaker size={11} /> : <Icon.Hash size={11} />}
      <span className="flex-1 truncate">{channel.name}</span>
      {live && <Badge variant="live">LIVE</Badge>}
    </button>
  )
}

/** Готовая к отрисовке строка участника голосового канала. */
interface VoiceUserRow {
  userId: string
  name: string
  avatarUrl: string | null
  speaking: boolean
  muted: boolean
  deafened: boolean
  live: boolean
  serverMuted: boolean
  serverDeafened: boolean
}

/** Участники голосового канала с «ниточками»-линиями (final-chrome.jsx). */
function VoicePresenceTree({
  rows,
  channelId,
  canManage,
  onJump,
  onUserMenu,
  onUserDragStart,
  onUserDragEnd,
}: {
  rows: VoiceUserRow[]
  channelId: string
  canManage: boolean
  onJump(): void
  onUserMenu(e: React.MouseEvent, channelId: string, row: VoiceUserRow): void
  onUserDragStart(channelId: string, userId: string): void
  onUserDragEnd(): void
}) {
  // Заливка под курсором — отключаемая в настройках внешнего вида.
  const hoverCls = useAppearance((s) => s.hoverHighlight) ? 'hover:bg-kd-hover' : ''
  if (rows.length === 0) return null
  return (
    <div className="ml-1 mt-px mb-1 flex flex-col gap-0.5">
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1
        return (
          <button
            key={row.userId}
            type="button"
            onClick={onJump}
            onContextMenu={(e) => onUserMenu(e, channelId, row)}
            draggable={canManage}
            onDragStart={(e) => {
              // stopPropagation: иначе bubbling запустит drag самого канала.
              e.stopPropagation()
              e.dataTransfer.setData('text/plain', row.userId)
              e.dataTransfer.effectAllowed = 'move'
              onUserDragStart(channelId, row.userId)
            }}
            onDragEnd={(e) => {
              e.stopPropagation()
              onUserDragEnd()
            }}
            title="перейти в этот канал"
            className={`relative flex items-center gap-[7px] py-1 pr-2 pl-[18px] rounded text-left transition-colors ${hoverCls}`}
          >
            {/* линия-ниточка: вертикаль + горизонтальный отвод */}
            <span
              className="absolute left-[10px] top-0 w-px bg-kd-border"
              style={{ bottom: isLast ? '50%' : 0 }}
            />
            <span className="absolute left-[10px] top-1/2 w-[6px] h-px bg-kd-border" />
            <Avatar
              name={row.name}
              avatarUrl={row.avatarUrl}
              size={18}
              ring={row.speaking ? 'var(--kd-online)' : undefined}
              ringColor="var(--kd-panel)"
            />
            <span className="flex-1 min-w-0 truncate text-[12px] text-kd-text font-medium">
              {row.name}
            </span>
            {row.live && <Badge variant="live">LIVE</Badge>}
            {row.deafened && <Icon.HeadphonesOff size={11} className="text-kd-dnd shrink-0" />}
            {row.muted && <Icon.MicOff size={11} className="text-kd-dnd shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}

/** Пункт меню действий сервера (стиль — как меню «добавить сервер» в рельсе). */
function ServerMenuItem({
  glyph, danger, onClick, children,
}: {
  glyph: React.ReactNode
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors',
        danger ? 'text-kd-danger hover:bg-kd-danger/10' : 'text-kd-text hover:bg-kd-panel-hi',
      ].join(' ')}
    >
      <span className="w-3.5 shrink-0 flex items-center justify-center font-mono text-[11px]">
        {glyph}
      </span>
      {children}
    </button>
  )
}

export function ChannelList({ serverId, activeChannelId }: ChannelListProps) {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const openSettings = useSettingsUi((s) => s.open)
  const userId = useAuthStore((s) => s.user?.id)

  // Меню действий сервера (шапка) + модалка создания канала/категории.
  const [menuOpen, setMenuOpen] = useState(false)
  const [createState, setCreateState] =
    useState<{ mode: CreateChannelMode; category?: string } | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Контекстные меню: ПКМ по строке канала / по заголовку категории.
  const [channelMenu, setChannelMenu] = useState<{ x: number; y: number; channel: Channel } | null>(null)
  const channelMenuRef = useRef<HTMLDivElement>(null)
  const [settingsChannel, setSettingsChannel] = useState<Channel | null>(null)
  const [catMenu, setCatMenu] = useState<{ x: number; y: number; name: string } | null>(null)
  const catMenuRef = useRef<HTMLDivElement>(null)

  // Drag & drop каналов: id перетягиваемого + куда сейчас целимся.
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<
    | { kind: 'row'; channelId: string; above: boolean }
    | { kind: 'cat'; category: string }
    | null
  >(null)

  // Drag & drop участника голосового канала (admin): перенос между ГС.
  const [dragUser, setDragUser] = useState<{ userId: string; fromChannelId: string } | null>(null)
  const [dropVoiceChannelId, setDropVoiceChannelId] = useState<string | null>(null)

  // ПКМ по участнику голосового канала.
  const [voiceUserMenu, setVoiceUserMenu] = useState<
    { x: number; y: number; channelId: string; row: VoiceUserRow } | null
  >(null)

  // Live-состояние своего голосового подключения — для точных индикаторов
  // в дереве канала, в котором мы сидим (speaking есть только там).
  const activeVoiceChannelId = useVoiceStore((s) => s.activeChannelId)
  const activeSpeakers = useVoiceStore((s) => s.activeSpeakers)
  const selfSpeaking = useVoiceStore((s) => s.selfSpeaking)
  const liveParticipants = useVoiceStore((s) => s.participants)
  const selfMuted = useVoiceStore((s) => s.muted)
  const selfDeafened = useVoiceStore((s) => s.deafened)

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!channelMenu) return
    function onDown(e: MouseEvent) {
      if (channelMenuRef.current && !channelMenuRef.current.contains(e.target as Node)) {
        setChannelMenu(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setChannelMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [channelMenu])

  useEffect(() => {
    if (!catMenu) return
    function onDown(e: MouseEvent) {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatMenu(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCatMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [catMenu])

  const { data: detail } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => getServerDetail(serverId!),
    enabled: serverId !== null,
    staleTime: 30_000,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => listMembers(serverId!),
    enabled: serverId !== null,
    staleTime: 60_000,
  })

  const memberMap = useMemo(() => {
    const m = new Map<string, MemberPublic>()
    for (const x of members) m.set(x.id, x)
    return m
  }, [members])

  const onlineCount = useMemo(
    () => members.reduce((n, m) => (m.status !== 'offline' ? n + 1 : n), 0),
    [members],
  )

  const channels = detail?.channels ?? []
  const categories = detail?.categories ?? []
  const groups = useMemo(() => groupChannels(channels, categories), [channels, categories])
  const voicePresence = useVoiceChannelPresence(channels)

  const myRole = userId ? memberMap.get(userId)?.role : undefined
  const canManage = myRole === 'owner' || myRole === 'admin'
  const isOwner = myRole === 'owner'
  const categoryNames = useMemo(
    () => groups.map((g) => g.name).filter((n): n is string => n !== null),
    [groups],
  )

  const leaveMutation = useMutation({
    mutationFn: () => leaveServer(serverId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers'] })
      navigate('/')
    },
    onError: (err) => {
      toast.error(`не получилось выйти: ${(err as Error).message}`)
    },
  })

  async function confirmLeave() {
    if (!detail) return
    setMenuOpen(false)
    const ok = await confirmDialog({
      title: `выйти из «${detail.server.name}»?`,
      confirmLabel: 'выйти',
      danger: true,
    })
    if (ok) leaveMutation.mutate()
  }

  const deleteChannelMutation = useMutation({
    mutationFn: (channelId: string) => deleteChannel(channelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['server', serverId] })
    },
    onError: (err) => {
      toast.error(`не получилось удалить канал: ${(err as Error).message}`)
    },
  })

  async function confirmDeleteChannel(ch: Channel) {
    setChannelMenu(null)
    const ok = await confirmDialog({
      title: `удалить «${ch.name}»?`,
      body: 'канал удалится вместе со всеми сообщениями. это необратимо.',
      confirmLabel: 'удалить',
      danger: true,
    })
    if (ok) deleteChannelMutation.mutate(ch.id)
  }

  const deleteCategoryMutation = useMutation({
    mutationFn: (name: string) => deleteCategory(serverId!, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['server', serverId] })
    },
    onError: (err) => {
      toast.error(`не получилось удалить категорию: ${(err as Error).message}`)
    },
  })

  async function confirmDeleteCategory(name: string) {
    setCatMenu(null)
    const ok = await confirmDialog({
      title: `удалить категорию «${name}»?`,
      body: 'каналы останутся на месте — просто без категории.',
      confirmLabel: 'удалить',
      danger: true,
    })
    if (ok) deleteCategoryMutation.mutate(name)
  }

  const moderateMutation = useMutation({
    mutationFn: (vars: {
      channelId: string
      userId: string
      action: 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'kick' | 'move'
      toChannelId?: string
    }) =>
      moderateVoice(vars.channelId, {
        userId: vars.userId,
        action: vars.action,
        ...(vars.toChannelId ? { toChannelId: vars.toChannelId } : {}),
      }),
    onError: (err) => {
      toast.error(`не получилось: ${(err as Error).message}`)
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['voiceParticipants', vars.channelId] })
      if (vars.toChannelId) {
        void queryClient.invalidateQueries({ queryKey: ['voiceParticipants', vars.toChannelId] })
      }
    },
  })

  /** Строки дерева участников ГС: для своего канала — live-данные из
   *  voice store (точные mute/стрим + speaking), для остальных —
   *  presence-снапшот с WS-патчами. */
  function buildVoiceRows(channelId: string, entries: VoiceParticipantPublic[]): VoiceUserRow[] {
    const isActiveChannel = channelId === activeVoiceChannelId
    return entries.map((e) => {
      const m = memberMap.get(e.userId)
      const live = isActiveChannel ? liveParticipants.get(e.userId) : undefined
      const isSelf = e.userId === userId
      const serverMuted = e.serverMuted
      const serverDeafened = e.serverDeafened
      const muted = serverMuted || (isSelf && isActiveChannel
        ? selfMuted
        : live?.isMuted ?? e.isMuted)
      const deafened = serverDeafened || (isSelf && isActiveChannel && selfDeafened)
      return {
        userId: e.userId,
        name: m?.displayName || e.displayName || '?',
        avatarUrl: m?.avatarUrl ?? null,
        // Для себя — только локальный измеритель (мгновенно загорается и
        // гаснет); серверный сигнал для себя залипает на секунды.
        speaking: isActiveChannel
          && (isSelf ? selfSpeaking : activeSpeakers.has(e.userId)),
        muted,
        deafened,
        live: live?.isScreenSharing ?? e.isScreenSharing,
        serverMuted,
        serverDeafened,
      }
    })
  }

  function openVoiceUserMenu(e: React.MouseEvent, channelId: string, row: VoiceUserRow) {
    // На себе меню не открываем: локальный мьют самого себя бессмысленен,
    // а админ-действия над собой доступны обычными тумблерами.
    if (row.userId === userId) return
    e.preventDefault()
    e.stopPropagation()
    setVoiceUserMenu({ x: e.clientX, y: e.clientY, channelId, row })
  }

  function performUserDrop(toChannelId: string) {
    const du = dragUser
    setDragUser(null)
    setDropVoiceChannelId(null)
    if (!du) return
    if (toChannelId === du.fromChannelId) return
    const target = channels.find((x) => x.id === toChannelId)
    if (!target || target.kind !== 'voice') return
    moderateMutation.mutate({
      channelId: du.fromChannelId,
      userId: du.userId,
      action: 'move',
      toChannelId,
    })
  }

  const reorderMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; position: number; category: string | null }>) => {
      // Последовательно: бэк применяет каждый PATCH отдельно, параллельная
      // пачка для пары десятков каналов не стоит гонок в аудит-логе.
      for (const u of updates) {
        await patchChannel(u.id, { position: u.position, category: u.category })
      }
    },
    onError: () => {
      toast.error('не получилось переставить каналы')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['server', serverId] })
    },
  })

  /** Применяет текущий dropTarget: пересобирает порядок групп и шлёт PATCH
   *  только тем каналам, у кого реально изменилась позиция или категория.
   *  Локально порядок применяется оптимистично через setQueryData. */
  function performDrop() {
    const draggedId = dragId
    const target = dropTarget
    setDragId(null)
    setDropTarget(null)
    if (!draggedId || !target || !detail) return
    const dragged = channels.find((c) => c.id === draggedId)
    if (!dragged) return

    const newGroups = groups.map((g) => ({
      name: g.name,
      channels: g.channels.filter((c) => c.id !== draggedId),
    }))

    let inserted = false
    if (target.kind === 'cat') {
      const g = newGroups.find((x) => x.name === target.category)
      if (g) {
        g.channels.unshift(dragged)
        inserted = true
      }
    } else {
      for (const g of newGroups) {
        const i = g.channels.findIndex((c) => c.id === target.channelId)
        if (i >= 0) {
          g.channels.splice(target.above ? i : i + 1, 0, dragged)
          inserted = true
          break
        }
      }
    }
    if (!inserted) return

    // Позиции глобальные на сервер (detail отдаёт orderBy position),
    // поэтому перенумеровываем сквозную раскладку группа за группой.
    const updates: Array<{ id: string; position: number; category: string | null }> = []
    let pos = 0
    for (const g of newGroups) {
      for (const c of g.channels) {
        if (c.position !== pos || (c.category ?? null) !== g.name) {
          updates.push({ id: c.id, position: pos, category: g.name })
        }
        pos += 1
      }
    }
    if (updates.length === 0) return

    queryClient.setQueryData<ServerDetail>(['server', serverId], (old) => {
      if (!old) return old
      const map = new Map(updates.map((u) => [u.id, u] as const))
      const nextChannels = old.channels
        .map((c) => {
          const u = map.get(c.id)
          return u ? { ...c, position: u.position, category: u.category } : c
        })
        .sort((a, b) => a.position - b.position)
      return { ...old, channels: nextChannels }
    })
    reorderMutation.mutate(updates)
  }

  function toggleCat(name: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <aside className="bg-kd-panel border-r border-kd-border flex flex-col min-h-0">
      {/* Шапка целиком кликабельна и открывает меню действий сервера
          (как в Discord). Дропдаун absolute — aside не имеет overflow,
          клипаться нечему. */}
      <div ref={headerRef} className="relative shrink-0">
        <button
          type="button"
          disabled={!serverId || !detail}
          onClick={() => setMenuOpen((v) => !v)}
          title="действия сервера"
          className="w-full px-3.5 py-2.5 border-b border-kd-border bg-kd-panel-alt hover:bg-kd-panel-hi transition-colors flex items-center justify-between text-left"
        >
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-kd-text truncate">
              {detail?.server.name ?? '—'}
            </div>
            {detail && (
              <div className="text-[10px] text-kd-text-soft mt-px flex items-center gap-[5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-kd-online shrink-0" />
                <span className="text-kd-online font-semibold font-mono">{onlineCount}</span>
                <span>онлайн / {detail.memberCount} всего</span>
              </div>
            )}
          </div>
          <span
            className={`text-[11px] text-kd-text-mute font-mono transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          >
            ⌄
          </span>
        </button>

        {menuOpen && serverId && (
          <div className="absolute left-2 right-2 top-full mt-1.5 z-50 bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal py-1 overflow-hidden">
            {canManage && (
              <ServerMenuItem
                glyph={<span className="text-kd-warm">↪</span>}
                onClick={() => { setMenuOpen(false); openSettings('server-invites', serverId) }}
              >
                пригласить на сервер
              </ServerMenuItem>
            )}
            <ServerMenuItem
              glyph={<Icon.Settings size={12} className="text-kd-text-mute" />}
              onClick={() => { setMenuOpen(false); openSettings('server-overview', serverId) }}
            >
              настройки сервера
            </ServerMenuItem>
            {canManage && (
              <>
                <div className="my-1 h-px bg-kd-border mx-2" />
                <ServerMenuItem
                  glyph={<Icon.Hash size={12} className="text-kd-accent" />}
                  onClick={() => { setMenuOpen(false); setCreateState({ mode: 'channel' }) }}
                >
                  создать канал
                </ServerMenuItem>
                <ServerMenuItem
                  glyph={<span className="text-kd-accent">—</span>}
                  onClick={() => { setMenuOpen(false); setCreateState({ mode: 'category' }) }}
                >
                  создать категорию
                </ServerMenuItem>
              </>
            )}
            {!isOwner && (
              <>
                <div className="my-1 h-px bg-kd-border mx-2" />
                <ServerMenuItem glyph="←" danger onClick={() => void confirmLeave()}>
                  покинуть сервер
                </ServerMenuItem>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 px-1">
        {groups.map((group) => {
          const catKey = group.name ?? UNCATEGORIZED_KEY
          const collapsed = collapsedCats.has(catKey)
          return (
            <div key={catKey} className="mb-1.5">
              {group.name && (
                <div
                  className={[
                    'group flex items-center gap-0.5 pr-1.5 rounded transition-colors',
                    dropTarget?.kind === 'cat' && dropTarget.category === group.name
                      ? 'bg-kd-panel-hi/60'
                      : '',
                  ].join(' ')}
                  onDragOver={(e) => {
                    if (!dragId) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDropTarget({ kind: 'cat', category: group.name! })
                  }}
                  onDrop={(e) => { e.preventDefault(); performDrop() }}
                  onContextMenu={(e) => {
                    if (!canManage) return
                    e.preventDefault()
                    setCatMenu({ x: e.clientX, y: e.clientY, name: group.name! })
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleCat(catKey)}
                    className="flex-1 min-w-0 px-2.5 py-[3px] text-[10px] font-semibold text-kd-text-mute font-mono tracking-[0.04em] flex items-center gap-1 hover:text-kd-text-soft transition-colors text-left"
                  >
                    <span className={`inline-block transition-transform ${collapsed ? '-rotate-90' : ''}`}>
                      ⌄
                    </span>
                    <span className="truncate">{group.name}</span>
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      title={`создать канал в «${group.name}»`}
                      onClick={() => setCreateState({ mode: 'channel', category: group.name ?? undefined })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-kd-text-mute hover:text-kd-text-soft p-0.5 shrink-0"
                    >
                      <Icon.Plus size={11} />
                    </button>
                  )}
                </div>
              )}
              {!collapsed && group.channels.map((c) => {
                const presence = c.kind === 'voice' ? voicePresence.get(c.id) ?? [] : []
                const isActive = c.id === activeChannelId
                const isDropRow = dropTarget?.kind === 'row' && dropTarget.channelId === c.id
                return (
                  <div
                    key={c.id}
                    className={[
                      'relative',
                      dragId === c.id ? 'opacity-40' : '',
                      dropVoiceChannelId === c.id ? 'bg-kd-accent/10 rounded' : '',
                    ].join(' ')}
                    draggable={canManage}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', c.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDragId(c.id)
                    }}
                    onDragEnd={() => { setDragId(null); setDropTarget(null) }}
                    onDragOver={(e) => {
                      // Перетаскивают участника ГС — каналы-приёмники
                      // только голосовые (и не его текущий).
                      if (dragUser) {
                        if (c.kind === 'voice' && c.id !== dragUser.fromChannelId) {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          setDropVoiceChannelId(c.id)
                        } else if (dropVoiceChannelId !== null) {
                          setDropVoiceChannelId(null)
                        }
                        return
                      }
                      if (!dragId || dragId === c.id) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      const rect = e.currentTarget.getBoundingClientRect()
                      const above = e.clientY < rect.top + rect.height / 2
                      setDropTarget({ kind: 'row', channelId: c.id, above })
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragUser) { performUserDrop(c.id); return }
                      performDrop()
                    }}
                    onContextMenu={(e) => {
                      if (!canManage) return
                      // ПКМ по участнику обрабатывается на самой строке.
                      if (e.defaultPrevented) return
                      e.preventDefault()
                      setChannelMenu({ x: e.clientX, y: e.clientY, channel: c })
                    }}
                  >
                    {isDropRow && (
                      <div
                        className={`absolute left-1.5 right-1.5 h-0.5 rounded bg-kd-accent z-10 pointer-events-none ${
                          dropTarget.above ? 'top-0' : 'bottom-0'
                        }`}
                      />
                    )}
                    <ChannelRow
                      channel={c}
                      active={isActive}
                      live={c.kind === 'voice' && presence.length > 0}
                      onClick={() => {
                        navigate(`/servers/${c.serverId}/channels/${c.id}`)
                      }}
                    />
                    {c.kind === 'voice' && (
                      <VoicePresenceTree
                        rows={buildVoiceRows(c.id, presence)}
                        channelId={c.id}
                        canManage={canManage}
                        onJump={() => navigate(`/servers/${c.serverId}/channels/${c.id}`)}
                        onUserMenu={openVoiceUserMenu}
                        onUserDragStart={(chId, uid) => setDragUser({ userId: uid, fromChannelId: chId })}
                        onUserDragEnd={() => { setDragUser(null); setDropVoiceChannelId(null) }}
                      />
                    )}
                    {isActive && c.kind === 'text' && <ThreadList channelId={c.id} />}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <UserBar />

      {channelMenu && (
        <div
          ref={channelMenuRef}
          className="fixed z-50 min-w-[160px] bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal py-1 select-none"
          style={{
            left: clampFixed(channelMenu.x, 168, window.innerWidth),
            top: clampFixed(channelMenu.y, 48, window.innerHeight),
          }}
        >
          <button
            type="button"
            onClick={() => { setSettingsChannel(channelMenu.channel); setChannelMenu(null) }}
            className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 text-kd-text-soft hover:bg-kd-panel-hi hover:text-kd-text transition-colors"
          >
            <Icon.Settings size={12} />
            настройки канала
          </button>
          <div className="h-px bg-kd-border my-1" />
          <button
            type="button"
            onClick={() => void confirmDeleteChannel(channelMenu.channel)}
            className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 text-kd-danger hover:bg-kd-danger/10 transition-colors"
          >
            <Icon.Trash size={12} />
            удалить канал
          </button>
        </div>
      )}

      {settingsChannel && (
        <ChannelSettingsModal
          channel={settingsChannel}
          onClose={() => setSettingsChannel(null)}
        />
      )}

      {voiceUserMenu && (
        <VoiceUserMenu
          x={voiceUserMenu.x}
          y={voiceUserMenu.y}
          target={{
            channelId: voiceUserMenu.channelId,
            userId: voiceUserMenu.row.userId,
            name: voiceUserMenu.row.name,
            live: voiceUserMenu.row.live,
            serverMuted: voiceUserMenu.row.serverMuted,
            serverDeafened: voiceUserMenu.row.serverDeafened,
          }}
          canManage={canManage}
          onClose={() => setVoiceUserMenu(null)}
        />
      )}

      {catMenu && (
        <div
          ref={catMenuRef}
          className="fixed z-50 min-w-[160px] bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal py-1 select-none"
          style={{
            left: clampFixed(catMenu.x, 168, window.innerWidth),
            top: clampFixed(catMenu.y, 48, window.innerHeight),
          }}
        >
          <button
            type="button"
            onClick={() => void confirmDeleteCategory(catMenu.name)}
            className="w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 text-kd-danger hover:bg-kd-danger/10 transition-colors"
          >
            <Icon.Trash size={12} />
            удалить категорию
          </button>
        </div>
      )}

      {createState && serverId && (
        <CreateChannelModal
          serverId={serverId}
          mode={createState.mode}
          categories={categoryNames}
          initialCategory={createState.category}
          onClose={() => setCreateState(null)}
        />
      )}
    </aside>
  )
}
