// Единый источник индикаторов непрочитанного для всего шелла.
//   • useUnreadByServer() — карта serverId → число непрочитанных упоминаний
//     (для бейджей на иконках серверов в ServerRail).
//   • useTotalUnread()    — суммарный счётчик (упоминания + личка).
//   • useUnreadIndicators() — монтируется один раз (Shell): ведёт заголовок
//     окна «(N) КакДела» и бейдж в системном трее.
//
// Все хуки читают общий TanStack-кэш (['inbox-unread'], ['inbox-unread-by-server'],
// ['dm-list']) — отдельных дублирующих подписок не плодим. Инвалидацию этих
// ключей по WS-событиям делает useNotifyTriggers().

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { setTrayBadge } from '../../lib/host/tray.js'
import { listDms } from '../dm/api.js'
import { listInboxMentions } from '../inbox/api.js'

// Совпадает с <title> в index.html и общим строчным стилем UI.
const APP_TITLE = 'как дела'

/** Непрочитанные упоминания, сгруппированные по серверу. DM-упоминания (без
 *  serverId) в карту не попадают — у личек свой счётчик. */
export function useUnreadByServer(): Map<string, number> {
  const { data } = useQuery({
    queryKey: ['inbox-unread-by-server'],
    queryFn: () => listInboxMentions({ unreadOnly: true, limit: 100 }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  return useMemo(() => {
    const map = new Map<string, number>()
    for (const m of data?.mentions ?? []) {
      if (!m.serverId) continue
      map.set(m.serverId, (map.get(m.serverId) ?? 0) + 1)
    }
    return map
  }, [data])
}

/** Суммарный непрочитанный: упоминания (по эндпоинту) + сумма личек. */
export function useTotalUnread(): { mentions: number; dms: number; total: number } {
  const { data: inbox } = useQuery({
    queryKey: ['inbox-unread'],
    queryFn: () => listInboxMentions({ limit: 1, unreadOnly: true }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  const { data: dms } = useQuery({
    queryKey: ['dm-list'],
    queryFn: listDms,
    staleTime: 10_000,
  })

  const mentions = inbox?.unreadTotal ?? 0
  const dmUnread = (dms ?? []).reduce((sum, d) => sum + d.unreadCount, 0)
  return { mentions, dms: dmUnread, total: mentions + dmUnread }
}

/** Ведёт заголовок окна и бейдж трея от суммарного непрочитанного. */
export function useUnreadIndicators(): void {
  const { total } = useTotalUnread()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = total > 0 ? `(${total > 99 ? '99+' : total}) ${APP_TITLE}` : APP_TITLE
    }
    void setTrayBadge(total)
  }, [total])
}
