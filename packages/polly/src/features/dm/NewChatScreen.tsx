// Мобильный экран «новая переписка». Стиль 1:1 с designs/final-mobile.jsx
// (MobileNewChat): топ-бар, поле поиска, список своих с кнопками «обычный» /
// «секретный». Источник людей — участники всех серверов (как в CommandPalette):
// своих эндпоинтов не вводим, на мобиле серверов не видно, но членство есть.

import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { MemberPublic } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { useAuthStore } from '../auth/store.js'
import { listMembers, listServers } from '../servers/api.js'

const STATUS_LABEL: Record<MemberPublic['status'], string> = {
  online:  'в сети',
  idle:    'отошёл',
  dnd:     'не беспокоить',
  offline: 'не в сети',
}

const STATUS_RANK: Record<MemberPublic['status'], number> = {
  online: 0, idle: 1, dnd: 2, offline: 3,
}

function PersonRow({ member, onPlain, onSecret }: {
  member: MemberPublic
  onPlain: () => void
  onSecret: () => void
}) {
  const online = member.status === 'online'
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-kd-border">
      <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size={44} status={member.status} ringColor="var(--kd-bg)" />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-kd-text truncate">{member.displayName}</div>
        <div className={`text-[11px] font-mono mt-0.5 truncate ${online ? 'text-kd-online' : 'text-kd-text-mute'}`}>
          {member.customStatus ?? STATUS_LABEL[member.status]}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onPlain}
          className="px-2.5 py-1.5 rounded-kd border border-kd-border text-[11px] font-semibold text-kd-text-soft active:bg-kd-panel-hi"
        >
          обычный
        </button>
        <button
          type="button"
          onClick={onSecret}
          className="px-2.5 py-1.5 rounded-kd bg-kd-accent text-white text-[11px] font-semibold flex items-center gap-1 active:bg-kd-accent-deep"
        >
          <Icon.Lock size={12} /> секретный
        </button>
      </div>
    </div>
  )
}

export function NewChatScreen() {
  const [, navigate] = useLocation()
  const me = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: listServers,
    staleTime: 30_000,
  })
  const memberQueries = useQueries({
    queries: servers.map((s) => ({
      queryKey: ['members', s.id],
      queryFn: () => listMembers(s.id),
      staleTime: 60_000,
    })),
  })

  const loading = servers.length > 0 && memberQueries.some((q) => q.isLoading)

  const people = useMemo(() => {
    const seen = new Set<string>()
    const out: MemberPublic[] = []
    for (const mq of memberQueries) {
      for (const m of mq.data ?? []) {
        if (m.id === me?.id || seen.has(m.id)) continue
        seen.add(m.id)
        out.push(m)
      }
    }
    const q = query.trim().toLowerCase()
    const filtered = q
      ? out.filter((m) =>
          m.displayName.toLowerCase().includes(q) || (m.username?.toLowerCase().includes(q) ?? false))
      : out
    return filtered.sort((a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.displayName.localeCompare(b.displayName, 'ru'),
    )
  }, [memberQueries, me, query])

  return (
    <>
      <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <button type="button" onClick={() => navigate('/dm')} title="назад" className="-ml-1 text-kd-text-soft active:text-kd-text">
          <Icon.ArrowLeft size={22} />
        </button>
        <span className="text-[17px] font-bold text-kd-text">новая переписка</span>
      </div>

      <div className="px-3.5 pt-3 pb-1.5 shrink-0">
        <div className="bg-kd-panel-alt rounded-kd px-3 py-2.5 flex items-center gap-2 border border-kd-border">
          <Icon.Search size={15} className="text-kd-text-mute shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="искать среди своих…"
            className="flex-1 bg-transparent outline-none text-[14px] text-kd-text placeholder:text-kd-text-mute"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {people.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] font-mono text-kd-text-mute">
            {loading ? 'загружаем своих…' : query ? 'никого не нашлось' : 'пока некому писать'}
          </div>
        ) : (
          people.map((m) => (
            <PersonRow
              key={m.id}
              member={m}
              onPlain={() => navigate(`/dm/with/${m.id}`)}
              onSecret={() => navigate(`/secret/${m.id}`)}
            />
          ))
        )}
      </div>
    </>
  )
}
