// Профиль участника. Источник паттерна: designs/final-profile.jsx —
// шапка-баннер (фото или градиент) без ModalHeader, аватар 70 с ring
// внахлёст, секции panel-alt: о себе, статус + часовой пояс, общие комнаты.

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { UserProfile } from '@kakdela/ginzu/api-types'

import { ApiError } from '../../lib/api.js'
import { Avatar } from '../../components/Avatar.js'
import { Modal } from '../../components/Modal.js'
import { useSettingsUi } from '../settings/store.js'
import { getUserProfile } from './api.js'
import { useProfileUi } from './store.js'

const STATUS_LABEL: Record<UserProfile['status'], string> = {
  online:  'в сети',
  idle:    'отошёл',
  dnd:     'не беспокоить',
  offline: 'не в сети',
}

const STATUS_DOT: Record<UserProfile['status'], string> = {
  online:  'bg-kd-online',
  idle:    'bg-kd-idle',
  dnd:     'bg-kd-dnd',
  offline: 'bg-kd-text-mute',
}

// «с нами с осени 2023» — сезон читается теплее точного месяца.
function fmtJoined(iso: string): string {
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const season = m <= 2 || m === 12 ? 'зимы' : m <= 5 ? 'весны' : m <= 8 ? 'лета' : 'осени'
  // Декабрьская зима относится к следующему году по ощущению, но год
  // оставляем календарный — «с зимы 2023» для 2023-12 читается верно.
  return `${season} ${d.getFullYear()}`
}

/** «МСК · 11:24» — короткое имя пояса + текущее время там. */
function fmtTzNow(tz: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('ru', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).formatToParts(new Date())
    const get = (type: string) => parts.find((p) => p.type === type)?.value
    const hour = get('hour')
    const minute = get('minute')
    const name = get('timeZoneName')
    if (!hour || !minute) return null
    return `${name ?? tz} · ${hour}:${minute}`
  } catch {
    return null
  }
}

const ROLE_LABEL: Record<UserProfile['sharedServers'][number]['role'], string> = {
  owner:  'хозяин',
  admin:  'админ',
  member: 'свой',
}

/** Label секции профиля: mono uppercase 10px (designs/final-profile.jsx). */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.05em] text-kd-text-mute mb-1.5">
      {children}
    </div>
  )
}

