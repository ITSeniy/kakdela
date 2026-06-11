import { useEffect, useRef, useState } from 'react'

import { ServerIcon } from '../../components/ServerIcon.js'
import { ThemeToggle } from '../../components/ThemeToggle.js'
import { ApiError } from '../../lib/api.js'
import { type InviteInfo, lookupInvite } from './api.js'

// Pre-auth onboarding по designs/final-onboarding.jsx: верхний бар + сетка
// карт. До регистрации единственное реальное действие — инвайт-флоу, поэтому
// рисуем одну функциональную карту (код → превью сервера → onProceed)
// и две информационные footer-карты. Мёртвых кнопок не добавляем.

type Step = 'code' | 'preview'

interface Props {
  initialCode?: string
  onProceed: (code: string) => void
}

const APP_VERSION = 'v0.0.1'

// ───── Shared primitives (same as AuthScreen) ─────

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

// ───── Error code → human text ─────

function inviteErrorText(code: string): string {
  if (code === 'invite-not-found') return 'инвайт не найден или недействителен'
  if (code === 'invite-expired') return 'инвайт истёк'
  if (code === 'invite-exhausted') return 'все места по этому инвайту заняты'
  return 'что-то пошло не так, попробуй ещё раз'
}

// ───── Footer info card ─────

function InfoCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="p-3.5 rounded-kd bg-kd-panel-soft border border-kd-border-soft flex items-center gap-3">
      <span className="text-[22px] select-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-kd-text">{title}</div>
        <div className="text-[11px] text-kd-text-soft mt-0.5 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

// ───── Onboarding screen ─────

