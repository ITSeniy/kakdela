import {
  ConnectionState,
  LocalAudioTrack,
  LocalParticipant,
  LocalTrackPublication,
  LocalVideoTrack,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteVideoTrack,
  Room,
  RoomEvent,
  Track,
  TrackPublication,
} from 'livekit-client'
import type { AudioCaptureOptions } from 'livekit-client'

import { useLocalMute } from '../features/voice/localMute.js'
import { useVoiceStore } from '../features/voice/store.js'

// «Активная» комната — на которую подписан UI. Не singleton в строгом смысле:
// возможны короткоживущие «сироты» во время гонок join/join (свежий join
// успел отменить старый раньше, чем тот успел поставить себя активным).
// Такие сироты дисконнектятся через disposeRoom(orphan) и в currentRoom не
// попадают.
let currentRoom: Room | null = null
let audioContainer: HTMLDivElement | null = null
const attachedAudioElements = new Map<string, HTMLMediaElement>()

function ensureAudioContainer(): HTMLDivElement {
  if (audioContainer && audioContainer.isConnected) return audioContainer
  const div = document.createElement('div')
  div.dataset.kdRole = 'voice-audio-sink'
  div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;'
  document.body.appendChild(div)
  audioContainer = div
  return div
}

function removeAudioContainer(): void {
  if (audioContainer) {
    audioContainer.remove()
    audioContainer = null
  }
}

function attachAudio(track: RemoteTrack): void {
  if (track.kind !== Track.Kind.Audio) return
  const sid = track.sid
  if (!sid) return
  if (attachedAudioElements.has(sid)) return
  const el = track.attach() as HTMLMediaElement
  el.autoplay = true
  el.dataset.kdTrackSid = sid
  ensureAudioContainer().appendChild(el)
  attachedAudioElements.set(sid, el)
}

function detachAudio(track: RemoteTrack): void {
  if (track.kind !== Track.Kind.Audio) return
  const sid = track.sid
  if (!sid) return
  const el = attachedAudioElements.get(sid)
  if (el) {
    try { track.detach(el) } catch { /* SDK already detached */ }
    el.remove()
    attachedAudioElements.delete(sid)
  } else {
    try { track.detach() } catch { /* nothing was attached */ }
  }
}

function clearAllAttachedAudio(): void {
  for (const el of attachedAudioElements.values()) el.remove()
  attachedAudioElements.clear()
}

export function getActiveRoom(): Room | null {
  return currentRoom
}

/**
 * Возвращает локальный screen-share video track, если мы сейчас транслируем.
 * Используется ParticipantTile для self-preview — attach к <video>.
 */
export function getLocalScreenVideoTrack(): LocalVideoTrack | null {
  if (!currentRoom) return null
  const pub = currentRoom.localParticipant.getTrackPublication(Track.Source.ScreenShare)
  const track = pub?.videoTrack
  return track instanceof LocalVideoTrack ? track : null
}

/**
 * Возвращает remote screen-share video track указанного участника (identity).
 * Дёргается из VoiceScreen при сборке tiles — null означает «он не шарит
 * или ещё не подписаны».
 */
export function getRemoteScreenVideoTrack(userId: string): RemoteVideoTrack | null {
  if (!currentRoom) return null
  const p = currentRoom.remoteParticipants.get(userId)
  if (!p) return null
  const pub = p.getTrackPublication(Track.Source.ScreenShare)
  const track = pub?.videoTrack
  return track instanceof RemoteVideoTrack ? track : null
}

/**
 * Создаёт и поднимает соединение с LiveKit. НЕ трогает глобальное state —
 * это «полуготовая» комната. Caller сам решает, делать её активной
 * (`installVoiceRoom`) или сразу выкинуть как сироту (`disposeRoom`).
 */
export async function createAndConnectRoom(opts: {
  url: string
  token: string
}): Promise<Room> {
  const room = new Room({ adaptiveStream: true, dynacast: true })
  await room.connect(opts.url, opts.token)
  return room
}

/**
 * Объявляет комнату активной: подписывает store на её события и
 * подтягивает уже существующих участников. Если до этого была другая
 * активная — её слушатели не снимаем здесь; caller должен был сначала
 * сделать `disposeRoom(prev)`.
 */
export function installVoiceRoom(room: Room): void {
  currentRoom = room
  attachListeners(room)
  // Существующих peer'ов LiveKit НЕ шлёт через ParticipantConnected — они
  // уже в `room.remoteParticipants` к моменту resolve'а `connect()`. Сидим
  // store именно отсюда (а не из REST-snapshot'а), чтобы list участников
  // был согласован с реальной комнатой.
  rebuildParticipantsFromRoom(room)
}

