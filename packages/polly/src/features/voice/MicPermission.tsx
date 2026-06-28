import { useEffect, useState } from 'react'

import { openExternal } from '../../lib/host/shell.js'
import { getPlatform, type HostPlatform } from '../../lib/host/platform.js'
import { retryMicrophone } from './useVoiceRoom.js'

interface CopyPack {
  title: string
  body: string
  openLabel: string | null
  openTarget: string | null
}

const COPY_BY_PLATFORM: Record<HostPlatform, CopyPack> = {
  windows: {
    title: 'нужен доступ к микрофону',
    body:
      'Откройте Параметры Windows → Конфиденциальность → Микрофон. Включите «Разрешить настольным приложениям доступ к микрофону» и убедитесь, что «как дела» в списке. После — нажмите «Попробовать снова».',
    openLabel: 'открыть параметры',
    openTarget: 'ms-settings:privacy-microphone',
  },
  linux: {
    title: 'нужен доступ к микрофону',
    body:
      'Браузерный движок отказался выдать микрофон. Проверьте, что устройство ввода выбрано в PulseAudio / PipeWire (pavucontrol или аналог) и что приложение «как дела» не заблокировано на уровне дистрибутива. После — нажмите «Попробовать снова».',
    openLabel: null,
    openTarget: null,
  },
  macos: {
    title: 'нужен доступ к микрофону',
    body:
      'Системные настройки → Конфиденциальность и безопасность → Микрофон. Включите доступ для «как дела», после — нажмите «Попробовать снова».',
    openLabel: 'открыть параметры',
    openTarget: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  },
  web: {
    title: 'нужен доступ к микрофону',
    body:
      'Браузер отказался выдать микрофон. Нажмите на иконку слева от адресной строки и разрешите доступ для этой страницы, затем «Попробовать снова».',
    openLabel: null,
    openTarget: null,
  },
  android: {
    title: 'нужен доступ к микрофону',
    body:
      'Откройте настройки Android → Приложения → «как дела» → Разрешения → Микрофон и включите доступ. После — нажмите «Попробовать снова».',
    openLabel: null,
    openTarget: null,
  },
  ios: {
    title: 'нужен доступ к микрофону',
    body:
      'Откройте Настройки → «как дела» → Микрофон и включите доступ. После — нажмите «Попробовать снова».',
    openLabel: null,
    openTarget: null,
  },
}

interface MicPermissionDialogProps {
  onDismiss(): void
}

export function MicPermissionDialog({ onDismiss }: MicPermissionDialogProps) {
  const [platform, setPlatform] = useState<HostPlatform | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getPlatform().then((p) => {
      if (!cancelled) setPlatform(p)
    })
    return () => { cancelled = true }
  }, [])

  // Пока платформу не выяснили — показываем generic-копию (без open-button).
  const copy = platform ? COPY_BY_PLATFORM[platform] : COPY_BY_PLATFORM.web

  async function handleRetry() {
    setRetrying(true)
    try {
      const ok = await retryMicrophone()
      if (ok) onDismiss()
    } finally {
      setRetrying(false)
    }
  }

  async function handleOpenSettings() {
    if (!copy.openTarget) return
    setOpening(true)
    try {
      await openExternal(copy.openTarget)
    } catch (err) {
      console.warn('[mic-permission] open settings failed', err)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-20 flex items-center justify-center px-4"
      style={{ background: 'var(--kd-overlay-soft)' }}
    >
      <div
        className="max-w-md w-full rounded-kd border border-kd-border bg-kd-panel p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--kd-warm)' }} aria-hidden>
            <MicOffIcon />
          </span>
          <h2 className="text-[14px] font-bold text-kd-text">{copy.title}</h2>
        </div>

        <p className="text-[12px] text-kd-text-soft leading-relaxed">{copy.body}</p>

        <div className="flex items-center gap-2 pt-1">
          {copy.openTarget && (
            <button
              type="button"
              onClick={handleOpenSettings}
              disabled={opening}
              className={[
                'px-3 py-1.5 rounded text-[12px] font-semibold transition-colors',
                'bg-kd-accent text-white hover:opacity-90',
                opening ? 'opacity-60 cursor-wait' : '',
              ].join(' ')}
            >
              {opening ? 'открываем…' : copy.openLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className={[
              'px-3 py-1.5 rounded text-[12px] font-semibold border transition-colors',
              'border-kd-border text-kd-text hover:bg-kd-panel-alt',
              retrying ? 'opacity-60 cursor-wait' : '',
            ].join(' ')}
          >
            {retrying ? 'проверяем…' : 'попробовать снова'}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onDismiss}
            className="px-2 py-1 text-[11px] font-mono text-kd-text-mute hover:text-kd-text-soft transition-colors"
          >
            закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

function MicOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}
