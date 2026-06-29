// Десктоп-интеграция, монтируется один раз в Shell: применяет «стартовать
// свёрнутым» при автозапуске, синхронизирует поведение закрытия окна в Rust и
// держит ПК бодрым на время звонка. В браузерном режиме всё no-op.

import { useEffect, useRef } from 'react'

import {
  hideMainWindow,
  isDesktop,
  setCloseToTray,
  setKeepAwake,
  wasLaunchedMinimized,
} from '../../lib/host/desktop.js'
import { useDesktopPrefs } from '../settings/desktopPrefs.js'
import { useVoiceStore } from '../voice/store.js'

export function useDesktopIntegration(): void {
  const startMinimized = useDesktopPrefs((s) => s.startMinimized)
  const closeToTray = useDesktopPrefs((s) => s.closeToTray)
  const keepAwakeInCall = useDesktopPrefs((s) => s.keepAwakeInCall)
  const voiceStatus = useVoiceStore((s) => s.status)

  // Стартовать свёрнутым: только когда запущено автозапуском (--minimized) и
  // настройка включена. Один раз при старте.
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current || !isDesktop()) return
    didInit.current = true
    void (async () => {
      if (startMinimized && (await wasLaunchedMinimized())) {
        await hideMainWindow()
      }
    })()
  }, [startMinimized])

  // Поведение при закрытии окна — пушим флаг в Rust (он читает его в обработчике
  // CloseRequested).
  useEffect(() => {
    void setCloseToTray(closeToTray)
  }, [closeToTray])

  // Не давать уснуть во время звонка (connected/reconnecting).
  const inCall = voiceStatus === 'connected' || voiceStatus === 'reconnecting'
  useEffect(() => {
    void setKeepAwake(keepAwakeInCall && inCall)
  }, [keepAwakeInCall, inCall])
}
