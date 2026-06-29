// Авто-«отошёл»: после N минут без активности отправляем серверу presence
// `idle`, при первой активности возвращаем `online`. Срабатывает только когда
// базовый статус — `online` (ручные `idle`/`dnd` не трогаем). Сам базовый
// статус (useMyStatus) НЕ меняем — шлём idle транзитно через WS, поэтому при
// реконнекте App.tsx восстановит сохранённый `online`.

import { useEffect, useRef } from 'react'

import { wsClient } from '../../lib/ws.js'
import { useChatPrefs } from '../settings/chatPrefs.js'
import { useMyStatus } from './store.js'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'] as const

export function useAutoIdle(): void {
  const idleAfterMin = useChatPrefs((s) => s.idleAfterMin)
  const myStatus = useMyStatus((s) => s.myStatus)
  const autoIdledRef = useRef(false)

  useEffect(() => {
    // Выключено или базовый статус не online (ручной idle/dnd) — ничего не делаем.
    if (idleAfterMin <= 0 || myStatus !== 'online') return undefined

    const ms = idleAfterMin * 60_000
    let timer: ReturnType<typeof setTimeout> | null = null

    function goIdle() {
      autoIdledRef.current = true
      wsClient.send({ t: 'presence', status: 'idle' })
    }
    function arm() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(goIdle, ms)
    }
    function onActivity() {
      if (autoIdledRef.current) {
        autoIdledRef.current = false
        wsClient.send({ t: 'presence', status: 'online' })
      }
      arm()
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') onActivity()
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    arm()

    return () => {
      if (timer) clearTimeout(timer)
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity)
      document.removeEventListener('visibilitychange', onVisibility)
      // Если мы авто-ушли в idle и эффект пересоздаётся (поменяли таймаут), а не
      // из-за ручной смены статуса — вернём online. Ручную смену распознаём по
      // актуальному значению стора: если оно уже не online, setMyStatus сам
      // отправил нужный статус, перетирать нельзя.
      if (autoIdledRef.current && useMyStatus.getState().myStatus === 'online') {
        autoIdledRef.current = false
        wsClient.send({ t: 'presence', status: 'online' })
      }
    }
  }, [idleAfterMin, myStatus])
}
