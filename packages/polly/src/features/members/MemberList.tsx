import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { MemberPublic } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { Icon } from '../../components/Icon.js'
import { wsClient } from '../../lib/ws.js'
import { useProfileUi } from '../profile/store.js'
import { getServerDetail, listMembers } from '../servers/api.js'
import { useVoiceChannelPresence } from '../voice/useVoiceChannelPresence.js'

interface MemberListProps {
  serverId: string | null
  className?: string
}

interface MemberGroup {
  title: string
  key: string
  members: MemberPublic[]
  /** Группа «в голосе» подсвечивается accent-фоном (final-chrome.jsx). */
  voice?: boolean
}

const ROLE_TITLES: Record<'owner' | 'admin' | 'member', string> = {
  owner: 'хозяин',
  admin: 'админы',
  member: 'свои',
}

const STATUS_ORDER: Record<MemberPublic['status'], number> = {
  online: 0, idle: 1, dnd: 2, offline: 3,
}

/** Самая старшая hoist-роль участника (для группировки в списке). */
function topHoistRole(m: MemberPublic): MemberPublic['roles'][number] | null {
  let best: MemberPublic['roles'][number] | null = null
  for (const r of m.roles) {
    if (!r.hoist) continue
    if (!best || r.position > best.position) best = r
  }
  return best
}

/** Цвет имени = самая старшая роль с цветом. */
export function memberNameColor(m: MemberPublic): string | null {
  let best: MemberPublic['roles'][number] | null = null
  for (const r of m.roles) {
    if (!r.color) continue
    if (!best || r.position > best.position) best = r
  }
  return best?.color ?? null
}

function groupMembers(members: MemberPublic[], voiceIds: Set<string>): MemberGroup[] {
  const inVoice = members.filter((m) => voiceIds.has(m.id))
  const rest = members.filter((m) => !voiceIds.has(m.id))
  const online = rest.filter((m) => m.status !== 'offline')
  const offline = rest.filter((m) => m.status === 'offline')

  const sortFn = (a: MemberPublic, b: MemberPublic): number => {
    const sa = STATUS_ORDER[a.status] ?? 4
    const sb = STATUS_ORDER[b.status] ?? 4
    if (sa !== sb) return sa - sb
    return a.displayName.localeCompare(b.displayName)
  }

  // Онлайн-участники группируются по старшей hoist-роли; без неё — по
  // встроенной роли (хозяева/админы/свои). Вес задаёт порядок групп.
  interface Bucket { title: string; key: string; weight: number; members: MemberPublic[] }
  const buckets = new Map<string, Bucket>()
  const bucketFor = (m: MemberPublic): Bucket => {
    const hoist = topHoistRole(m)
    if (hoist) {
      const key = `role:${hoist.id}`
      return buckets.get(key) ?? { title: hoist.name, key, weight: 1000 + hoist.position, members: [] }
    }
    const w = m.role === 'owner' ? 30 : m.role === 'admin' ? 20 : 10
    const key = `builtin:${m.role}`
    return buckets.get(key) ?? { title: ROLE_TITLES[m.role], key, weight: w, members: [] }
  }
  for (const m of online) {
    const b = bucketFor(m)
    b.members.push(m)
    buckets.set(b.key, b)
  }

  const groups: MemberGroup[] = []
  if (inVoice.length > 0) {
    inVoice.sort(sortFn)
    groups.push({ title: `в голосе · ${inVoice.length}`, key: 'voice', members: inVoice, voice: true })
  }
  for (const b of [...buckets.values()].sort((a, z) => z.weight - a.weight)) {
    b.members.sort(sortFn)
    groups.push({ title: b.title, key: b.key, members: b.members })
  }
  if (offline.length > 0) {
    offline.sort((a, b) => a.displayName.localeCompare(b.displayName))
    groups.push({ title: 'не в сети', key: 'offline', members: offline })
  }
  return groups
}

const STATUS_LABEL: Record<MemberPublic['status'], string> = {
  online:  'в сети',
  idle:    'отошёл',
  dnd:     'не беспокоить',
  offline: 'не в сети',
}

