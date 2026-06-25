// Баннер профиля: фото вместо стандартного градиента (как Discord Nitro).
// Превью повторяет шапку карточки профиля; кадрирование — тем же кроппером,
// что и аватар, только с широкой рамкой 2.5:1 (итог 1200×480 jpeg).

import { useState } from 'react'

import { Avatar } from '../../components/Avatar.js'
import { uploadAttachment } from '../files/upload.js'
import { AvatarCropper } from './AvatarCropper.js'

const BANNER_W = 1200
const BANNER_H = 480

interface BannerPickerProps {
  /** null — стандартный градиент. */
  value: string | null
  onChange(url: string | null): void
  /** Для превью «как карточка профиля»: аватар внахлёст + имя. */
  avatarUrl?: string | null
  displayName?: string
}

export function BannerPicker({ value, onChange, avatarUrl, displayName }: BannerPickerProps) {
  const [cropperOpen, setCropperOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCropConfirm(blob: Blob) {
    setBusy(true)
    setError(null)
    try {
      const file = new File([blob], `banner-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const attachment = await uploadAttachment(file)
      onChange(attachment.url)
      setCropperOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'не удалось загрузить баннер')
    } finally {
      setBusy(false)
    }
  }

  if (cropperOpen) {
    return (
      <div>
        <AvatarCropper
          initialUrl={value}
          outputWidth={BANNER_W}
          outputHeight={BANNER_H}
          round={false}
          onConfirm={(blob) => void onCropConfirm(blob)}
          onCancel={() => setCropperOpen(false)}
        />
        {busy && <p className="mt-1.5 text-[10px] text-kd-text-mute font-mono">грузим…</p>}
        {error && <p className="mt-1.5 text-[10px] text-kd-danger font-mono">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      {/* Превью повторяет шапку карточки профиля (ProfileModal): баннер h-20,
          аватар внахлёст на -mt-6, отступ контента px-[18px] — те же числа,
          чтобы расстояния в превью и на реальной карточке совпадали. */}
      <div className="rounded-kd border border-kd-border overflow-hidden bg-kd-panel">
        <div className="h-20 bg-gradient-to-br from-kd-profile-grad-from to-kd-profile-grad-to">
          {value && (
            <img src={value} alt="баннер профиля" className="w-full h-full object-cover" draggable={false} />
          )}
        </div>
        <div className="px-[18px] pb-3">
          <div className="flex items-end gap-3 -mt-6">
            <Avatar
              name={displayName ?? ''}
              avatarUrl={avatarUrl ?? null}
              size={70}
              ringColor="var(--kd-panel)"
            />
            {displayName && (
              <div className="flex-1 min-w-0 pb-1 text-[15px] font-bold text-kd-text truncate">
                {displayName}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={() => setCropperOpen(true)}
          className="px-3 py-1.5 rounded border border-kd-border text-[11px] font-mono text-kd-text hover:bg-kd-panel-hi"
        >
          {value ? 'заменить фото' : 'загрузить фото'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 rounded border border-kd-border text-[11px] font-mono text-kd-danger hover:bg-kd-panel-hi"
          >
            вернуть градиент
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[10px] text-kd-danger font-mono">{error}</p>}
    </div>
  )
}
