import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Icon } from '../../components/Icon.js'
import { describeKey, useVoiceInputSettings } from './inputSettings.js'
import {
  SCREEN_QUALITY_LABELS,
  SCREEN_QUALITY_ORDER,
  useScreenShareSettings,
  type ScreenQuality,
} from './screenShareSettings.js'
import { useVoiceStore } from './store.js'

interface VoiceControlsProps {
  onToggleMute(): void
  onToggleDeafen(): void
  onToggleCamera(): void
  onToggleScreenShare(): void
  onChangeScreenQuality(q: ScreenQuality): void
  onLeave(): void
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

// Кнопка-капсула из designs/final-voice.jsx (KD_VCtrl). Панель лежит на
// bg-kd-stage, поэтому «обычный» тон — прозрачная капсула со stage-текстом.
// Тоны: mute (выключенный микро/звук) — dnd, warn (идёт демо) — warm,
// hot (вы в эфире) — accent, danger (выйти) — danger.
function ctrlCls(tone: 'default' | 'mute' | 'warn' | 'hot' | 'danger' | undefined, active?: boolean): string {
  return tone === 'danger'
    ? 'bg-kd-danger text-white border border-transparent hover:opacity-90'
    : tone === 'mute'
      ? 'bg-kd-dnd text-white border border-transparent hover:opacity-90'
      : tone === 'warn'
        ? 'bg-kd-warm text-white border border-transparent hover:opacity-90'
        : tone === 'hot'
          ? 'bg-kd-accent text-white border border-transparent hover:opacity-90'
          : active
            ? 'bg-kd-panel-hi text-kd-text border border-transparent'
            : 'bg-transparent text-kd-stage-text border border-kd-border hover:bg-kd-panel-hi/20'
}

function CtrlButton({
  children, label, onClick, active, disabled, tone, title,
}: {
  children: ReactNode
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  tone?: 'default' | 'mute' | 'warn' | 'hot' | 'danger'
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-kd text-[11px] font-semibold transition-colors',
        ctrlCls(tone, active),
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
      {label}
    </button>
  )
}

/** Сплит-кнопка «демо»: основная — старт/стоп трансляции, ▾ — меню с
    настройками (системный звук + качество). */
function ScreenShareButton({
  onToggleScreenShare,
  onChangeScreenQuality,
}: {
  onToggleScreenShare(): void
  onChangeScreenQuality(q: ScreenQuality): void
}) {
  const screenSharing = useVoiceStore((s) => s.screenSharing)
  const withAudio = useScreenShareSettings((s) => s.withAudio)
  const audioCaptureSupported = useScreenShareSettings((s) => s.audioCaptureSupported)
  const setWithAudio = useScreenShareSettings((s) => s.setWithAudio)
  const screenQuality = useScreenShareSettings((s) => s.screenQuality)

  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const audioDisabled = screenSharing || audioCaptureSupported === false

  return (
    <div className="relative" ref={ref}>
      <div className="inline-flex">
        <button
          type="button"
          onClick={onToggleScreenShare}
          title={screenSharing ? 'остановить демонстрацию экрана' : 'начать демонстрацию экрана'}
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-[var(--kd-radius)] text-[11px] font-semibold transition-colors',
            ctrlCls(screenSharing ? 'warn' : 'default'),
          ].join(' ')}
        >
          <Icon.Monitor size={13} />
          демо
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          title="настройки демо"
          className={[
            'inline-flex items-center px-1.5 py-1.5 rounded-r-[var(--kd-radius)] text-[10px] transition-colors border-l-0',
            ctrlCls(screenSharing ? 'warn' : 'default', menuOpen),
          ].join(' ')}
        >
          ▾
        </button>
      </div>

