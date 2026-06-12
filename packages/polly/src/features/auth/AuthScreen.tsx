import { useState } from 'react'

import { Avatar } from '../../components/Avatar.js'
import { ThemeToggle } from '../../components/ThemeToggle.js'
import { ApiError } from '../../lib/api.js'
import { login, register } from './api.js'
import { PROFILE_SETUP_FLAG } from './ProfileSetupScreen.js'

type Mode = 'login' | 'register'

const APP_VERSION = 'v0.0.1'

function getServerHost(): string {
  const url = import.meta.env.VITE_SPEEDY_URL ?? 'http://localhost:3001'
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const SERVER_HOST = getServerHost()

function ServerDisplay({ mode }: { mode: Mode }) {
  return (
    <div className="mb-3.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[10px] font-bold font-mono uppercase tracking-[0.05em] text-kd-text">
          сервер
        </label>
        <span className="text-[10px] text-kd-text-mute font-mono">твоя комната</span>
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded bg-kd-bg border border-kd-border">
        <span className="flex-1 text-kd-text truncate font-mono">{SERVER_HOST}</span>
        <span className="text-[10px] text-kd-online font-mono shrink-0">
          ✓ {mode === 'login' ? 'подключено' : 'доступен'}
        </span>
      </div>
    </div>
  )
}

// ───── Shared primitives ─────

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: React.ReactNode
  mono?: boolean
  /** Нередактируемый префикс внутри поля («@» для ника). */
  prefix?: string
  error?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  autoComplete?: string
}

function Field({ label, value, onChange, type = 'text', placeholder, hint, mono, prefix, error, onKeyDown, autoComplete }: FieldProps) {
  return (
    <div className="mb-3.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[10px] font-bold font-mono uppercase tracking-[0.05em] text-kd-text">
          {label}
        </label>
        {hint && <span className="text-[10px] text-kd-text-mute font-mono">{hint}</span>}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[13px] font-mono text-kd-text-mute select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onKeyDown={onKeyDown}
          className={[
            'w-full py-1.5 text-[13px] rounded bg-kd-bg border outline-none transition-colors',
            prefix ? 'pl-6 pr-2' : 'px-2',
            'placeholder:text-kd-text-mute focus:border-kd-accent',
            mono ? 'font-mono' : '',
            error ? 'border-kd-danger' : 'border-kd-border',
          ].join(' ')}
        />
      </div>
      {error && <p className="mt-1 text-[10px] text-kd-danger font-mono">{error}</p>}
    </div>
  )
}

// ───── Left decorative panel ─────

