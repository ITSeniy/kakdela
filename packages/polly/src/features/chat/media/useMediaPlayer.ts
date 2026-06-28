// Общий «движок» для аудио- и видео-плееров. Сам элемент <audio>/<video>
// остаётся проигрывателем (декод, буфер, перемотка, кодеки — всё от платформы);
// этот хук лишь синхронизирует его состояние в React и даёт императивные
// действия для самописных контролов. Нативные браузерные controls при этом
// выключены — их UI не стилизуется под дизайн.

import { useCallback, useEffect, useRef, useState } from 'react'

export interface MediaPlayer<T extends HTMLMediaElement> {
  /** Callback-ref для самого <audio>/<video>. */
  setRef: (node: T | null) => void
  playing: boolean
  /** Метаданные (длительность) загружены. */
  ready: boolean
  /** Секунды. */
  duration: number
  currentTime: number
  /** Конец загруженного буфера в секундах. */
  buffered: number
  /** 0..1 */
  volume: number
  muted: boolean
  toggle: () => void
  /** Перемотка по доле 0..1 (доля × duration). */
  seekFraction: (f: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
}

export function useMediaPlayer<T extends HTMLMediaElement>(): MediaPlayer<T> {
  const elRef = useRef<T | null>(null)
  // Элемент держим и в state — чтобы переподписать слушатели, если он
  // пересоздаётся (в лайтбоксе видео ремонтируется по key при смене кадра).
  const [el, setEl] = useState<T | null>(null)

  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVol] = useState(1)
  const [muted, setMuted] = useState(false)

  const setRef = useCallback((node: T | null) => {
    elRef.current = node
    setEl(node)
  }, [])

  useEffect(() => {
    if (!el) return

    const syncTime = () => setCurrentTime(el.currentTime)
    const syncDuration = () => {
      setDuration(Number.isFinite(el.duration) ? el.duration : 0)
      if (Number.isFinite(el.duration) && el.duration > 0) setReady(true)
    }
    const syncBuffered = () => {
      try {
        const b = el.buffered
        let end = 0
        for (let i = 0; i < b.length; i += 1) {
          // приоритет диапазону, покрывающему текущую позицию
          if (b.start(i) <= el.currentTime && el.currentTime <= b.end(i)) { end = b.end(i); break }
          if (b.end(i) > end) end = b.end(i)
        }
        setBuffered(end)
      } catch {
        // buffered может бросать, пока элемент не готов — игнорируем
      }
    }
    const syncVolume = () => { setVol(el.volume); setMuted(el.muted) }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    // первичная синхронизация (метаданные/громкость могли уже подгрузиться)
    setPlaying(!el.paused)
    syncDuration()
    syncTime()
    syncVolume()

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    el.addEventListener('timeupdate', syncTime)
    el.addEventListener('durationchange', syncDuration)
    el.addEventListener('loadedmetadata', syncDuration)
    el.addEventListener('progress', syncBuffered)
    el.addEventListener('timeupdate', syncBuffered)
    el.addEventListener('volumechange', syncVolume)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('timeupdate', syncTime)
      el.removeEventListener('durationchange', syncDuration)
      el.removeEventListener('loadedmetadata', syncDuration)
      el.removeEventListener('progress', syncBuffered)
      el.removeEventListener('timeupdate', syncBuffered)
      el.removeEventListener('volumechange', syncVolume)
    }
  }, [el])

  const toggle = useCallback(() => {
    const m = elRef.current
    if (!m) return
    if (m.paused) void m.play().catch(() => { /* autoplay-политика / отменён */ })
    else m.pause()
  }, [])

  const seekFraction = useCallback((f: number) => {
    const m = elRef.current
    if (!m || !Number.isFinite(m.duration) || m.duration <= 0) return
    const t = Math.max(0, Math.min(1, f)) * m.duration
    m.currentTime = t
    setCurrentTime(t)
  }, [])

  const setVolume = useCallback((v: number) => {
    const m = elRef.current
    if (!m) return
    const vol = Math.max(0, Math.min(1, v))
    m.volume = vol
    if (vol > 0 && m.muted) m.muted = false
  }, [])

  const toggleMute = useCallback(() => {
    const m = elRef.current
    if (!m) return
    m.muted = !m.muted
  }, [])

  return { setRef, playing, ready, duration, currentTime, buffered, volume, muted, toggle, seekFraction, setVolume, toggleMute }
}
