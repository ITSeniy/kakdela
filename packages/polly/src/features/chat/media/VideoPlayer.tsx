// Видео-плеер лайтбокса: нативные controls выключены, рисуем свою панель
// (play/pause, перемотка, тайминг, громкость, фуллскрин). Панель автоскрывается
// при простое во время проигрывания; клик по кадру = пауза. Горячие клавиши
// space/k (пауза), f (фуллскрин), m (звук) — стрелки и esc оставляем лайтбоксу.

import { useCallback, useEffect, useRef, useState } from 'react'

import { Icon } from '../../../components/Icon.js'
import { IconButton, PlayPauseButton, Seekbar, fmtTime } from './controls.js'
import { useMediaPlayer } from './useMediaPlayer.js'

const HIDE_MS = 2500

export function VideoPlayer({ src, autoPlay }: { src: string; autoPlay?: boolean }) {
  const p = useMediaPlayer<HTMLVideoElement>()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [fs, setFs] = useState(false)
  const [idle, setIdle] = useState(false)
  const timer = useRef<number | null>(null)

  const wake = useCallback(() => {
    setIdle(false)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setIdle(true), HIDE_MS)
  }, [])

  // Прячем панель/курсор только когда играет; на паузе всё видно.
  const showControls = !idle || !p.playing

  const toggleFs = useCallback(() => {
    const w = wrapRef.current
    if (!w) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void w.requestFullscreen?.().catch(() => { /* недоступно — игнорируем */ })
  }, [])

  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === wrapRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); e.stopPropagation(); p.toggle(); wake() }
      else if (e.key === 'f') { e.preventDefault(); toggleFs() }
      else if (e.key === 'm') { e.preventDefault(); p.toggleMute() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [p, toggleFs, wake])

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const frac = p.duration > 0 ? p.currentTime / p.duration : 0
  const buf = p.duration > 0 ? p.buffered / p.duration : 0

  return (
    <div
      ref={wrapRef}
      className="relative inline-flex max-w-full max-h-full bg-kd-stage rounded-lg overflow-hidden shadow-kd-modal"
      onMouseMove={wake}
      onMouseLeave={() => { if (p.playing) setIdle(true) }}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      <video
        ref={p.setRef}
        src={src}
        autoPlay={autoPlay}
        playsInline
        onClick={() => { p.toggle(); wake() }}
        className="max-w-full max-h-full block"
      />

      {/* Большая кнопка play по центру на паузе. */}
      {!p.playing && p.ready && (
        <button
          type="button"
          onClick={() => { p.toggle(); wake() }}
          title="играть"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="w-16 h-16 rounded-full bg-kd-overlay-strong text-white flex items-center justify-center pl-1">
            <Icon.Play size={26} />
          </span>
        </button>
      )}

      {/* Нижняя панель. */}
      <div
        className={`absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-10 bg-gradient-to-t from-black/70 to-transparent transition-opacity ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center gap-2.5">
          <PlayPauseButton playing={p.playing} onToggle={() => { p.toggle(); wake() }} />
          <span className="text-[10px] font-mono text-white/80 shrink-0">{fmtTime(p.currentTime)}</span>
          <Seekbar className="flex-1" fraction={frac} buffered={buf} onSeek={p.seekFraction} tone="stage" />
          <span className="text-[10px] font-mono text-white/60 shrink-0">{fmtTime(p.duration)}</span>
          <IconButton tone="stage" title={p.muted ? 'включить звук · m' : 'выключить звук · m'} onClick={p.toggleMute}>
            {p.muted || p.volume === 0 ? <Icon.SpeakerOff size={16} /> : <Icon.Speaker size={16} />}
          </IconButton>
          <Seekbar className="w-12 shrink-0" fraction={p.muted ? 0 : p.volume} onSeek={p.setVolume} tone="stage" />
          <IconButton tone="stage" title={fs ? 'свернуть · f' : 'на весь экран · f'} onClick={toggleFs}>
            {fs ? <Icon.Minimize size={16} /> : <Icon.Maximize size={16} />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}
