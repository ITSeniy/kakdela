import type { ReactNode } from 'react'

import { Icon } from '../../components/Icon.js'
import { useRealtimeStore } from '../realtime/store.js'
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
  const base =
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-kd text-[11px] font-semibold transition-colors'
  const color =
    tone === 'danger'
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[base, color, disabled ? 'opacity-50 cursor-not-allowed' : ''].join(' ')}
    >
      {children}
      {label}
    </button>
  )
}

export function VoiceControls({
  onToggleMute,
  onToggleDeafen,
  onToggleScreenShare,
  onChangeScreenQuality,
  onLeave,
}: VoiceControlsProps) {
  const muted = useVoiceStore((s) => s.muted)
  const deafened = useVoiceStore((s) => s.deafened)
  const status = useVoiceStore((s) => s.status)
  const error = useVoiceStore((s) => s.error)
  const pttHolding = useVoiceStore((s) => s.pttHolding)
  const screenSharing = useVoiceStore((s) => s.screenSharing)
  const withAudio = useScreenShareSettings((s) => s.withAudio)
  const audioCaptureSupported = useScreenShareSettings((s) => s.audioCaptureSupported)
  const setWithAudio = useScreenShareSettings((s) => s.setWithAudio)
  const screenQuality = useScreenShareSettings((s) => s.screenQuality)
  const inputMode = useVoiceInputSettings((s) => s.inputMode)
  const pttKey = useVoiceInputSettings((s) => s.pttKey)
  // Воксовой RTT мы пока не меряем — показываем WS-latency как ближайший
  // прокси (одна WAN-задержка). Заменим на реальную RTT из LiveKit статов
  // в фазе полировки.
  const wsLatency = useRealtimeStore((s) => s.latency)

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
      <div
        className={[
          'text-[10px] font-mono mr-2',
          status === 'connected' ? 'text-kd-online' : 'text-kd-text-mute',
        ].join(' ')}
      >
        ●{' '}
        {status === 'connected'
          ? (wsLatency !== null ? `${wsLatency} мс` : 'в эфире')
          : status === 'reconnecting'
            ? 'переподключение…'
            : status === 'connecting'
              ? 'подключение…'
              : status}
      </div>

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
        label="демо"
        onClick={onToggleScreenShare}
        tone={screenSharing ? 'warn' : 'default'}
        title={screenSharing ? 'остановить демонстрацию экрана' : 'начать демонстрацию экрана'}
      >
        <Icon.Monitor size={13} />
      </CtrlButton>

      {/* Toggle захвата системного звука. Disabled, если платформа уже
          подтвердила, что не отдаёт audio (T-050a). Менять можно только
          между сессиями — внутри активной демки переключение игнорируется
          до следующего stop/start, и это OK. */}
      <button
        type="button"
        onClick={() => setWithAudio(!withAudio)}
        disabled={screenSharing || audioCaptureSupported === false}
        title={
          audioCaptureSupported === false
            ? 'на вашей системе недоступно — браузер не отдаёт системный звук'
            : screenSharing
              ? 'переключите до начала демо'
              : withAudio
                ? 'захватывать системный звук вместе с экраном'
                : 'демо без системного звука'
        }
        className={[
          'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-kd text-[11px] font-semibold transition-colors',
          (screenSharing || audioCaptureSupported === false)
            ? 'opacity-50 cursor-not-allowed bg-transparent text-kd-stage-text border border-kd-border'
            : withAudio
              ? 'bg-kd-panel-hi text-kd-text border border-transparent'
              : 'bg-transparent text-kd-stage-text border border-kd-border hover:bg-kd-panel-hi/20',
        ].join(' ')}
      >
        <NoteIcon />
        со звуком
      </button>

      {/* Селектор качества screen share. Нативный <select> — потому что у нас
          нет дизайн-системы dropdown'ов, а styling тут уже декоративный
          (Chromium умеет рисовать стрелку и список сам). При смене во время
          трансляции — restart через onChangeScreenQuality в VoiceScreen. */}
      <label className="inline-flex items-center gap-1.5 text-[10px] font-mono text-kd-stage-text">
        <select
          value={screenQuality}
          onChange={(e) => onChangeScreenQuality(e.target.value as ScreenQuality)}
          title={
            screenSharing
              ? 'смена качества перезапустит трансляцию — picker появится снова'
              : 'качество screen share'
          }
          className="bg-kd-panel border border-kd-border rounded-kd px-1.5 py-1 text-[10px] font-mono text-kd-text hover:bg-kd-panel-hi focus:outline-none focus:ring-1 focus:ring-kd-accent"
        >
          {SCREEN_QUALITY_ORDER.map((q) => (
            <option key={q} value={q}>{SCREEN_QUALITY_LABELS[q]}</option>
          ))}
        </select>
      </label>

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