const ROLE_TAG: Record<'owner' | 'admin' | 'member', string | null> = {
  owner: 'хоз',
  admin: 'адм',
  member: null,
}

function MemberRow({
  member, voice, onClick,
}: {
  member: MemberPublic
  voice?: boolean
  onClick?: () => void
}) {
  const isOffline = member.status === 'offline'
  const tag = ROLE_TAG[member.role]
  const nameColor = memberNameColor(member)
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? 'открыть профиль' : undefined}
      className={[
        'w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors',
        voice ? 'bg-kd-accent-bg hover:bg-kd-panel-hi/60' : 'hover:bg-kd-panel-alt',
        isOffline ? 'opacity-55' : '',
      ].join(' ')}
    >
      <Avatar
        name={member.displayName}
        avatarUrl={member.avatarUrl}
        size={24}
        status={member.status}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-kd-text flex items-center gap-1 truncate">
          <span className="truncate" style={nameColor ? { color: nameColor } : undefined}>{member.displayName}</span>
          {tag && <Badge variant="role">{tag}</Badge>}
        </div>
        <div className="text-[10px] text-kd-text-soft truncate">
          {/* Кастомный статус важнее типового «в сети» — как в Discord. */}
          {member.customStatus ?? (voice ? 'на связи' : STATUS_LABEL[member.status])}
        </div>
      </div>
      {voice && <Icon.Mic size={10} className="text-kd-online shrink-0" />}
    </button>
  )
}

export function MemberList({ serverId, className }: MemberListProps) {
  const queryClient = useQueryClient()
  const openProfile = useProfileUi((s) => s.open)
  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => listMembers(serverId!),
    enabled: serverId !== null,
    staleTime: 60_000,
  })

  // Каналы нужны, чтобы понять, кто сейчас в голосе (группа «в голосе»).
  const { data: detail } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => getServerDetail(serverId!),
    enabled: serverId !== null,
    staleTime: 30_000,
  })
  const voicePresence = useVoiceChannelPresence(detail?.channels ?? [])
  const voiceIds = useMemo(() => {
    const s = new Set<string>()
    for (const entries of voicePresence.values()) for (const p of entries) s.add(p.userId)
    return s
  }, [voicePresence])

  useEffect(() => {
    if (!serverId) return undefined
    return wsClient.on((event) => {
      // Роли изменились (справочник или назначения) — перетянем участников/роли.
      if ((event.t === 'role.update' || event.t === 'member.roles') && event.serverId === serverId) {
        void queryClient.invalidateQueries({ queryKey: ['members', serverId] })
        void queryClient.invalidateQueries({ queryKey: ['roles', serverId] })
        return
      }
      if (event.t !== 'presence') return
      queryClient.setQueryData<MemberPublic[]>(['members', serverId], (old) => {
        if (!old) return old
        let changed = false
        const next = old.map((m) => {
          if (m.id !== event.userId) return m
          if (m.status === event.status) return m
          changed = true
          return { ...m, status: event.status }
        })
        return changed ? next : old
      })
    })
  }, [serverId, queryClient])

  const groups = useMemo(() => groupMembers(members, voiceIds), [members, voiceIds])
  const onlineCount = members.filter((m) => m.status !== 'offline').length

  return (
    <aside className={`bg-kd-panel border-l border-kd-border flex-col min-h-0 ${className ?? ''}`}>
      <div className="px-3 h-12 border-b border-kd-border bg-kd-panel-alt flex items-center shrink-0">
        <div className="text-[11px] text-kd-text-mute font-mono">
          {onlineCount} / {members.length} онлайн
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2.5 px-1.5">
      {groups.map((g) => (
        <div key={g.key} className="mb-2">
          <div
            className={[
              'px-2.5 py-[3px] text-[10px] font-bold tracking-[0.05em] uppercase font-mono flex justify-between',
              g.voice ? 'text-kd-accent' : 'text-kd-text-mute',
            ].join(' ')}
          >
            <span>— {g.title}</span>
            {!g.voice && <span>{g.members.length}</span>}
          </div>
          {g.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              voice={g.voice}
              onClick={() => openProfile(m.id)}
            />
          ))}
        </div>
      ))}
      </div>
    </aside>
  )
}
