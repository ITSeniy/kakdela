// Док голосовой связи над UserBar (как в Discord): статус подключения,
// пинг (клик — всплывашка с графиком за 5 минут, средним и потерями),
// строка «канал / сервер» (клик — телепорт на экран ГС), кнопки
// шумоподавления, демонстрации экрана и выхода.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Icon } from '../../components/Icon.js'
import { getServerDetail } from '../servers/api.js'
import { useNoiseSettings } from './noiseSettings.js'
import { useVoicePing, type PingSample } from './pingStats.js'
import { useScreenShare } from './useScreenShare.js'
import { leaveVoiceRoom } from './useVoiceRoom.js'
import { useVoiceStore } from './store.js'

function NoiseIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h3l3-7 4 14 3-7h7" />
    </svg>
  )
}

function SignalIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <rect x="3" y="14" width="4" height="7" rx="1" />
      <rect x="10" y="9" width="4" height="12" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

/** График RTT за окно: SVG-полилиния + средний пинг + потери. */
function PingPopover({ samples }: { samples: PingSample[] }) {
  const rtts = samples.filter((s): s is PingSample & { rtt: number } => s.rtt !== null)
  const losses = samples.filter((s): s is PingSample & { loss: number } => s.loss !== null)
  const avg = rtts.length > 0
    ? Math.round(rtts.reduce((sum, s) => sum + s.rtt, 0) / rtts.length)
    : null
  const lossPct = losses.length > 0
    ? losses.reduce((sum, s) => sum + s.loss, 0) / losses.length
    : null

  const W = 216
  const H = 56
  let path: string | null = null
  if (rtts.length >= 2) {
    const t0 = rtts[0]!.t
    const t1 = rtts[rtts.length - 1]!.t
    const span = Math.max(1, t1 - t0)
    const maxRtt = Math.max(60, ...rtts.map((s) => s.rtt))
    path = rtts
      .map((s, i) => {
        const x = ((s.t - t0) / span) * W
        const y = H - (s.rtt / maxRtt) * (H - 6) - 3
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  return (
    <div className="absolute bottom-full left-2 right-2 mb-1.5 z-50 bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal p-3 select-none">
      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-kd-text-mute mb-2">
        соединение · 5 минут
      </div>
      {path ? (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block mb-2 rounded bg-kd-bg border border-kd-border-soft">
          <path d={path} fill="none" stroke="var(--kd-accent)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ) : (
        <div className="h-[56px] mb-2 rounded bg-kd-bg border border-kd-border-soft flex items-center justify-center text-[10px] font-mono text-kd-text-mute">
          собираем данные…
        </div>
      )}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-kd-text-soft">
          средний <span className="text-kd-text font-bold">{avg !== null ? `${avg} мс` : '—'}</span>
        </span>
        <span className="text-kd-text-soft">
          потери <span className={`font-bold ${lossPct !== null && lossPct >= 1 ? 'text-kd-dnd' : 'text-kd-text'}`}>
            {lossPct !== null ? `${lossPct.toFixed(1)}%` : '—'}
          </span>
        </span>
      </div>
    </div>
  )
}

function DockButton({
  title, active, danger, onClick, children,
}: {
  title: string
  active?: boolean
  danger?: boolean
  onClick(): void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'flex-1 flex items-center justify-center py-1.5 rounded-kd transition-colors border',
        danger
          ? 'text-kd-text-soft border-kd-border hover:bg-kd-danger hover:text-white hover:border-transparent'
          : active
            ? 'bg-kd-panel-hi text-kd-text border-transparent'
            : 'text-kd-text-soft border-kd-border hover:bg-kd-panel-hi hover:text-kd-text',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function VoiceDock() {
  const [, navigate] = useLocation()
  const status = useVoiceStore((s) => s.status)
  const activeChannelId = useVoiceStore((s) => s.activeChannelId)
  const activeServerId = useVoiceStore((s) => s.activeServerId)
  const screenSharing = useVoiceStore((s) => s.screenSharing)
  const noiseSuppression = useNoiseSettings((s) => s.noiseSuppression)
  const setNoiseSuppression = useNoiseSettings((s) => s.setNoiseSuppression)
  const { startShare, stopShare } = useScreenShare()
  const samples = useVoicePing((s) => s.samples)

  const [pingOpen, setPingOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const connected = status === 'connected' || status === 'reconnecting'
  const visible = activeChannelId !== null && (connected || status === 'connecting')

  const { data: serverDetail } = useQuery({
    queryKey: ['server', activeServerId],
    queryFn: () => getServerDetail(activeServerId!),
    enabled: visible && activeServerId !== null,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!pingOpen) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPingOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pingOpen])

  const lastRtt = useMemo(() => {
    for (let i = samples.length - 1; i >= 0; i--) {
      const rtt = samples[i]?.rtt
      if (rtt !== null && rtt !== undefined) return rtt
    }
    return null
  }, [samples])

  if (!visible) return null

  const channelName = serverDetail?.channels.find((c) => c.id === activeChannelId)?.name
  const serverName = serverDetail?.server.name

  const statusText = status === 'connected'
    ? 'голосовая связь подключена'
    : status === 'reconnecting' ? 'переподключение…' : 'подключение…'
  const statusCls = status === 'connected' ? 'text-kd-online' : 'text-kd-idle'

  return (
    <div ref={rootRef} className="relative px-3 pt-2 pb-2 bg-kd-panel-alt border-t border-kd-border">
      {pingOpen && <PingPopover samples={samples} />}

      {/* статус + пинг + выйти */}
      <div className="flex items-center gap-1.5">
        <span className={`shrink-0 ${statusCls}`}><SignalIcon /></span>
        <span className={`flex-1 min-w-0 truncate text-[11px] font-bold ${statusCls}`}>
          {statusText}
        </span>
        <button
          type="button"
          onClick={() => setPingOpen((o) => !o)}
          title="график пинга за 5 минут"
          className={[
            'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors',
            pingOpen ? 'bg-kd-panel-hi text-kd-text' : 'text-kd-text-mute hover:text-kd-text hover:bg-kd-panel-hi',
          ].join(' ')}
        >
          {lastRtt !== null ? `${lastRtt} мс` : '· · ·'}
        </button>
      </div>

      {/* канал / сервер — телепорт на экран ГС */}
      <button
        type="button"
        onClick={() => {
          if (activeServerId && activeChannelId) {
            navigate(`/servers/${activeServerId}/channels/${activeChannelId}`)
          }
        }}
        title="перейти к голосовому каналу"
        className="block w-full text-left text-[10px] font-mono text-kd-text-mute hover:text-kd-text hover:underline truncate mt-0.5"
      >
        {channelName ?? '…'} / {serverName ?? '…'}
      </button>

      {/* кнопки: шумодав · демо · выйти */}
      <div className="flex gap-1.5 mt-2">
        <DockButton
          title={noiseSuppression ? 'шумоподавление включено' : 'шумоподавление выключено'}
          active={noiseSuppression}
          onClick={() => setNoiseSuppression(!noiseSuppression)}
        >
          <NoiseIcon />
        </DockButton>
        <DockButton
          title={screenSharing ? 'остановить демонстрацию' : 'демонстрация экрана'}
          active={screenSharing}
          onClick={() => { void (screenSharing ? stopShare() : startShare()) }}
        >
          <Icon.Monitor size={13} />
        </DockButton>
        <DockButton title="отключиться" danger onClick={() => { void leaveVoiceRoom() }}>
          <Icon.PhoneOff size={13} />
        </DockButton>
      </div>
    </div>
  )
}
