import { useEffect, useRef } from 'react'
import { Track } from 'livekit-client'

import { getActiveRoom } from '../../lib/livekit.js'
import { useVoiceInputSettings } from './inputSettings.js'
import { audioCaptureOptions } from './noiseSettings.js'
import { useVoiceStore } from './store.js'

/**
 * Hook монтируется один раз на верхнем уровне (Shell). Если активен режим
 * push-to-talk и пользователь подключён к голосовому каналу — слушает
 * keydown/keyup на window и мутит/размучивает свою микрофонную дорожку.
 *
 * Используем `pub.mute()` / `pub.unmute()` (вместо `setMicrophoneEnabled`),
 * чтобы не дёргать публикацию трека — это быстрее на ~100ms.
 *
 * Глобальные хоткеи (когда окно свёрнуто) — out of scope (см. T-035).
 */
export function usePushToTalk(): void {
  const inputMode = useVoiceInputSettings((s) => s.inputMode)
  const pttKey = useVoiceInputSettings((s) => s.pttKey)
  const status = useVoiceStore((s) => s.status)

  // Сброс при смене режима: чтобы пользователь не «застрял» в режиме
  // «вы говорите» или с открытым микрофоном после переключения. Первый
  // эффект-проход пропускаем — это лишь bind, никакой смены не было.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const voice = useVoiceStore.getState()
    voice.setPttHolding(false)
    voice.setMuted(true)
    const room = getActiveRoom()
    if (!room) return
    const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
    if (pub?.track) {
      pub.mute().catch((err: unknown) => {
        console.warn('[voice] mode-switch mute failed', err)
      })
    }
  }, [inputMode])

  useEffect(() => {
    if (inputMode !== 'push-to-talk') return undefined
    if (status !== 'connected') return undefined

    function onKeyDown(ev: KeyboardEvent) {
      if (ev.code !== pttKey) return
      if (ev.repeat) return
      if (isTypingTarget(ev.target)) return
      // Если уже зажато — ничего не делаем (защита от двойного срабатывания).
      if (useVoiceStore.getState().pttHolding) return
      ev.preventDefault()
      void startTalking()
    }

    function onKeyUp(ev: KeyboardEvent) {
      if (ev.code !== pttKey) return
      // Сюда попадаем и из input-полей — это нормально, главное стоп.
      if (!useVoiceStore.getState().pttHolding) return
      ev.preventDefault()
      void stopTalking()
    }

    function onBlur() {
      // Окно потеряло фокус — отпустить «зажатие» принудительно, иначе
      // пользователь может уйти с зажатым space и непреднамеренно вещать
      // обратно после фокуса (события keyup мы не получили).
      if (useVoiceStore.getState().pttHolding) {
        void stopTalking()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      // На отключение режима — гарантированно отпускаем.
      if (useVoiceStore.getState().pttHolding) {
        void stopTalking()
      }
    }
  }, [inputMode, pttKey, status])
}

async function startTalking(): Promise<void> {
  useVoiceStore.getState().setPttHolding(true)
  const room = getActiveRoom()
  if (!room) return
  const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
  if (pub?.track) {
    try { await pub.unmute() } catch (err) { console.warn('[ptt] unmute failed', err) }
    return
  }
  // На случай если трек ещё не опубликован (включили PTT до того как
  // ввели mic в комнате) — публикуем сразу.
  try {
    await room.localParticipant.setMicrophoneEnabled(true, audioCaptureOptions())
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    const code = name === 'NotAllowedError' ? 'no-mic-permission' : 'mic-publish-failed'
    useVoiceStore.getState().setError(code)
    useVoiceStore.getState().setPttHolding(false)
  }
}

async function stopTalking(): Promise<void> {
  useVoiceStore.getState().setPttHolding(false)
  const room = getActiveRoom()
  if (!room) return
  const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
  if (pub?.track) {
    try { await pub.mute() } catch (err) { console.warn('[ptt] mute failed', err) }
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}
