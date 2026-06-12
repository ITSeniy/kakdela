import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { Channel } from '@kakdela/ginzu/api-types'

import { useAuthStore } from '../auth/store.js'
import { focusMainWindow, setTrayBadge } from '../../lib/host/tray.js'
import { notify } from '../../lib/host/notify.js'
import { wsClient } from '../../lib/ws.js'
import { listInboxMentions } from '../inbox/api.js'
import { getServerDetail } from '../servers/api.js'
import { playSound } from '../sounds/sounds.js'
import { useNotifyPrefs } from './prefs.js'

// Debounce-окно на канал — не больше одной нотификации в этот интервал. Без
// этого активный mention-poll в чатике типа «@here» мгновенно даёт 10 toast'ов.
const PER_CHANNEL_NOTIFY_COOLDOWN_MS = 60_000

interface NotifyTriggersUi {
  /** Текущий открытый channelId (server channel) — null если в DM/инбоксе. */
  serverChannelId: string | null
  /** Текущий открытый DM channelId — null если не в DM. */
  dmChannelId: string | null
}

function parseLocation(loc: string): NotifyTriggersUi {
  // /servers/:serverId/channels/:channelId
  let m = /^\/servers\/[0-9a-f-]+\/channels\/([0-9a-f-]+)/i.exec(loc)
  if (m && m[1]) return { serverChannelId: m[1], dmChannelId: null }
  // /dm/:channelId
  m = /^\/dm\/([0-9a-f-]+)/i.exec(loc)
  if (m && m[1] && m[1] !== 'with') return { serverChannelId: null, dmChannelId: m[1] }
  return { serverChannelId: null, dmChannelId: null }
}

/**
 * Решает, надо ли «потенциально» отправить нотификацию: окно не в фокусе ИЛИ
 * пользователь смотрит в другой канал.
 */
function shouldNotify(
  eventChannelId: string,
  ui: NotifyTriggersUi,
  windowFocused: boolean,
): boolean {
  if (!windowFocused) return true
  // Окно в фокусе, но мы на другом канале → notify имеет смысл.
  if (eventChannelId !== ui.serverChannelId && eventChannelId !== ui.dmChannelId) {
    return true
  }
  return false
}

/**
 * Hook монтируется один раз на верхнем уровне (Shell). Подписывается на:
 *   • mention   — native notification + tray badge increment.
 *   • dm.new    — то же для первых сообщений в новом DM.
 *
 * Сам unread-счётчик мы держим из `listInboxMentions({ unreadOnly: true })`
 * (он же используется в ServerRail) — синхронизируем при ws-mention и при
 * фокусе окна.
 */
