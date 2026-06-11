import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { Channel, MemberPublic } from '@kakdela/ginzu/api-types'

import { Badge } from '../../components/Badge.js'
import { Icon } from '../../components/Icon.js'
import {
  getLocalScreenVideoTrack,
  getRemoteScreenVideoTrack,
} from '../../lib/livekit.js'
import { useAuthStore } from '../auth/store.js'
import { sendMessage } from '../chat/api.js'
import { uploadBlob } from '../files/upload.js'
import { getServerDetail, listMembers } from '../servers/api.js'
import { MicPermissionDialog } from './MicPermission.js'
import { ParticipantTile } from './ParticipantTile.js'
import { ScreenTile } from './ScreenTile.js'
import { VoiceCallChat } from './VoiceCallChat.js'
import { VoiceControls } from './VoiceControls.js'
import {
  computeLayout,
  focusGridClass,
  focusUsesAutoFit,
  type FocusItem,
  type TileData,
} from './layout.js'
import {
  useScreenShareSettings,
  type ScreenQuality,
} from './screenShareSettings.js'
import { snapshotTrack } from './snapshot.js'
import { useScreenShare } from './useScreenShare.js'
import { useVoiceRoom } from './useVoiceRoom.js'
import { useVoiceStore, type ParticipantState } from './store.js'

interface VoiceScreenProps {
  serverId: string
  channel: Channel
}

// Секундомер звонка — чисто локальный (от момента join на этом клиенте).
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

// Шапка по designs/final-voice.jsx: Speaker-иконка + имя + LIVE + таймер,
// справа — счётчики эфира.
function Header({
  channel,
  connected,
  callSeconds,
  peopleCount,
  screenCount,
}: {
  channel: Channel
  connected: boolean
  callSeconds: number
  peopleCount: number
  screenCount: number
}) {
  return (
    <div className="px-4 py-2 border-b border-kd-border bg-kd-panel-alt flex items-center gap-2.5 shrink-0">
      <Icon.Speaker size={14} className="text-kd-accent shrink-0" />
      <span className="text-[13px] font-bold text-kd-text shrink-0">{channel.name}</span>
      {connected && <Badge variant="live">LIVE</Badge>}
      {connected && (
        <span className="text-[11px] text-kd-text-soft font-mono shrink-0">
          {formatElapsed(callSeconds)}
        </span>
      )}
      {channel.topic && (
        <>
          <div className="w-px h-3.5 bg-kd-border shrink-0" />
          <span className="text-[11px] text-kd-text-soft truncate">{channel.topic}</span>
        </>
      )}
      <div className="flex-1" />
      <span className="text-[10px] text-kd-text-mute font-mono shrink-0">
        {peopleCount} в эфире
        {screenCount > 0 && ` · ${screenCount} ${screenCount === 1 ? 'экран' : 'экрана'}`}
      </span>
    </div>
  )
}

function JoinCta({ channelName, onJoin, status }: {
  channelName: string
  onJoin(): void
  status: ReturnType<typeof useVoiceStore.getState>['status']
}) {
  const busy = status === 'connecting'
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <div className="text-kd-text-mute font-mono text-[11px]">голосовой канал</div>
      <div className="text-kd-text text-2xl font-bold">{channelName}</div>
      <button
        type="button"
        onClick={onJoin}
        disabled={busy}
        className={[
          'mt-2 px-6 py-2.5 rounded-kd text-[13px] font-semibold transition-colors',
          busy
            ? 'bg-kd-panel-hi text-kd-text-soft cursor-wait'
            : 'bg-kd-accent text-white hover:opacity-90',
        ].join(' ')}
      >
        {busy ? 'подключаемся…' : 'подключиться'}
      </button>
    </div>
  )
}

// 1-4 — явные сетки, 5+ — auto-fit. Минимум 200px на тайл, чтобы аватары
// не превратились в марки на 9 участников.
function gridClassFor(count: number): string {
  if (count <= 1) return 'grid-cols-1 grid-rows-1'
  if (count === 2) return 'grid-cols-2 grid-rows-1'
  if (count <= 4) return 'grid-cols-2 grid-rows-2'
  if (count <= 9) return 'grid-cols-3'
  return ''
}

function FaceGrid({ tiles }: { tiles: TileData[] }) {
  const auto = tiles.length > 9
  return (
    <div
      className={[
        'flex-1 grid gap-2.5 min-h-0',
        auto ? '' : gridClassFor(tiles.length),
      ].join(' ')}
      style={
        auto
          ? { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }
          : undefined
      }
    >
      {tiles.map((t) => (
        <ParticipantTile
          key={t.userId}
          displayName={t.displayName}
          avatarUrl={t.avatarUrl}
          muted={t.muted}
          speaking={t.speaking}
          isSelf={t.isSelf}
          screenTrack={t.screenTrack}
        />
      ))}
    </div>
  )
}

