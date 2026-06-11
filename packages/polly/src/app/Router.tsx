import { useState } from 'react'

import { AuthScreen } from '../features/auth/AuthScreen.js'
import { OnboardingScreen } from '../features/auth/OnboardingScreen.js'
import { useAuthStore } from '../features/auth/store.js'
import { Shell } from './Shell.js'

type AuthView =
  | { kind: 'onboarding'; code: string }
  | { kind: 'auth'; mode: 'login' | 'register'; inviteCode?: string }

function getInitialAuthView(): AuthView {
  const params = new URLSearchParams(window.location.search)
  const invite = params.get('invite')
  if (invite) return { kind: 'onboarding', code: invite }
  return { kind: 'auth', mode: 'login' }
}

function Splash() {
  return (
    <div className="h-full flex items-center justify-center bg-kd-bg">
      <span className="font-mono text-xs text-kd-text-mute">загрузка…</span>
    </div>
  )
}

export function Router() {
  const status = useAuthStore((s) => s.status)
  const [authView, setAuthView] = useState<AuthView>(getInitialAuthView)

  if (status === 'idle' || status === 'loading') {
    return <Splash />
  }

  if (status === 'authed') {
    return <Shell />
  }

  // unauthed
  if (authView.kind === 'onboarding') {
    return (
      <OnboardingScreen
        initialCode={authView.code}
        onProceed={(code) => setAuthView({ kind: 'auth', mode: 'register', inviteCode: code })}
      />
    )
  }

  return (
    <AuthScreen
      initialMode={authView.mode}
      initialInviteCode={authView.inviteCode}
    />
  )
}