      {menuOpen && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50 min-w-[190px] bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal py-1 select-none">
          <div className="px-3 pt-1 pb-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-kd-text-mute">
            настройки демо
          </div>
          <button
            type="button"
            onClick={() => { if (!audioDisabled) setWithAudio(!withAudio) }}
            disabled={audioDisabled}
            title={
              audioCaptureSupported === false
                ? 'на вашей системе недоступно — браузер не отдаёт системный звук'
                : screenSharing
                  ? 'переключите до начала демо'
                  : undefined
            }
            className={[
              'w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors',
              audioDisabled ? 'text-kd-text-mute opacity-60 cursor-not-allowed' : 'text-kd-text hover:bg-kd-panel-alt',
            ].join(' ')}
          >
            <NoteIcon />
            <span className="flex-1">со звуком</span>
            {withAudio && <span className="text-[10px] font-mono text-kd-accent">✓</span>}
          </button>
          <div className="my-1 h-px bg-kd-border mx-2" />
          <div className="px-3 pt-0.5 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-kd-text-mute">
            качество
          </div>
          {SCREEN_QUALITY_ORDER.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => { onChangeScreenQuality(q); setMenuOpen(false) }}
              title={screenSharing ? 'смена качества перезапустит трансляцию — picker появится снова' : undefined}
              className={[
                'w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors hover:bg-kd-panel-alt',
                q === screenQuality ? 'text-kd-text font-semibold' : 'text-kd-text-soft',
              ].join(' ')}
            >
              <span className="flex-1 font-mono">{SCREEN_QUALITY_LABELS[q]}</span>
              {q === screenQuality && <span className="text-[10px] font-mono text-kd-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function VoiceControls({
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
  onChangeScreenQuality,
  onLeave,
}: VoiceControlsProps) {
  const muted = useVoiceStore((s) => s.muted)
  const deafened = useVoiceStore((s) => s.deafened)
  const cameraOn = useVoiceStore((s) => s.cameraOn)
  const status = useVoiceStore((s) => s.status)
  const error = useVoiceStore((s) => s.error)
  const pttHolding = useVoiceStore((s) => s.pttHolding)
  const screenSharing = useVoiceStore((s) => s.screenSharing)
  const inputMode = useVoiceInputSettings((s) => s.inputMode)
  const pttKey = useVoiceInputSettings((s) => s.pttKey)

  const isPtt = inputMode === 'push-to-talk'
  const micButton = isPtt
    ? (
      <CtrlButton
        // В PTT мик-кнопка не интерактивна — это индикатор. onClick=undefined
        // и disabled, чтобы у пользователя не возникло желания на неё жать.
        label={pttHolding ? 'вы говорите' : `зажмите ${describeKey(pttKey)}`}
        disabled
        tone={pttHolding ? 'hot' : 'default'}
      >
        {pttHolding ? <Icon.Mic size={13} /> : <Icon.MicOff size={13} />}
      </CtrlButton>
    )
    : (
      <CtrlButton
        label={muted ? 'микро (выкл)' : 'микро'}
        onClick={onToggleMute}
        active={!muted}
        tone={muted ? 'mute' : 'hot'}
      >
        {muted ? <Icon.MicOff size={13} /> : <Icon.Mic size={13} />}
      </CtrlButton>
    )

  return (
    <div className="px-4 py-2 border-t border-kd-border bg-kd-stage flex items-center gap-1.5 shrink-0">
      {/* Пинг убран — переедет в другое место. Статус показываем только
          когда соединение нестабильно. */}
      {(status === 'reconnecting' || status === 'connecting') && (
        <span className="text-[10px] font-mono mr-2 text-kd-text-mute">
          ● {status === 'reconnecting' ? 'переподключение…' : 'подключение…'}
        </span>
      )}

      {micButton}

      <CtrlButton
        label={deafened ? 'звук (выкл)' : 'звук'}
        onClick={onToggleDeafen}
        active={!deafened}
        tone={deafened ? 'mute' : 'default'}
      >
        <Icon.Headphones size={13} />
      </CtrlButton>

      <CtrlButton
        label={cameraOn ? 'камера' : 'камера (выкл)'}
        onClick={onToggleCamera}
        active={cameraOn}
        tone={cameraOn ? 'hot' : 'default'}
        title={cameraOn ? 'выключить веб-камеру' : 'включить веб-камеру'}
      >
        <Icon.Video size={13} />
      </CtrlButton>

      <ScreenShareButton
        onToggleScreenShare={onToggleScreenShare}
        onChangeScreenQuality={onChangeScreenQuality}
      />

      {screenSharing && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-kd-warm bg-kd-overlay-strong border border-kd-border">
          вы транслируете
        </span>
      )}

      <div className="flex-1" />

      {error && (
        <span className="text-[10px] font-mono mr-2 text-kd-dnd">
          {error}
        </span>
      )}

      <CtrlButton label="выйти" onClick={onLeave} tone="danger">
        <Icon.PhoneOff size={13} />
      </CtrlButton>
    </div>
  )
}