export function OnboardingScreen({ initialCode = '', onProceed }: Props) {
  const [step, setStep] = useState<Step>('code')
  const [rawCode, setRawCode] = useState(initialCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autoLookupDone = useRef(false)

  // Auto-lookup when initial code is pre-filled (from URL)
  useEffect(() => {
    if (autoLookupDone.current) return
    if (rawCode.length === 8) {
      autoLookupDone.current = true
      void doLookup(rawCode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCodeChange(value: string) {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
    setRawCode(cleaned)
    setError(null)
  }

  const displayCode = rawCode.length > 4
    ? rawCode.slice(0, 4) + '-' + rawCode.slice(4)
    : rawCode

  async function doLookup(code: string) {
    setLoading(true)
    setError(null)
    try {
      const info = await lookupInvite(code)
      setInviteInfo(info)
      setStep('preview')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(inviteErrorText(err.code))
      } else {
        setError('что-то пошло не так, попробуй ещё раз')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleContinue() {
    if (rawCode.length < 8 || loading) return
    void doLookup(rawCode)
  }

  function onEnter(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleContinue()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-kd-bg text-kd-text font-sans">
      {/* Top bar */}
      <div className="px-5 py-2.5 flex items-center gap-2.5 border-b border-kd-border bg-kd-panel-alt shrink-0">
        <div className="w-7 h-7 rounded-kd bg-kd-warm text-white flex items-center justify-center text-[11px] font-extrabold tracking-tighter select-none">
          кд
        </div>
        <div className="text-[13px] font-bold text-kd-text">как дела?</div>
        <span className="text-[10px] text-kd-text-mute font-mono">self-hosted · {APP_VERSION}</span>
        <div className="flex-1" />
        <ThemeToggle size={14} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-7">
        {/* Greeting */}
        <div className="text-center max-w-[600px] mx-auto">
          <div className="text-[26px] font-bold text-kd-text tracking-[-0.02em] mb-1.5">
            тебя пригласили в гости
          </div>
          <div className="text-[13px] text-kd-text-soft leading-relaxed">
            введи код приглашения — посмотрим, куда зовут.<br />
            дальше быстрая регистрация, это пара минут.
          </div>
        </div>

        {/* Invite card */}
        <div className="w-full max-w-[440px] mx-auto p-6 rounded-kd bg-kd-panel border border-kd-border border-t-2 border-t-kd-accent flex flex-col gap-3">
          {step === 'code' ? (
            <>
              <div>
                <div className="text-[15px] font-bold text-kd-text">зайти к друзьям</div>
                <div className="text-[11px] text-kd-text-soft mt-1">по коду приглашения от хозяина сервера</div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="px-3 py-2.5 bg-kd-panel-alt border border-kd-danger rounded-kd">
                  <p className="text-[11px] text-kd-danger font-mono">{error}</p>
                </div>
              )}

              {/* Code input in dashed box */}
              <div>
                <label
                  htmlFor="invite-code"
                  className="block text-[10px] font-bold font-mono uppercase tracking-[0.05em] text-kd-text mb-1.5"
                >
                  код
                </label>
                <div
                  className={[
                    'flex items-center gap-2 px-3 py-2.5 rounded-kd bg-kd-panel-alt border border-dashed transition-colors',
                    error ? 'border-kd-danger' : 'border-kd-text-mute focus-within:border-kd-accent',
                  ].join(' ')}
                >
                  <input
                    id="invite-code"
                    type="text"
                    value={displayCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder="XXXX-XXXX"
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[16px] font-mono font-semibold text-kd-text tracking-widest placeholder:text-kd-text-mute placeholder:font-normal"
                  />
                  <span className="text-[10px] text-kd-text-mute font-mono shrink-0">
                    {rawCode.length}/8
                  </span>
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={rawCode.length < 8 || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-[11px] rounded-kd bg-kd-accent text-white text-[13px] font-bold transition-colors hover:bg-kd-accent-deep disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Spinner />}
                <span>продолжить</span>
                {!loading && (
                  <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded bg-white/20">
                    ⏎
                  </span>
                )}
              </button>

              <div className="text-[10px] text-kd-text-mute font-mono">
                код вида XXXX-XXXX · 8 символов
              </div>
            </>
          ) : (
            inviteInfo && (
              <>
                <div>
                  <div className="text-[15px] font-bold text-kd-text">вас пригласили</div>
                  <div className="text-[11px] text-kd-text-soft mt-1">проверь, что это именно тот сервер</div>
                </div>

                {/* Server preview */}
                <div className="p-4 bg-kd-panel-alt rounded-kd border border-kd-border flex items-center gap-4">
                  <ServerIcon name={inviteInfo.serverName} iconUrl={inviteInfo.serverIcon} size={64} />
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-kd-text truncate">{inviteInfo.serverName}</div>
                    {inviteInfo.expiresAt && (
                      <div className="text-[10px] text-kd-text-mute font-mono mt-0.5">
                        действует до {new Date(inviteInfo.expiresAt).toLocaleDateString('ru')}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-kd-text-soft leading-relaxed">
                  вас пригласили в{' '}
                  <span className="font-semibold text-kd-text italic">{inviteInfo.serverName}</span>.
                  {' '}зарегистрироваться?
                </p>

                <button
                  onClick={() => onProceed(rawCode)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-[11px] rounded-kd bg-kd-accent text-white text-[13px] font-bold transition-colors hover:bg-kd-accent-deep"
                >
                  <span>вступить</span>
                </button>

                <button
                  onClick={() => { setStep('code'); setError(null) }}
                  className="w-full text-center text-xs text-kd-text-mute font-mono hover:text-kd-text-soft transition-colors"
                >
                  ← изменить код
                </button>
              </>
            )
          )}
        </div>

        {/* Footer info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-[760px] mx-auto w-full">
          <InfoCard icon="🌿" title="что такое «свой инстанс»?">
            сервер «как дела?» крутится у тебя или у друзей дома. как тёплая лампа
            в гостиной — никаких чужих ушей.
          </InfoCard>
          <InfoCard icon="🎟" title="нет кода?">
            попроси у того, кто держит сервер, — инвайты выдаёт хозяин.
            код выглядит как <span className="font-mono">XXXX-XXXX</span>.
          </InfoCard>
        </div>
      </div>
    </div>
  )
}
