import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { User } from '@kakdela/ginzu/api-types'

import { Router } from './app/Router.js'
import { CommandPalette } from './components/CommandPalette.js'
import { ConfirmDialogHost } from './components/ConfirmDialog.js'
import { ConnectionBanner } from './components/ConnectionBanner.js'
import { Toaster } from './components/toast/index.js'
import { initAuth } from './features/auth/api.js'
import { useAuthStore } from './features/auth/store.js'
import { useMyStatus } from './features/presence/store.js'
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
  const [location, navigate] = useLocation()
  const locationRef = useRef(location)
  locationRef.current = location

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

  // channel.create/update/delete: список каналов сервера обновляется live
  // у всех участников. При удалении канала, который сейчас открыт, —
  // уходим на корень сервера, чтобы не остаться в несуществующем чате.
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t !== 'channel.create' && event.t !== 'channel.update' && event.t !== 'channel.delete') return
      void queryClient.invalidateQueries({ queryKey: ['server', event.serverId] })
      if (event.t === 'channel.delete' && locationRef.current.includes(event.channelId)) {
        navigate(`/servers/${event.serverId}`)
      }
    })
  }, [queryClient, navigate])

  // Сервер при каждом коннекте принудительно ставит presence=online. Если
  // пользователь выбрал «отошёл»/«не беспокоить» — восстанавливаем после
  // ready (срабатывает и на первом коннекте, и на реконнектах).
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t !== 'ready') return
      const myStatus = useMyStatus.getState().myStatus
      if (myStatus !== 'online') wsClient.send({ t: 'presence', status: myStatus })
    })
  }, [])

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
