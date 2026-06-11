// Профиль участника. Источник паттерна: designs/final-profile.jsx —
// градиентная шапка без ModalHeader, аватар 70 с ring внахлёст, секции panel-alt.

import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { UserProfile } from '@kakdela/ginzu/api-types'

import { ApiError } from '../../lib/api.js'
import { Avatar } from '../../components/Avatar.js'
import { Modal } from '../../components/Modal.js'
import { getUserProfile } from './api.js'
import { useProfileUi } from './store.js'
import { ProfileEditForm } from './ProfileEditForm.js'

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

function fmtJoined(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru', { month: 'long', year: 'numeric' })
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
  const setEditing = useProfileUi((s) => s.setEditing)

  function openDm() {
    close()
    navigate(`/dm/with/${profile.id}`)
  }

  return (
    <div className="px-[18px] pb-4">
      {/* аватар внахлёст на градиентную шапку */}
      <div className="flex items-end gap-3 -mt-7 mb-3">
        <Avatar
          name={profile.displayName}
          avatarUrl={profile.avatarUrl}
          size={70}
          status={profile.status}
          ring="var(--kd-accent)"
          ringColor="var(--kd-panel)"
        />
        <div className="flex-1 min-w-0 pb-1">
          <div className="text-[18px] font-bold text-kd-text tracking-[-0.01em] truncate">
            {profile.displayName}
          </div>
          <div className="text-[11px] text-kd-text-mute font-mono truncate">
            @{profile.username} · с нами с {fmtJoined(profile.createdAt)}
          </div>
        </div>
        {profile.isSelf ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-2.5 py-[5px] mb-1 rounded bg-kd-panel-alt border border-kd-border text-[11px] font-mono font-semibold text-kd-text hover:bg-kd-panel-hi shrink-0"
          >
            редактировать
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

      {/* статус — данные есть всегда (status), customStatus опционален */}
      <div className="p-3 rounded-kd bg-kd-panel-alt border border-kd-border mb-2.5 flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[profile.status]}`} />
        <div className="flex-1 min-w-0">
          <SectionTitle>статус</SectionTitle>
          <div className="text-[12px] font-semibold text-kd-text truncate -mt-1">
            {profile.customStatus ?? STATUS_LABEL[profile.status]}
          </div>
        </div>
        {profile.customStatus && (
          <div className="text-[10px] text-kd-text-mute font-mono shrink-0">
            {STATUS_LABEL[profile.status]}
          </div>
        )}
      </div>

      {profile.sharedServers.length > 0 && (
        <div className="p-3 rounded-kd bg-kd-panel-alt border border-kd-border">
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

export function ProfileModal() {
  const openUserId = useProfileUi((s) => s.openUserId)
  const editing = useProfileUi((s) => s.editing)
  const close = useProfileUi((s) => s.close)
  const setEditing = useProfileUi((s) => s.setEditing)

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
          <button
            type="button"
            onClick={close}
            title="esc"
            className="absolute top-2 right-2.5 px-2 py-1 rounded bg-kd-overlay-soft text-kd-stage-text text-[10px] font-mono transition-opacity hover:opacity-80"
          >
            esc ✕
          </button>
        </div>
        {isLoading && (
          <div className="p-8 text-center text-kd-text-mute font-mono text-[11px]">загружаем…</div>
        )}
        {errorMsg && !profile && (
          <div className="p-8 text-center text-kd-danger font-mono text-[11px]">{errorMsg}</div>
        )}
        {profile && !editing && <ReadView profile={profile} />}
        {profile && editing && profile.isSelf && (
          <div className="px-[18px] py-4">
            <ProfileEditForm
              profile={profile}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