function AuthArt() {
  const features = [
    { icon: '💬', title: 'каналы и треды', desc: 'болталки, дело, тематика — всё разложено' },
    { icon: '🎙', title: 'голос с демонстрацией', desc: 'до 8 экранов сразу, чат прямо в звонке' },
    { icon: '🌿', title: 'свой сервер', desc: 'данные дома или у друга — никто не подсмотрит' },
  ]

  return (
    <div
      className="hidden md:flex flex-1 min-w-0 p-14 flex-col relative overflow-hidden border-r border-kd-border"
      style={{ background: 'linear-gradient(135deg, var(--kd-bg-deep), var(--kd-bg))' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-kd bg-kd-warm flex items-center justify-center text-white font-extrabold text-sm tracking-tighter select-none">
          кд
        </div>
        <div>
          <div className="text-sm font-bold text-kd-text">как дела?</div>
          <div className="text-[10px] text-kd-text-mute font-mono">self-hosted · {APP_VERSION}</div>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center max-w-[360px]">
        <h1 className="text-[28px] font-bold text-kd-text tracking-[-0.02em] leading-[1.15] mb-3.5">
          теплое место,<br />
          где знаются все.
        </h1>
        <p className="text-sm text-kd-text-soft leading-relaxed">
          мессенджер на своём сервере. для друзей, проектов, книжного клуба и соседей.
          без рекламы и чужих глаз.
        </p>

        <div className="mt-9 flex flex-col gap-3">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-2.5">
              <span className="text-[18px] leading-none mt-0.5 select-none">{f.icon}</span>
              <div>
                <div className="text-xs font-semibold text-kd-text">{f.title}</div>
                <div className="text-[11px] text-kd-text-soft mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <div className="p-3.5 bg-kd-panel rounded-kd border border-kd-border max-w-[360px]">
        <p className="text-xs text-kd-text leading-relaxed italic">
          «у нас стоит свой инстанс уже второй год. вечером в среду все собираются в "у камина" — это лучшее, что случилось с нашим чатом.»
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <Avatar name="Лев Морозов" size={22} />
          <div className="text-[10px] text-kd-text-mute font-mono">Лев · хозяин «Друзья и кофе»</div>
        </div>
      </div>

      {/* Decorative gradients */}
      <div
        className="absolute -right-10 top-[20%] w-[140px] h-[140px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--kd-warm-bg), transparent 70%)' }}
      />
      <div
        className="absolute right-[15%] -bottom-8 w-[100px] h-[100px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--kd-accent-bg), transparent 70%)' }}
      />
    </div>
  )
}

// ───── Error code → field mapping ─────

const ERROR_FIELD_MAP: Record<string, string> = {
  'username-taken': 'username',
  'email-taken': 'email',
  'invalid-credentials': 'password',
  'invite-not-found': 'inviteCode',
  'invite-expired': 'inviteCode',
  'invite-exhausted': 'inviteCode',
  'invite-required': 'inviteCode',
}

// ───── Main screen ─────

interface AuthScreenProps {
  initialMode?: Mode
  initialInviteCode?: string
}

export function AuthScreen({ initialMode = 'login', initialInviteCode = '' }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>(initialMode)

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register fields. Имя задаётся на втором шаге (оформление профиля).
  const [username, setUsername] = useState('')
  const [inviteCode, setInviteCode] = useState(initialInviteCode)

  // UI state
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({})

  function switchMode(next: Mode) {
    setMode(next)
    setEmail('')
    setPassword('')
    setUsername('')
    setInviteCode('')
    setGlobalError(null)
    setFieldErrors({})
  }

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setGlobalError(null)
    setFieldErrors({})
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        // Флаг до register: после setSession Router мгновенно уходит с этого
        // экрана и должен сразу показать шаг оформления профиля.
        localStorage.setItem(PROFILE_SETUP_FLAG, '1')
        try {
          await register({
            inviteCode: inviteCode.trim(),
            username: username.trim(),
            email: email.trim(),
            password,
          })
        } catch (err) {
          localStorage.removeItem(PROFILE_SETUP_FLAG)
          throw err
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const field = ERROR_FIELD_MAP[err.code]
        if (field) {
          setFieldErrors({ [field]: err.message })
        } else {
          setGlobalError(err.message)
        }
      } else {
        setGlobalError('что-то пошло не так, попробуй ещё раз')
      }
    } finally {
      setLoading(false)
    }
  }

  function onEnter(e: React.KeyboardEvent) {
    if (e.key === 'Enter') void handleSubmit()
  }

  return (
    <div className="h-full flex overflow-hidden bg-kd-bg text-kd-text font-sans">
      <AuthArt />

      {/* Form panel */}
      <div className="w-full md:w-[440px] shrink-0 bg-kd-bg px-10 py-14 flex flex-col overflow-y-auto">
        {/* Mode badge + help */}
        <div className="flex items-center justify-between mb-6">
          <div className="px-2 py-0.5 bg-kd-panel border border-kd-border rounded text-[10px] text-kd-text-soft font-mono">
            {mode === 'login' ? '01 · вход' : '02 · регистрация'}
          </div>
          <div className="text-[11px] text-kd-text-mute font-mono">⌘K · помощь</div>
        </div>

        <h2 className="text-[22px] font-bold text-kd-text tracking-[-0.02em] mb-1">
          {mode === 'login' ? 'привет, заходи' : 'давай знакомиться'}
        </h2>
        <p className="text-xs text-kd-text-soft mb-6 leading-relaxed">
          {mode === 'login'
            ? 'рад тебя снова видеть. как дела?'
            : 'выбери, где будет жить твой профиль'}
        </p>

        {/* Global error */}
        {globalError && (
          <div className="mb-4 px-3 py-2.5 bg-kd-panel border border-kd-danger rounded-kd">
            <p className="text-xs text-kd-danger font-mono">{globalError}</p>
          </div>
        )}

        {/* Server display */}
        <ServerDisplay mode={mode} />

        {/* Fields */}
        {mode === 'login' ? (
          <>
            <Field
              label="имя или почта"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="anya@example.com"
              hint="как мы знакомы"
              autoComplete="email"
              onKeyDown={onEnter}
            />
            <Field
              label="пароль"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
              hint={
                <button
                  className="hover:text-kd-text-soft transition-colors"
                  onClick={() => setGlobalError('обратитесь к администратору сервера')}
                >
                  забыла?
                </button>
              }
              error={fieldErrors['password']}
              autoComplete="current-password"
              onKeyDown={onEnter}
            />

            {/* Stay-logged-in (decorative — handled by httpOnly cookie) */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-3.5 h-3.5 rounded-[3px] bg-kd-accent flex items-center justify-center text-white text-[10px] font-bold select-none">
                ✓
              </div>
              <span className="text-xs text-kd-text">оставаться в сети на этом устройстве</span>
            </div>
          </>
        ) : (
          <>
            <Field
              label="ник"
              value={username}
              onChange={(v) => setUsername(v.toLowerCase())}
              placeholder="anya"
              hint="постоянный — выбирай с душой"
              mono
              prefix="@"
              error={fieldErrors['username']}
              autoComplete="username"
              onKeyDown={onEnter}
            />
            <Field
              label="почта"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="anya@example.com"
              mono
              error={fieldErrors['email']}
              autoComplete="email"
              onKeyDown={onEnter}
            />
            <Field
              label="пароль"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••••••"
              hint="мин. 6 символов"
              autoComplete="new-password"
              onKeyDown={onEnter}
            />

            {/* Invite code */}
            <Field
              label="код приглашения"
              value={inviteCode}
              onChange={setInviteCode}
              placeholder="kj4m9pq2"
              mono
              error={fieldErrors['inviteCode']}
              autoComplete="off"
              onKeyDown={onEnter}
            />
          </>
        )}

        {/* Submit */}
        <button
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-[11px] rounded-kd bg-kd-accent text-white text-[13px] font-bold transition-colors hover:bg-kd-accent-deep disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && <Spinner />}
          <span>{mode === 'login' ? 'зайти' : 'создать аккаунт'}</span>
          {!loading && (
            <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded bg-white/20">
              ⏎
            </span>
          )}
        </button>

        {mode === 'register' && (
          <p className="mt-3.5 text-[11px] text-kd-text-soft leading-relaxed text-center">
            создавая аккаунт, ты соглашаешься с{' '}
            <button
              type="button"
              className="text-kd-accent hover:text-kd-accent-deep transition-colors"
              onClick={() => setGlobalError('правила сервера — у админа, попроси показать')}
            >
              правилами этого сервера
            </button>
            {' '}и обещаешь быть нежной
          </p>
        )}

        <div className="flex-1" />

        {/* Mode switch */}
        <div className="mt-6 flex items-center gap-2 px-4 py-3.5 bg-kd-panel rounded-kd border border-kd-border">
          <span className="text-xs text-kd-text-soft flex-1">
            {mode === 'login' ? 'первый раз здесь?' : 'уже есть аккаунт?'}
          </span>
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs font-bold text-kd-accent font-mono hover:text-kd-accent-deep transition-colors"
          >
            {mode === 'login' ? 'создать аккаунт →' : '← войти'}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center gap-3 text-[10px] text-kd-text-mute font-mono">
          <span className="truncate">● {SERVER_HOST}</span>
          <div className="w-px h-2.5 bg-kd-border shrink-0" />
          <span>{APP_VERSION}</span>
          <div className="flex-1" />
          <ThemeToggle size={12} />
        </div>
      </div>
    </div>
  )
}
