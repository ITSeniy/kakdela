import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { Channel, MemberPublic } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { Icon } from '../../components/Icon.js'
import { getServerDetail, listMembers } from '../servers/api.js'
import { useServerSettingsUi } from '../settings/store.js'
import { ThreadList } from '../threads/ThreadList.js'
import { useVoiceChannelPresence } from '../voice/useVoiceChannelPresence.js'
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

export function ChannelList({ serverId, activeChannelId }: ChannelListProps) {
  const [, navigate] = useLocation()
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const openServerSettings = useServerSettingsUi((s) => s.open)

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
      <div className="px-3.5 py-2.5 border-b border-kd-border bg-kd-panel-alt flex items-center justify-between shrink-0">
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
        {serverId ? (
          <button
            type="button"
            onClick={() => openServerSettings(serverId)}
            title="настройки сервера"
            className="text-[11px] text-kd-text-mute font-mono hover:text-kd-text-soft transition-colors"
          >
            ⌄
          </button>
        ) : (
          <span className="text-[11px] text-kd-text-mute font-mono">⌄</span>
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
    </aside>
  )
}
