// Реакция на собственный кик: сервер прислал member.leave с моим userId →
// убираю сервер из списка и, если я сейчас на нём, увожу на главную. Монтируется
// один раз в Shell.

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { toast } from '../../components/toast/index.js'
import { wsClient } from '../../lib/ws.js'
import { useAuthStore } from '../auth/store.js'

export function useKickWatcher(): void {
  const queryClient = useQueryClient()
  const [location, navigate] = useLocation()
  const meId = useAuthStore((s) => s.user?.id ?? null)
  const locRef = useRef(location)
  locRef.current = location

  useEffect(() => {
    if (!meId) return undefined
    return wsClient.on((event) => {
      if (event.t !== 'member.leave' || event.userId !== meId) return
      void queryClient.invalidateQueries({ queryKey: ['servers'] })
      const m = /^\/servers\/([0-9a-f-]+)/i.exec(locRef.current)
      if (m && m[1] === event.serverId) {
        toast.info('вас выгнали с сервера')
        navigate('/', { replace: true })
      }
    })
  }, [meId, queryClient, navigate])
}
