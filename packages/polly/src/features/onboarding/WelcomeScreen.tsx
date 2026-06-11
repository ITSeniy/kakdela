import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Avatar } from '../../components/Avatar.js'
import { useAuthStore } from '../auth/store.js'
import { listServers } from '../servers/api.js'
import { useServerCreateJoinUi } from '../servers/store.js'

// Post-auth welcome — три карточки выбора «куда дальше»: войти к друзьям по
// инвайту, завести свою комнату, или вернуться в уже существующий сервер.
// Дизайн: designs/final-onboarding.jsx (OBCard-паттерн, как в auth/OnboardingScreen).
// Перенесён из T-013 в T-083 пункт 7.

const APP_VERSION = 'v0.0.1'

// ───── OBCard shell ─────

const ACCENT_EDGE = {
  accent: 'border-t-2 border-t-kd-accent',
  warm: 'border-t-2 border-t-kd-warm',
  none: '',
} as const

interface OBCardProps {
  accent?: keyof typeof ACCENT_EDGE
  title: string
  hint: string
  badge?: string
  footer?: string
  onClick?: () => void
  children?: React.ReactNode
}

function OBCard({ accent = 'none', title, hint, badge, footer, onClick, children }: OBCardProps) {
  const className = [
    'relative text-left p-6 rounded-kd bg-kd-panel border border-kd-border flex flex-col gap-3',
    ACCENT_EDGE[accent],
    onClick ? 'cursor-pointer transition-colors hover:bg-kd-panel-hi' : '',
  ].join(' ')

  const body = (
    <>
      {badge && (
        <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-[0.05em] bg-kd-warm-bg text-kd-warm">
          {badge}
        </span>
      )}
      <div>
        <div className="text-[15px] font-bold text-kd-text">{title}</div>
        <div className="text-[11px] text-kd-text-soft mt-1">{hint}</div>
      </div>
      {children}
      {footer && <div className="text-[10px] text-kd-text-mute font-mono mt-1">{footer}</div>}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}

// ───── Main cards ─────

function JoinCard({ onJoin }: { onJoin(): void }) {
  return (
    <OBCard
      accent="accent"
      title="зайти к друзьям"
      hint="по ссылке или коду приглашения"
      footer="код вида XXXX-XXXX · 8 символов"
      onClick={onJoin}
    >
      <div className="px-3 py-2.5 rounded-kd bg-kd-panel-alt border border-dashed border-kd-text-mute flex items-center gap-2">
        <span className="text-[12px] font-mono text-kd-text-mute">код:</span>
        <span className="flex-1 text-[12px] font-mono font-semibold text-kd-text">xxxx-xxxx</span>
        <span className="text-[11px] font-mono font-bold text-kd-accent">ввести →</span>
      </div>
    </OBCard>
  )
}

function CreateCard({ onCreate }: { onCreate(): void }) {
  return (
    <OBCard
      accent="warm"
      title="завести свою комнату"
      hint="полностью свой инстанс — данные у тебя"
      badge="новое"
      footer="до 20 друзей одним инвайтом"
      onClick={onCreate}
    >
      <div className="text-[11px] text-kd-text-soft leading-relaxed">
        текстовые каналы, голос, демо экрана — и никаких чужих глаз.
        будешь хозяином, всё под твоим присмотром.
      </div>
    </OBCard>
  )
}

function ExistingCard({
  servers,
  onPick,
}: {
  servers: { id: string; name: string }[]
  onPick(id: string): void
}) {
  if (servers.length === 0) {
    return (
      <OBCard title="вернуться к своим" hint="пока пусто — вступите в первый сервер">
        <div className="text-[11px] text-kd-text-mute italic">
          ни одной комнаты — начните с двух карточек слева
        </div>
      </OBCard>
    )
  }
  return (
    <OBCard
      title="вернуться к своим"
      hint={`${servers.length} ${servers.length === 1 ? 'комната' : servers.length < 5 ? 'комнаты' : 'комнат'}`}
    >
      <div className="flex flex-col gap-1.5">
        {servers.slice(0, 4).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-kd bg-kd-panel-alt border border-kd-border text-left cursor-pointer transition-colors hover:bg-kd-panel-hi"
          >
            <div className="w-7 h-7 rounded bg-kd-accent text-white flex items-center justify-center text-[11px] font-bold shrink-0">
              {s.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[12px] font-semibold text-kd-text truncate">{s.name}</span>
          </button>
        ))}
        {servers.length > 4 && (
          <div className="text-[10px] text-kd-text-mute font-mono pl-2">
            + ещё {servers.length - 4}
          </div>
        )}
      </div>
    </OBCard>
  )
}

// ───── Footer info card (как в auth/OnboardingScreen) ─────

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

// ───── Screen ─────

export function WelcomeScreen() {
  const user = useAuthStore((s) => s.user)
  const [, navigate] = useLocation()
  const openCreate = useServerCreateJoinUi((s) => s.openCreate)
  const openJoin = useServerCreateJoinUi((s) => s.openJoin)

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: listServers,
    staleTime: 30_000,
  })

  const firstName = user?.displayName?.split(/\s+/)[0]?.toLowerCase() ?? ''

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
        {user && (
          <>
            <span className="text-[11px] text-kd-text-soft">
              привет, {user.displayName} · @{user.username}
            </span>
            <Avatar name={user.displayName} avatarUrl={user.avatarUrl} size={24} />
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-12 py-8 flex flex-col gap-7">
        {/* Greeting */}
        <div className="text-center max-w-[600px] mx-auto">
          <div className="text-[26px] font-bold text-kd-text tracking-[-0.02em] mb-1.5">
            {firstName ? `привет, ${firstName}. как дела?` : 'привет. как дела?'}
          </div>
          <div className="text-[13px] text-kd-text-soft leading-relaxed">
            давай заведём тебе уголок. можешь зайти в чужую комнату или начать свою —<br />
            никто не торопит.
          </div>
        </div>

        {/* Three main cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 max-w-[980px] mx-auto w-full">
          <JoinCard onJoin={() => openJoin()} />
          <CreateCard onCreate={openCreate} />
          <ExistingCard
            servers={servers}
            onPick={(id) => navigate(`/servers/${id}`)}
          />
        </div>

        {/* Footer info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-[980px] mx-auto w-full">
          <InfoCard icon="🌿" title="что такое «свой инстанс»?">
            код «как дела?» крутится на твоей машине или у друга — никто из нас
            не видит ваших сообщений и файлов. бэкап тоже у вас.
          </InfoCard>
          <InfoCard icon="📜" title="горячие клавиши уже работают">
            <span className="font-mono">Ctrl+K</span> — поиск везде ·
            <span className="font-mono"> Esc</span> — закрыть модалку ·
            <span className="font-mono"> Enter</span> — отправить сообщение
          </InfoCard>
        </div>
      </div>
    </div>
  )
}