/**
 * Закрывает соединение с LiveKit для указанной комнаты. Если эта комната
 * была активной — также чистит глобальное state (audio elements, container).
 * Безопасно вызывать на null и на уже-закрытой комнате.
 */
export async function disposeRoom(room: Room | null): Promise<void> {
  if (!room) return
  const wasActive = currentRoom === room
  if (wasActive) {
    currentRoom = null
    clearAllAttachedAudio()
    removeAudioContainer()
  }
  // removeAllListeners — иначе финальный ConnectionStateChanged → Disconnected
  // догонит и перепишет status в 'failed' уже после нашего штатного leave.
  room.removeAllListeners()
  try {
    await room.disconnect()
  } catch (err) {
    console.warn('[livekit] disconnect threw', err)
  }
}

/**
 * Совместимый со старым API алиас — закрывает текущую активную комнату.
 */
export async function disposeVoiceRoom(): Promise<void> {
  await disposeRoom(currentRoom)
}

/**
 * Жёсткий sync teardown для `beforeunload`. Не awaitable: вызывает
 * `room.disconnect()` (он внутри шлёт leave-сигнал по WS синхронно) и
 * сразу убирает DOM-элементы. Async-часть disconnect'а пусть отработает
 * на закрывающемся окне как сможет.
 */
export function disposeVoiceRoomSync(): void {
  const room = currentRoom
  currentRoom = null
  clearAllAttachedAudio()
  removeAudioContainer()
  if (!room) return
  try { room.removeAllListeners() } catch { /* ignore */ }
  try { void room.disconnect() } catch { /* ignore */ }
}

/**
 * Перезапускает локальный мик-трек с новыми audio constraints (например,
 * включить/выключить `noiseSuppression`). LiveKit под капотом дёргает
 * `getUserMedia` и заменяет underlying MediaStreamTrack через RTCRtpSender
 * — публикация и mute-state сохраняются.
 *
 * No-op, если нет активной комнаты или mic не опубликован.
 */
export async function restartMicConstraints(opts: AudioCaptureOptions): Promise<void> {
  if (!currentRoom) return
  const pub = currentRoom.localParticipant.getTrackPublication(Track.Source.Microphone)
  const track = pub?.track
  if (!(track instanceof LocalAudioTrack)) return
  try {
    await track.restartTrack(opts)
  } catch (err) {
    console.warn('[livekit] restartTrack with new audio constraints failed', err)
  }
}

/** Итоговая громкость участника: deafen глушит всех, локальный мьют — точечно. */
function effectiveVolume(userId: string, deafened: boolean): number {
  if (deafened) return 0
  return useLocalMute.getState().isMuted(userId) ? 0 : 1
}

function applyVolumeFor(p: RemoteParticipant, deafened: boolean): void {
  const volume = effectiveVolume(p.identity, deafened)
  p.setVolume(volume, Track.Source.Microphone)
  p.setVolume(volume, Track.Source.ScreenShareAudio)
}

/**
 * Применяет громкость ко всем уже-подписанным удалённым audio-tracks.
 * Используется при toggleDeafen — глушит всех либо восстанавливает,
 * не задевая локально замьюченных.
 */
export function applyDeafenVolume(room: Room | null, deafened: boolean): void {
  if (!room) return
  for (const participant of room.remoteParticipants.values()) {
    applyVolumeFor(participant, deafened)
  }
}

/**
 * Переключает локальный мьют участника (слышимость только у меня) и сразу
 * применяет к активной комнате. Состояние персистится в useLocalMute.
 */
export function toggleLocalParticipantMute(userId: string): boolean {
  const next = !useLocalMute.getState().isMuted(userId)
  useLocalMute.getState().setMuted(userId, next)
  const room = currentRoom
  if (room) {
    const p = room.remoteParticipants.get(userId)
    if (p) applyVolumeFor(p, useVoiceStore.getState().deafened)
  }
  return next
}

function rebuildParticipantsFromRoom(room: Room): void {
  const store = useVoiceStore.getState()
  // Сброс + перенакладка из LiveKit. Между REST-snapshot'ом и реальным
  // connect'ом могли произойти join'ы и leave'ы, поэтому переписываем
  // полностью.
  store.applySnapshot([])
  for (const p of room.remoteParticipants.values()) {
    store.upsertParticipant({
      userId: p.identity,
      displayName: p.name ?? p.identity,
      isSpeaking: false,
      isScreenSharing: hasScreenShare(p),
      isMuted: !hasUnmutedMic(p),
    })
  }
  // Сразу подцепляем уже подписанные audio-tracks — иначе peer'ы немые,
  // пока кто-то не опубликует/перепубликует трек. Громкость — с учётом
  // deafen и персистнутых локальных мьютов.
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.audioTrackPublications.values()) {
      const track = pub.track
      if (track && track.kind === Track.Kind.Audio) {
        attachAudio(track as RemoteTrack)
      }
    }
    applyVolumeFor(p, useVoiceStore.getState().deafened)
  }
}

