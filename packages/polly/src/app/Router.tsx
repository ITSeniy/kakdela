import { useState } from 'react'

import { AuthScreen } from '../features/auth/AuthScreen.js'
import { OnboardingScreen } from '../features/auth/OnboardingScreen.js'
import { PROFILE_SETUP_FLAG, ProfileSetupScreen } from '../features/auth/ProfileSetupScreen.js'
import { useAuthStore } from '../features/auth/store.js'
import { MobileShell } from './MobileShell.js'
import { Shell } from './Shell.js'
import { useIsMobile } from './useIsMobile.js'

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
  // Бамп для ре-рендера после завершения шага оформления профиля —
  // сам флаг живёт в localStorage (ставится при регистрации).
  const [, setSetupTick] = useState(0)
  const isMobile = useIsMobile()

  if (status === 'idle' || status === 'loading') {
    return <Splash />
  }

  if (status === 'authed') {
    if (localStorage.getItem(PROFILE_SETUP_FLAG) === '1') {
      return (
        <ProfileSetupScreen
          onDone={() => {
            localStorage.removeItem(PROFILE_SETUP_FLAG)
            setSetupTick((x) => x + 1)
          }}
        />
      )
    }
    return isMobile ? <MobileShell /> : <Shell />
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
