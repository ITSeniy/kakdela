import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { User } from '@kakdela/ginzu/api-types'

import { Router } from './app/Router.js'
import { CommandPalette } from './components/CommandPalette.js'
import { ConfirmDialogHost } from './components/ConfirmDialog.js'
import { ConnectionBanner } from './components/ConnectionBanner.js'
import { Toaster } from './components/toast/index.js'
import { initAuth } from './features/auth/api.js'
import { useAuthStore } from './features/auth/store.js'
import { ProfileModal } from './features/profile/ProfileModal.js'
import { CreateServerModal } from './features/servers/CreateServerModal.js'
import { JoinServerModal } from './features/servers/JoinServerModal.js'
import { ServerSettingsModal } from './features/settings/ServerSettingsModal.js'
import { CreateThreadDialog } from './features/threads/CreateThreadDialog.js'
import { leaveVoiceRoom } from './features/voice/useVoiceRoom.js'
import { disposeVoiceRoomSync, getActiveRoom } from './lib/livekit.js'
import { wsClient } from './lib/ws.js'

export function App() {
  const status = useAuthStore((s) => s.status)
  const prevStatusRef = useRef(status)
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    void initAuth()
  }, [])

  useEffect(() => {
    if (status !== 'authed') return undefined
    wsClient.connect()
    return () => { wsClient.close() }
  }, [status])

  // user.update: смена displayName/avatar/customStatus у любого участника
  // должна сразу отразиться в members/profile/auth. Инвалидируем queries и
  // (если изменился сам user) — синкаем authStore.
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t !== 'user.update') return
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      void queryClient.invalidateQueries({ queryKey: ['user-profile', event.userId] })
      void queryClient.invalidateQueries({ queryKey: ['dm-list'] })
      const cur = useAuthStore.getState().user
      const accessToken = useAuthStore.getState().accessToken
      if (cur && cur.id === event.userId && accessToken) {
        const next: User = {
          ...cur,
          displayName: event.displayName,
          avatarUrl: event.avatarUrl,
          customStatus: event.customStatus,
        }
        setSession(next, accessToken)
      }
    })
  }, [queryClient, setSession])

  // Logout / token revocation — гарантируем выход из голоса перед очисткой
  // auth state, чтобы не остался зомби-участник в LiveKit под именем
  // вышедшего пользователя.
  useEffect(() => {
    if (prevStatusRef.current === 'authed' && status !== 'authed') {
      void leaveVoiceRoom()
    }
    prevStatusRef.current = status
  }, [status])

  // Последняя линия обороны: окно закрывается — синхронно посылаем leave
  // в LiveKit. Async-часть disconnect'а пусть пытается отработать, но если
  // окно успеет закрыться раньше — LiveKit и так выкинет участника по
  // таймауту (~30s).
  useEffect(() => {
    function onBeforeUnload() {
      if (getActiveRoom()) {
        disposeVoiceRoomSync()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return (
    <>
      <Router />
      <ProfileModal />
      <ServerSettingsModal />
      <CreateServerModal />
      <JoinServerModal />
      <CreateThreadDialog />
      <Toaster />
      <ConfirmDialogHost />
      <ConnectionBanner />
      <CommandPalette />
    </>
  )
}
