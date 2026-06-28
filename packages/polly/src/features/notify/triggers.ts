import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { Channel, DmSummary } from '@kakdela/ginzu/api-types'

import { useAuthStore } from '../auth/store.js'
import { focusMainWindow } from '../../lib/host/tray.js'
import { notify, primeNotifyPermission } from '../../lib/host/notify.js'
import { wsClient } from '../../lib/ws.js'
import { listDms } from '../dm/api.js'
import { listInboxMentions } from '../inbox/api.js'
import { getServerDetail } from '../servers/api.js'
import { playSound } from '../sounds/sounds.js'
import { useNotifyPrefs } from './prefs.js'

// Срочность важнее тишины: уведомления уходят сразу, без поканального
// кулдауна. От «пулемёта» защищает не задержка, а tag — ОС заменяет прошлый
// toast этого канала новым (см. notify() / opts.tag). Троттлим только звук,
// чтобы пачка сообщений не строчила по динамику.
const SOUND_THROTTLE_MS = 1_500
let lastSoundAt = 0
function playNotifySound(): void {
  const now = Date.now()
  if (now - lastSoundAt < SOUND_THROTTLE_MS) return
  lastSoundAt = now
  playSound('notification')
}

/** Инвалидирует оба счётчика непрочитанного: общий и разбивку по серверам. */
function invalidateUnread(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ['inbox-unread'] })
  void queryClient.invalidateQueries({ queryKey: ['inbox-unread-by-server'] })
}

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

  // Бейдж в трее и заголовок окна ведёт useUnreadIndicators() (см. Shell):
  // он считает полный unread (упоминания + личка) в одном месте.

  // Просим permission заранее (в вебе — по первому клику): запрос из
  // WS-хендлера браузер молча игнорирует, и notify() остаётся вечным no-op.
  useEffect(() => {
    if (currentUserId) primeNotifyPermission()
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return undefined

    return wsClient.on((event) => {
      if (event.t === 'mention') {
        // Нас не должно дёргать на собственные @everyone — но проверим.
        if (event.mentionedUserId !== currentUserId) return
        // Счётчики/бейджи освежаем всегда — даже когда сам toast не нужен.
        invalidateUnread(queryClient)
        if (!useNotifyPrefs.getState().mentions) return
        // Канал открыт и окно в фокусе → toast лишний, хватит обновления badge.
        if (!shouldNotify(event.channelId, uiRef.current, focusedRef.current)) return
        playNotifySound()
        void handleMentionNotification(event.channelId, queryClient)
      }

      // Обычные сообщения в личке: `dm.new` приходит только при создании
      // диалога, всё остальное — `msg.new` в dm-канале.
      if (event.t === 'msg.new') {
        if (event.message.authorId === currentUserId) return
        void (async () => {
          // Личка ли это — выясняем по dm-list (кэш, при промахе — один fetch).
          let dms = queryClient.getQueryData<DmSummary[]>(['dm-list'])
          if (!dms) {
            try {
              dms = await queryClient.fetchQuery({
                queryKey: ['dm-list'],
                queryFn:  listDms,
                staleTime: 30_000,
              })
            } catch {
              return
            }
          }
          if (!dms) return
          const dm = dms.find((d) => d.channelId === event.channelId)
          if (!dm) return // серверный канал — туда уведомляет mention-путь

          // Бейдж непрочитанной лички (DmList + дом-кнопка) держим живым
          // всегда — даже если toast'ы про личку выключены в настройках.
          void queryClient.invalidateQueries({ queryKey: ['dm-list'] })

          // Системные сообщения (call-log T-087) обновляют превью списка, но
          // не дёргают тостом/звуком — оба уже были в звонке.
          if (event.message.system) return

          // Дальше — только сам toast: по настройкам и фокусу.
          if (!useNotifyPrefs.getState().dms) return
          if (!shouldNotify(event.channelId, uiRef.current, focusedRef.current)) return
          playNotifySound()
          const trimmed = event.message.content.replace(/\s+/g, ' ').trim()
          const body = trimmed
            ? (trimmed.length > 140 ? trimmed.slice(0, 139) + '…' : trimmed)
            : 'вложение'
          void notify({
            title: `${dm.otherUser.displayName} в личных`,
            body,
            tag:   `dm:${event.channelId}`,
            onClick: () => {
              void focusMainWindow()
              history.pushState({}, '', `/dm/${event.channelId}`)
              window.dispatchEvent(new PopStateEvent('popstate'))
            },
          })
        })()
        return
      }

      if (event.t === 'dm.new') {
        void queryClient.invalidateQueries({ queryKey: ['dm-list'] })
        if (!useNotifyPrefs.getState().dms) return
        if (!shouldNotify(event.channelId, uiRef.current, focusedRef.current)) return
        playNotifySound()
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
      invalidateUnread(queryClient)
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
  // Инвалидируем счётчики и список (использует InboxScreen + ServerRail badge).
  invalidateUnread(queryClient)
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
