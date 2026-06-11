import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { User, UserProfile } from '@kakdela/ginzu/api-types'

import { ApiError } from '../../lib/api.js'
import { useAuthStore } from '../auth/store.js'
import { uploadAttachment } from '../files/upload.js'
import { ThemePicker } from '../settings/ThemePicker.js'
import { VoiceSettings } from '../settings/VoiceSettings.js'
import { Avatar } from '../../components/Avatar.js'
import { Field } from '../../components/form/Field.js'
import { AvatarCropper } from './AvatarCropper.js'
import { patchMe } from './api.js'

interface ProfileEditFormProps {
  profile: UserProfile
  onSaved: (user: User) => void
  onCancel: () => void
}

const INPUT_CLS =
  'w-full px-3 py-2 rounded-kd bg-kd-bg border border-kd-border text-[13px] text-kd-text outline-none focus:border-kd-accent'

export function ProfileEditForm({ profile, onSaved, onCancel }: ProfileEditFormProps) {
  const queryClient = useQueryClient()
  const updateSession = useAuthStore((s) => s.setSession)
  const accessToken = useAuthStore((s) => s.accessToken)

  const [displayName, setDisplayName] = useState(profile.displayName)
  const [customStatus, setCustomStatus] = useState(profile.customStatus ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty =
    displayName !== profile.displayName
    || (customStatus || null) !== (profile.customStatus ?? null)
    || avatarUrl !== profile.avatarUrl
    || newPassword !== ''

  async function onAvatarCropConfirm(blob: Blob) {
    setAvatarBusy(true)
    setError(null)
    try {
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const attachment = await uploadAttachment(file)
      setAvatarUrl(attachment.url)
      setCropperOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'не удалось загрузить аватар')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function save() {
    setError(null)
    if (newPassword) {
      if (newPassword.length < 12) {
        setError('новый пароль — минимум 12 символов')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('пароль и подтверждение не совпадают')
        return
      }
      if (!currentPassword) {
        setError('введите текущий пароль для смены')
        return
      }
    }

    setSaving(true)
    try {
      const updates: Parameters<typeof patchMe>[0] = {}
      if (displayName !== profile.displayName) updates.displayName = displayName
      const nextStatus = customStatus.trim() === '' ? null : customStatus
      if (nextStatus !== (profile.customStatus ?? null)) updates.customStatus = nextStatus
      if (avatarUrl !== profile.avatarUrl) updates.avatarUrl = avatarUrl
      if (newPassword) {
        updates.currentPassword = currentPassword
        updates.newPassword = newPassword
      }

      const updated = await patchMe(updates)

      // Auth store ожидает (user, accessToken). Текущий access всё ещё валиден —
      // PATCH /me не ротирует access-токен. Refresh уйдёт на следующем тике.
      if (accessToken) updateSession(updated, accessToken)
      void queryClient.invalidateQueries({ queryKey: ['user-profile', updated.id] })
      void queryClient.invalidateQueries({ queryKey: ['members'] })

      onSaved(updated)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error).message
      setError(msg || 'ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="аватар" hint="jpeg / png / webp до 2 МБ">
        {cropperOpen ? (
          <AvatarCropper
            initialUrl={avatarUrl}
            onConfirm={onAvatarCropConfirm}
            onCancel={() => setCropperOpen(false)}
          />
        ) : (
          <div className="flex items-center gap-4">
            <Avatar name={displayName} avatarUrl={avatarUrl} size={72} />
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setCropperOpen(true)}
                disabled={avatarBusy}
                className="px-3 py-1.5 rounded border border-kd-border text-[11px] font-mono text-kd-text hover:bg-kd-panel-hi disabled:opacity-50"
              >
                {avatarBusy ? 'грузим…' : 'изменить'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="block px-3 py-1.5 rounded border border-kd-border text-[11px] font-mono text-kd-danger hover:bg-kd-panel-hi"
                >
                  убрать
                </button>
              )}
            </div>
          </div>
        )}
      </Field>

      <Field label="отображаемое имя">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={64}
          className={INPUT_CLS}
        />
      </Field>
      <Field label={`статус · ${customStatus.length}/128`}>
        <input
          type="text"
          value={customStatus}
          onChange={(e) => setCustomStatus(e.target.value.slice(0, 128))}
          maxLength={128}
          placeholder="пьёт какао ☕"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="тема" hint="следуем системе или фиксируем вручную">
        <ThemePicker />
      </Field>

      <VoiceSettings />

      <Field label="смена пароля" hint="требуется текущий пароль; смена сбрасывает все сессии">
        <div className="flex flex-col gap-2.5">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="текущий пароль"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={INPUT_CLS}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="новый пароль (мин. 12)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={INPUT_CLS}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="повторите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={INPUT_CLS}
          />
        </div>
      </Field>

      {error && (
        <div className="px-3 py-2 rounded-kd bg-kd-danger/10 text-kd-danger text-[12px] font-mono">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-kd-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded border border-kd-border text-[12px] font-mono text-kd-text-soft hover:text-kd-text"
        >
          отмена
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !dirty}
          className="px-4 py-1.5 rounded bg-kd-accent text-white text-[12px] font-mono font-bold hover:bg-kd-accent-deep disabled:opacity-50"
        >
          {saving ? 'сохраняем…' : 'сохранить'}
        </button>
      </div>
    </div>
  )
}
