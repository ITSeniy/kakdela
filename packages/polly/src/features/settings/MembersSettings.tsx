// Страница «участники»: читаемый список жителей сервера с ролями.
// Модерация — через профиль и голосовые меню; здесь только обзор.

import { useQuery } from '@tanstack/react-query'

import type { MemberPublic } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { Badge } from '../../components/Badge.js'
import { listMembers } from '../servers/api.js'
import { useProfileUi } from '../profile/store.js'

const ROLE_LABEL: Record<MemberPublic['role'], string> = {
  owner: 'хозяин',
  admin: 'админ',
  member: 'свой',
}

const ROLE_ORDER: Record<MemberPublic['role'], number> = { owner: 0, admin: 1, member: 2 }

export function MembersSettings({ serverId }: { serverId: string }) {
  const openProfile = useProfileUi((s) => s.open)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => listMembers(serverId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return <div className="py-8 text-center text-kd-text-mute font-mono text-[11px]">загружаем…</div>
  }

  const sorted = [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.displayName.localeCompare(b.displayName, 'ru'),
  )

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider mb-1">
        всего · {members.length}
      </div>
      {sorted.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => openProfile(m.id)}
          title="открыть профиль"
          className="flex items-center gap-3 px-3 py-2 rounded-kd bg-kd-panel border border-kd-border hover:bg-kd-panel-hi transition-colors text-left"
        >
          <Avatar name={m.displayName} avatarUrl={m.avatarUrl} size={28} status={m.status} />
          <span className="flex-1 min-w-0 text-[13px] font-semibold text-kd-text truncate">
            {m.displayName}
          </span>
          {m.role !== 'member' && <Badge variant="role">{ROLE_LABEL[m.role]}</Badge>}
          <span className="text-[10px] font-mono text-kd-text-mute shrink-0">
            {m.status === 'offline' ? 'не в сети' : 'в сети'}
          </span>
        </button>
      ))}
    </div>
  )
}
