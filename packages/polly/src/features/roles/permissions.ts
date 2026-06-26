// Клиентская проверка прав: читает список участников сервера (он уже несёт
// эффективную маску `permissions` на каждого) и отдаёт удобный `can(flag)`.
// Источник истины — бэкенд; здесь только подсветка/скрытие кнопок в UI.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { hasPermission, type PermissionFlag } from '@kakdela/ginzu/permissions'

import { useAuthStore } from '../auth/store.js'
import { listMembers } from '../servers/api.js'

export interface ServerPermissions {
  mask: number
  isOwner: boolean
  can(flag: PermissionFlag): boolean
}

export function useServerPermissions(serverId: string | null): ServerPermissions {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => listMembers(serverId!),
    enabled: serverId !== null,
    staleTime: 60_000,
  })

  return useMemo(() => {
    const me = userId ? members.find((m) => m.id === userId) : undefined
    const mask = me?.permissions ?? 0
    const isOwner = me?.role === 'owner'
    return {
      mask,
      isOwner,
      can: (flag: PermissionFlag) => isOwner || hasPermission(mask, flag),
    }
  }, [members, userId])
}