function ReadView({ profile }: { profile: UserProfile }) {
  const [, navigate] = useLocation()
  const close = useProfileUi((s) => s.close)
  const openSettings = useSettingsUi((s) => s.open)

  function openDm() {
    close()
    navigate(`/dm/with/${profile.id}`)
  }

  // Редактирование живёт в полноэкранных настройках («аккаунт → мой профиль»).
  function openProfileSettings() {
    close()
    openSettings('profile')
  }

  const tzNow = profile.timezone ? fmtTzNow(profile.timezone) : null

  return (
    <div className="px-[18px] pb-4">
      {/* аватар внахлёст на баннер; -mt-6 (не -7) + leading-none — иначе
          колонка имени (прижатая к низу items-end) верхом упиралась в баннер */}
      <div className="flex items-end gap-3 -mt-6 mb-3">
        <Avatar
          name={profile.displayName}
          avatarUrl={profile.avatarUrl}
          size={70}
          status={profile.status}
          ring="var(--kd-accent)"
          ringColor="var(--kd-panel)"
        />
        <div className="flex-1 min-w-0 pb-1">
          <div className="text-[18px] leading-none font-bold text-kd-text tracking-[-0.01em] truncate">
            {profile.displayName}
          </div>
          <div className="text-[11px] leading-none mt-1 text-kd-text-mute font-mono truncate">
            @{profile.username} · с нами с {fmtJoined(profile.createdAt)}
          </div>
        </div>
        {profile.isSelf ? (
          <button
            type="button"
            onClick={openProfileSettings}
            className="px-2.5 py-[5px] mb-1 rounded bg-kd-panel-alt border border-kd-border text-[11px] font-mono font-semibold text-kd-text hover:bg-kd-panel-hi shrink-0"
          >
            ⚙ настройки
          </button>
        ) : (
          <button
            type="button"
            onClick={openDm}
            className="px-2.5 py-[5px] mb-1 rounded bg-kd-accent text-white text-[11px] font-mono font-semibold hover:bg-kd-accent-deep shrink-0"
          >
            написать ⏎
          </button>
        )}
      </div>

      {/* роли — цветные пилюли (designs/final-profile.jsx) */}
      {profile.roles.length > 0 && (
        <div className="mb-2.5">
          <SectionTitle>роли · {profile.roles.length}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {profile.roles.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-kd-panel-alt text-[11px] font-mono text-kd-text"
                style={{ borderColor: r.color ? `${r.color}55` : 'var(--kd-border)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.color ?? 'var(--kd-text-mute)' }} />
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* о себе */}
      {profile.about && (
        <div className="p-3 rounded-kd bg-kd-panel-alt border border-kd-border mb-2.5">
          <SectionTitle>о себе</SectionTitle>
          <div className="text-[13px] text-kd-text leading-relaxed whitespace-pre-wrap break-words">
            {profile.about}
          </div>
        </div>
      )}

      {/* статус + часовой пояс в один ряд */}
      <div className="flex gap-2 mb-2.5">
        <div className="flex-1 min-w-0 px-2.5 py-2 rounded-kd bg-kd-panel-alt border border-kd-border flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[profile.status]}`} />
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-kd-text-mute">статус</div>
            <div className="text-[12px] font-semibold text-kd-text truncate">
              {profile.customStatus ?? STATUS_LABEL[profile.status]}
            </div>
          </div>
        </div>
        {tzNow && (
          <div className="flex-1 min-w-0 px-2.5 py-2 rounded-kd bg-kd-panel-alt border border-kd-border">
            <div className="text-[11px] font-mono text-kd-text-mute">часовой пояс</div>
            <div className="text-[12px] font-semibold text-kd-text truncate" title={profile.timezone ?? undefined}>
              {tzNow}
            </div>
          </div>
        )}
      </div>

      {profile.sharedServers.length > 0 && (
        <div>
          <SectionTitle>
            {profile.isSelf ? 'мои комнаты' : 'общие комнаты'} · {profile.sharedServers.length}
          </SectionTitle>
          <div className="flex flex-col gap-1">
            {profile.sharedServers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { close(); navigate(`/servers/${s.id}`) }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-kd-panel-hi transition-colors text-left"
              >
                <div className="w-[26px] h-[26px] rounded bg-kd-accent text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-kd-text truncate">{s.name}</div>
                  <div className="text-[10px] text-kd-text-mute font-mono">{ROLE_LABEL[s.role]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** «···» в шапке: скопировать ник, для своего профиля — настройки. */
function HeaderMenu({ profile, onClose }: { profile: UserProfile; onClose(): void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const openSettings = useSettingsUi((s) => s.open)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 rounded bg-kd-overlay-soft text-kd-stage-text text-[10px] font-mono transition-opacity hover:opacity-80"
      >
        · · ·
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 min-w-[170px] bg-kd-panel border border-kd-border rounded-kd shadow-lg py-1">
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) void navigator.clipboard.writeText(`@${profile.username}`)
              setOpen(false)
            }}
            className="w-full text-left px-3 py-1.5 text-[12px] text-kd-text hover:bg-kd-panel-alt transition-colors"
          >
            скопировать @ник
          </button>
          {profile.isSelf && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onClose()
                openSettings('profile')
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-kd-text hover:bg-kd-panel-alt transition-colors"
            >
              настройки профиля
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function ProfileModal() {
  const openUserId = useProfileUi((s) => s.openUserId)
  const close = useProfileUi((s) => s.close)

  const enabled = openUserId !== null
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile', openUserId],
    queryFn: () => getUserProfile(openUserId!),
    enabled,
    staleTime: 30_000,
  })

  if (!enabled) return null

  const errorMsg = error instanceof ApiError ? error.message : (error as Error | null)?.message

  return (
    <Modal onClose={close} width={460}>
      {/* единый скролл-контейнер: шапка + контент, чтобы -mt-7 аватара не клипался */}
      <div className="overflow-y-auto min-h-0">
        <div className="relative h-20 bg-gradient-to-br from-kd-profile-grad-from to-kd-profile-grad-to">
          {profile?.bannerUrl && (
            <img
              src={profile.bannerUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          )}
          <div className="absolute top-2 right-2.5 flex gap-1">
            {profile && <HeaderMenu profile={profile} onClose={close} />}
            <button
              type="button"
              onClick={close}
              title="esc"
              className="px-2 py-1 rounded bg-kd-overlay-soft text-kd-stage-text text-[10px] font-mono transition-opacity hover:opacity-80"
            >
              esc ✕
            </button>
          </div>
        </div>
        {isLoading && (
          <div className="p-8 text-center text-kd-text-mute font-mono text-[11px]">загружаем…</div>
        )}
        {errorMsg && !profile && (
          <div className="p-8 text-center text-kd-danger font-mono text-[11px]">{errorMsg}</div>
        )}
        {profile && <ReadView profile={profile} />}
      </div>
    </Modal>
  )
}
