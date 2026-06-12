import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { Channel, MemberPublic } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { confirmDialog } from '../../components/ConfirmDialog.js'
import { Icon } from '../../components/Icon.js'
import { toast } from '../../components/toast/index.js'
import { useAuthStore } from '../auth/store.js'
import { getServerDetail, leaveServer, listMembers } from '../servers/api.js'
import { useServerSettingsUi } from '../settings/store.js'
import { ThreadList } from '../threads/ThreadList.js'
import { useVoiceChannelPresence } from '../voice/useVoiceChannelPresence.js'
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

function groupChannels(channels: Channel[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>()
  // preserve first-seen order
  for (const ch of channels) {
    if (ch.kind === 'dm') continue
    const key = ch.category ?? UNCATEGORIZED_KEY
    let group = map.get(key)
    if (!group) {
      group = { name: ch.category ?? null, channels: [] }
      map.set(key, group)
    }
    group.channels.push(ch)
  }
  for (const g of map.values()) g.channels.sort((a, b) => a.position - b.position)
  return Array.from(map.values())
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

/** Участники голосового канала с «ниточками»-линиями (final-chrome.jsx). */
function VoicePresenceTree({
  userIds,
  memberMap,
  onJump,
}: {
  userIds: string[]
  memberMap: Map<string, MemberPublic>
  onJump(): void
}) {
  if (userIds.length === 0) return null
  return (
    <div className="ml-1 mt-px mb-1 flex flex-col gap-px">
      {userIds.map((uid, i) => {
        const m = memberMap.get(uid)
        const name = m?.displayName ?? '?'
        const isLast = i === userIds.length - 1
        return (
          <button
            key={uid}
            type="button"
            onClick={onJump}
            title="перейти в этот канал"
            className="relative flex items-center gap-[7px] py-[3px] pr-2 pl-[18px] rounded text-left hover:bg-kd-panel-hi/40 transition-colors"
          >
            {/* линия-ниточка: вертикаль + горизонтальный отвод */}
            <span
              className="absolute left-[10px] top-0 w-px bg-kd-border"
              style={{ bottom: isLast ? '50%' : 0 }}
            />
            <span className="absolute left-[10px] top-1/2 w-[6px] h-px bg-kd-border" />
            <Avatar name={name} avatarUrl={m?.avatarUrl ?? null} size={18} />
            <span className="flex-1 min-w-0 truncate text-[12px] text-kd-text font-medium">{name}</span>
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
  const openServerSettings = useServerSettingsUi((s) => s.open)
  const userId = useAuthStore((s) => s.user?.id)

  // Меню действий сервера (шапка) + модалка создания канала/категории.
  const [menuOpen, setMenuOpen] = useState(false)
  const [createMode, setCreateMode] = useState<CreateChannelMode | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)

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
  const groups = useMemo(() => groupChannels(channels), [channels])
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
                onClick={() => { setMenuOpen(false); openServerSettings(serverId, 'invites') }}
              >
                пригласить на сервер
              </ServerMenuItem>
            )}
            <ServerMenuItem
              glyph={<Icon.Settings size={12} className="text-kd-text-mute" />}
              onClick={() => { setMenuOpen(false); openServerSettings(serverId) }}
            >
              настройки сервера
            </ServerMenuItem>
            {canManage && (
              <>
                <div className="my-1 h-px bg-kd-border mx-2" />
                <ServerMenuItem
                  glyph={<Icon.Hash size={12} className="text-kd-accent" />}
                  onClick={() => { setMenuOpen(false); setCreateMode('channel') }}
                >
                  создать канал
                </ServerMenuItem>
                <ServerMenuItem
                  glyph={<span className="text-kd-accent">—</span>}
                  onClick={() => { setMenuOpen(false); setCreateMode('category') }}
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
                <button
                  type="button"
                  onClick={() => toggleCat(catKey)}
                  className="w-full px-2.5 py-[3px] text-[10px] font-semibold text-kd-text-mute font-mono tracking-[0.04em] flex items-center justify-between hover:text-kd-text-soft transition-colors"
                >
                  <span>— {group.name}</span>
                  <span>{collapsed ? '›' : '⌄'}</span>
                </button>
              )}
              {!collapsed && group.channels.map((c) => {
                const presence = c.kind === 'voice' ? voicePresence.get(c.id) ?? [] : []
                const isActive = c.id === activeChannelId
                return (
                  <div key={c.id}>
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
                        userIds={presence}
                        memberMap={memberMap}
                        onJump={() => navigate(`/servers/${c.serverId}/channels/${c.id}`)}
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

      {createMode && serverId && (
        <CreateChannelModal
          serverId={serverId}
          mode={createMode}
          categories={categoryNames}
          onClose={() => setCreateMode(null)}
        />
      )}
    </aside>
  )
}