function FocusGrid({
  focus,
  pinnedScreenUserId,
  snapshotBusyUserId,
  onTogglePin,
  onSnapshot,
}: {
  focus: FocusItem[]
  pinnedScreenUserId: string | null
  snapshotBusyUserId: string | null
  onTogglePin(userId: string): void
  onSnapshot(f: FocusItem): void
}) {
  const auto = focusUsesAutoFit(focus.length)
  return (
    <div
      className={[
        'flex-1 grid gap-2.5 min-h-0',
        auto ? '' : focusGridClass(focus.length),
      ].join(' ')}
      style={
        auto
          ? { gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }
          : undefined
      }
    >
      {focus.map((f) => (
        <ScreenTile
          key={f.userId}
          displayName={f.displayName}
          isSelf={f.isSelf}
          pinned={pinnedScreenUserId === f.userId}
          busy={snapshotBusyUserId === f.userId}
          onTogglePin={() => onTogglePin(f.userId)}
          onSnapshot={() => onSnapshot(f)}
          screenTrack={f.screenTrack}
        />
      ))}
    </div>
  )
}

function Dock({ tiles }: { tiles: TileData[] }) {
  return (
    <div
      className="grid gap-2 shrink-0"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
      }}
    >
      {tiles.map((t) => (
        <ParticipantTile
          key={t.userId}
          displayName={t.displayName}
          avatarUrl={t.avatarUrl}
          muted={t.muted}
          speaking={t.speaking}
          isSelf={t.isSelf}
          compact
        />
      ))}
    </div>
  )
}