export function useNotifyTriggers(): void {
  const [location] = useLocation()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)

  // Реф'ы нужны, чтобы у ws-listener была актуальная страница без перерегистрации.
  const uiRef = useRef<NotifyTriggersUi>(parseLocation(location))
  uiRef.current = parseLocation(location)

  const focusedRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.hasFocus() : true,
  )
  const lastNotifyAtRef = useRef<Map<string, number>>(new Map())

  // Track focus / blur — определяет, считать ли пользователя «отвлёкшимся».
  useEffect(() => {
    function onFocus() { focusedRef.current = true }
    function onBlur()  { focusedRef.current = false }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // Refresh tray badge whenever the inbox-unread query updates. Используем
  // queryCache observer вместо useQuery, чтобы не дублировать сетевую
  // подписку с ServerRail (одинаковый queryKey, общий cache).
  useEffect(() => {
    function read(): number {
      const cache = queryClient.getQueryData<{ unreadTotal: number }>(['inbox-unread'])
      return cache?.unreadTotal ?? 0
    }
    void setTrayBadge(read())
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return
      const key = event.query.queryKey
      if (Array.isArray(key) && key[0] === 'inbox-unread') {
        void setTrayBadge(read())
      }
    })
    return () => unsub()
  }, [queryClient])

  useEffect(() => {
    if (!currentUserId) return undefined

    return wsClient.on((event) => {
      if (event.t === 'mention') {
        // Нас не должно дёргать на собственные @everyone — но проверим.
        if (event.mentionedUserId !== currentUserId) return
        if (!useNotifyPrefs.getState().mentions) {
          // Уведомления об упоминаниях выключены — но badge держим свежим.
          void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
          return
        }
        if (!shouldNotify(event.channelId, uiRef.current, focusedRef.current)) return

        const now = Date.now()
        const last = lastNotifyAtRef.current.get(event.channelId) ?? 0
        if (now - last < PER_CHANNEL_NOTIFY_COOLDOWN_MS) {
          // В окне дебаунса — только обновим badge через инвалидацию.
          void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
          return
        }
        lastNotifyAtRef.current.set(event.channelId, now)
        playSound('notification')
        void handleMentionNotification(event.channelId, queryClient)
      }

      if (event.t === 'dm.new') {
        if (!useNotifyPrefs.getState().dms) return
        if (!shouldNotify(event.channelId, uiRef.current, focusedRef.current)) return
        playSound('notification')
        void notify({
          title: 'новое личное сообщение',
          body:  'кто-то начал с вами личный диалог',
          tag:   `dm:${event.channelId}`,
          onClick: () => {
            void focusMainWindow()
            window.location.hash = ''
            // Wouter listens to history; используем history.pushState.
            history.pushState({}, '', `/dm/${event.channelId}`)
            window.dispatchEvent(new PopStateEvent('popstate'))
          },
        })
      }
    })
  }, [currentUserId, queryClient])

  // Когда окно возвращается в фокус — освежаем inbox-unread (на случай
  // если что-то пропустили во время WS-разрыва).
  useEffect(() => {
    function onFocus() {
      void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [queryClient])
}

/**
 * Подтягивает свежие mention'ы (одной страницей), берёт самый последний,
 * пробует резолвить имя канала через серверный detail-cache и шлёт
 * нотификацию. Клик возвращает фокус и переходит к сообщению.
 */
async function handleMentionNotification(
  channelId: string,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  // Инвалидируем счётчик и список (использует InboxScreen + ServerRail badge).
  void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
  void queryClient.invalidateQueries({ queryKey: ['inbox-mentions'] })

  let title = 'вас упомянули'
  let body  = ''
  let serverId: string | null = null
  let messageId: string | null = null

  try {
    const page = await listInboxMentions({ limit: 5, unreadOnly: true })
    const top = page.mentions.find((m) => m.channelId === channelId) ?? page.mentions[0]
    if (top) {
      const channelName = top.channelKind === 'dm' ? 'в личных' : `в #${top.channelName}`
      title = `${top.authorName} ${channelName}`
      const trimmed = top.content.replace(/\s+/g, ' ').trim()
      body = trimmed.length > 140 ? trimmed.slice(0, 139) + '…' : (trimmed || '@упоминание')
      serverId  = top.serverId
      messageId = top.messageId
    }
  } catch (err) {
    // Сеть моргнула или прав не хватило — отдадим хотя бы generic-toast.
    console.warn('[notify] failed to enrich mention', err)
  }

  await notify({
    title,
    body: body || 'нажмите, чтобы прочитать',
    tag:  `mention:${channelId}`,
    onClick: serverId && messageId
      ? () => {
          void focusMainWindow()
          const target = `/servers/${serverId}/channels/${channelId}#msg:${messageId}`
          history.pushState({}, '', target)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      : () => void focusMainWindow(),
  })

  // Прогреваем serverDetail-cache, чтобы переход был мгновенным.
  if (serverId) {
    queryClient
      .ensureQueryData<{ channels: Channel[] }>({
        queryKey: ['server', serverId],
        queryFn:  () => getServerDetail(serverId!),
      })
      .catch(() => {})
  }
}