function attachListeners(room: Room): void {
  const store = useVoiceStore.getState

  room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
    if (currentRoom !== room) return
    switch (state) {
      case ConnectionState.Connecting:
        store().setStatus('connecting')
        break
      case ConnectionState.Connected:
        store().setStatus('connected')
        store().setError(null)
        break
      case ConnectionState.Reconnecting:
        store().setStatus('reconnecting')
        break
      case ConnectionState.Disconnected:
        // disposeRoom уже снял listeners перед штатным disconnect'ом,
        // так что мы здесь только при unexpected disconnect.
        store().setStatus('failed')
        break
    }
  })

  room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
    if (currentRoom !== room) return
    store().upsertParticipant({
      userId: p.identity,
      displayName: p.name ?? p.identity,
      isSpeaking: false,
      isScreenSharing: hasScreenShare(p),
      isMuted: !hasUnmutedMic(p),
    })
    applyVolumeFor(p, useVoiceStore.getState().deafened)
  })

  room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
    if (currentRoom !== room) return
    store().removeParticipant(p.identity)
  })

  room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
    if (currentRoom !== room) return
    store().setActiveSpeakers(speakers.map((s) => s.identity))
  })

  room.on(RoomEvent.TrackMuted, (pub: TrackPublication, p: Participant) => {
    if (currentRoom !== room) return
    if (pub.source !== Track.Source.Microphone) return
    if (p === room.localParticipant) {
      store().setMuted(true)
    } else {
      store().patchParticipant(p.identity, { isMuted: true })
    }
  })

  room.on(RoomEvent.TrackUnmuted, (pub: TrackPublication, p: Participant) => {
    if (currentRoom !== room) return
    if (pub.source !== Track.Source.Microphone) return
    if (p === room.localParticipant) {
      if (!useVoiceStore.getState().deafened) {
        store().setMuted(false)
      }
    } else {
      store().patchParticipant(p.identity, { isMuted: false })
    }
  })

  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
      if (currentRoom !== room) return
      if (track.kind === Track.Kind.Audio) attachAudio(track)
      if (
        pub.source === Track.Source.ScreenShare ||
        pub.source === Track.Source.ScreenShareAudio
      ) {
        store().patchParticipant(p.identity, { isScreenSharing: true })
      }
      applyVolumeFor(p, useVoiceStore.getState().deafened)
    },
  )

  room.on(
    RoomEvent.TrackUnsubscribed,
    (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
      if (currentRoom !== room) return
      if (track.kind === Track.Kind.Audio) detachAudio(track)
      if (
        pub.source === Track.Source.ScreenShare ||
        pub.source === Track.Source.ScreenShareAudio
      ) {
        store().patchParticipant(p.identity, { isScreenSharing: hasScreenShare(p) })
      }
    },
  )

  // Локальный screen share: store.screenSharing зеркалит реальное состояние
  // публикации, а не намерение пользователя. Это важно для случая, когда user
  // остановил демо через нативный Chromium bar («Stop sharing» внизу экрана) —
  // мы НЕ узнаём об этом из своего обработчика клика, только через эти события.
  room.on(
    RoomEvent.LocalTrackPublished,
    (pub: LocalTrackPublication, p: LocalParticipant) => {
      if (currentRoom !== room) return
      if (p !== room.localParticipant) return
      if (pub.source !== Track.Source.ScreenShare) return
      store().setScreenSharing(true)
    },
  )

  room.on(
    RoomEvent.LocalTrackUnpublished,
    (pub: LocalTrackPublication, p: LocalParticipant) => {
      if (currentRoom !== room) return
      if (p !== room.localParticipant) return
      if (pub.source !== Track.Source.ScreenShare) return
      store().setScreenSharing(false)
    },
  )
}

function hasScreenShare(p: Participant): boolean {
  for (const pub of p.videoTrackPublications.values()) {
    if (pub.source === Track.Source.ScreenShare) return true
  }
  for (const pub of p.audioTrackPublications.values()) {
    if (pub.source === Track.Source.ScreenShareAudio) return true
  }
  return false
}

function hasUnmutedMic(p: Participant): boolean {
  for (const pub of p.audioTrackPublications.values()) {
    if (pub.source === Track.Source.Microphone && !pub.isMuted) return true
  }
  return false
}