export function VoiceScreen({ serverId, channel }: VoiceScreenProps) {
  const me = useAuthStore((s) => s.user)
  const { join, leave, toggleMute, toggleDeafen } = useVoiceRoom()
  const { startShare, stopShare, restartShare } = useScreenShare()
  const setScreenQuality = useScreenShareSettings((s) => s.setScreenQuality)

  const activeChannelId = useVoiceStore((s) => s.activeChannelId)
  const status = useVoiceStore((s) => s.status)
  const muted = useVoiceStore((s) => s.muted)
  const screenSharing = useVoiceStore((s) => s.screenSharing)
  const participants = useVoiceStore((s) => s.participants)
  const activeSpeakers = useVoiceStore((s) => s.activeSpeakers)
  const pinnedScreenUserId = useVoiceStore((s) => s.pinnedScreenUserId)
  const setPinnedScreenUserId = useVoiceStore((s) => s.setPinnedScreenUserId)
  const error = useVoiceStore((s) => s.error)
  const setError = useVoiceStore((s) => s.setError)

  const connectedToThis =
    activeChannelId === channel.id && (status === 'connected' || status === 'reconnecting')

  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => listMembers(serverId),
    staleTime: 60_000,
  })

  // Список каналов нужен, чтобы найти куда отправить снимок (первый text-канал
  // того же сервера). Используем тот же queryKey, что Shell — TanStack Query
  // отдаст из кэша.
  const { data: serverDetail } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => getServerDetail(serverId),
    staleTime: 30_000,
  })

  const [snapshotBusyUserId, setSnapshotBusyUserId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Секундомер звонка: тикаем раз в секунду, пока подключены к этому каналу.
  // connectedToThis покрывает и 'reconnecting' — таймер не сбрасывается на
  // кратких реконнектах.
  const [callSeconds, setCallSeconds] = useState(0)
  useEffect(() => {
    if (!connectedToThis) {
      setCallSeconds(0)
      return
    }
    const startedAt = Date.now()
    setCallSeconds(0)
    const t = setInterval(() => {
      setCallSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [connectedToThis])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3000)
    return () => clearTimeout(t)
  }, [notice])

  const memberMap = useMemo(() => {
    const m = new Map<string, MemberPublic>()
    for (const x of members) m.set(x.id, x)
    return m
  }, [members])

  const tiles = useMemo<TileData[]>(() => {
    if (!connectedToThis || !me) return []
    const result: TileData[] = []
    // Self всегда первый — пользователю важно видеть, что он в эфире.
    // screenSharing — флаг из store, который выставляется в LocalTrackPublished
    // handler'е; в тот же момент getLocalScreenVideoTrack() уже возвращает
    // живой track. На повторных рендерах (speaker/mute) ссылка тоже стабильна,
    // пока публикация не пересоздалась.
    result.push({
      userId: me.id,
      displayName: me.displayName,
      avatarUrl: me.avatarUrl ?? null,
      muted,
      speaking: activeSpeakers.has(me.id),
      isSelf: true,
      screenTrack: screenSharing ? getLocalScreenVideoTrack() : null,
    })
    for (const p of participants.values() as IterableIterator<ParticipantState>) {
      if (p.userId === me.id) continue
      const member = memberMap.get(p.userId)
      result.push({
        userId: p.userId,
        displayName: p.displayName || member?.displayName || 'участник',
        avatarUrl: member?.avatarUrl ?? null,
        muted: p.isMuted,
        speaking: activeSpeakers.has(p.userId),
        isSelf: false,
        screenTrack: p.isScreenSharing ? getRemoteScreenVideoTrack(p.userId) : null,
      })
    }
    return result
  }, [connectedToThis, me, muted, screenSharing, participants, activeSpeakers, memberMap])

  const layout = useMemo(
    () => computeLayout(tiles, pinnedScreenUserId),
    [tiles, pinnedScreenUserId],
  )

  // Сколько РЕАЛЬНО шарят (для счётчика в шапке) — а не сколько в focus,
  // потому что pin'нутый focus содержит только одного, а в шапке хочется
  // видеть «всех шарящих».
  const totalScreenCount = useMemo(
    () => tiles.reduce((n, t) => (t.screenTrack ? n + 1 : n), 0),
    [tiles],
  )

  const onTogglePin = (userId: string): void => {
    setPinnedScreenUserId(pinnedScreenUserId === userId ? null : userId)
  }

  const onToggleScreenShare = (): void => {
    if (screenSharing) {
      void stopShare()
    } else {
      // `withAudio` берётся внутри startShare из useScreenShareSettings,
      // если не передали явно. Передавать тут нечего — пользователь сам
      // тогглит «со звуком» в VoiceControls.
      void startShare()
    }
  }

  const onChangeScreenQuality = (q: ScreenQuality): void => {
    setScreenQuality(q)
    // Применяем preset на лету — без stop/start LiveKit продолжит публиковать
    // с прежним битрейтом. Если не шарим, restartShare сам себя отменит.
    void restartShare()
  }

  const onSnapshot = async (f: FocusItem): Promise<void> => {
    // Гонка: пока висит upload — игнорируем повторные клики по этому tile.
    // По другим tile'ам клик разрешён (busy — per-userId).
    if (snapshotBusyUserId === f.userId) return
    const firstText = serverDetail?.channels.find((c) => c.kind === 'text')
    if (!firstText) {
      setNotice('нет текстового канала, куда отправить снимок')
      return
    }
    setSnapshotBusyUserId(f.userId)
    try {
      const blob = await snapshotTrack(f.screenTrack)
      const { publicUrl } = await uploadBlob(blob)
      const alt = `снимок демо · ${f.displayName}`
      await sendMessage(firstText.id, {
        content: `![${alt}](${publicUrl})`,
      })
      setNotice(`снимок отправлен в #${firstText.name}`)
    } catch (err) {
      console.warn('[voice] snapshot failed', err)
      setNotice('не удалось отправить снимок')
    } finally {
      setSnapshotBusyUserId(null)
    }
  }

  return (
    <div className="relative flex-1 min-w-0 flex flex-col bg-kd-bg">
      <Header
        channel={channel}
        connected={connectedToThis}
        callSeconds={callSeconds}
        peopleCount={connectedToThis ? tiles.length : 0}
        screenCount={connectedToThis ? totalScreenCount : 0}
      />
      {connectedToThis ? (
        <>
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 flex flex-col gap-2.5 p-3 min-h-0 bg-kd-stage">
              {layout.mode === 'grid' ? (
                <FaceGrid tiles={layout.dock} />
              ) : (
                <>
                  <FocusGrid
                    focus={layout.focus}
                    pinnedScreenUserId={pinnedScreenUserId}
                    snapshotBusyUserId={snapshotBusyUserId}
                    onTogglePin={onTogglePin}
                    onSnapshot={(f) => { void onSnapshot(f) }}
                  />
                  <Dock tiles={layout.dock} />
                </>
              )}
            </div>
            <VoiceCallChat serverId={serverId} channelId={channel.id} />
          </div>
          <VoiceControls
            onToggleMute={() => { void toggleMute() }}
            onToggleDeafen={() => { void toggleDeafen() }}
            onToggleScreenShare={onToggleScreenShare}
            onChangeScreenQuality={onChangeScreenQuality}
            onLeave={() => { void leave() }}
          />
        </>
      ) : (
        <JoinCta
          channelName={channel.name}
          status={status}
          onJoin={() => { void join(channel.id) }}
        />
      )}
      {error === 'no-mic-permission' && (
        <MicPermissionDialog onDismiss={() => setError(null)} />
      )}
      {notice && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-16 px-3 py-1.5 rounded-kd text-[12px] font-medium bg-kd-accent text-white shadow-kd-tile">
          {notice}
        </div>
      )}
    </div>
  )
}
