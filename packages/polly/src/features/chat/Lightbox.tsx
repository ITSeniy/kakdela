// Лайтбокс по designs/final-extras.jsx → FinalLightbox: верхняя панель
// (автор · канал · мета файла · действия), стрелки по бокам, нижняя панель
// с лентой миниатюр, позицией и подсказками клавиш. Всегда тёмный (сцена).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { Attachment } from '@kakdela/ginzu/api-types'

import { Avatar } from '../../components/Avatar.js'
import { toast } from '../../components/toast/index.js'
import { openExternal } from '../../lib/host/shell.js'
import { formatBytes } from './formatBytes.js'
import { VideoPlayer } from './media/VideoPlayer.js'

export interface LightboxContext {
  authorName?: string
  authorAvatarUrl?: string | null
  channelName?: string
  messageId?: string
  createdAt?: string
}

interface LightboxProps {
  images: Attachment[]
  startIndex: number
  onClose: () => void
  context?: LightboxContext
}

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

/** Кнопка-чип верхней панели (светлый полупрозрачный квадрат на сцене). */
function BarButton({ title, danger, onClick, children }: {
  title: string
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
        'w-8 h-8 rounded flex items-center justify-center font-mono text-[15px] transition-colors shrink-0',
        danger
          ? 'bg-kd-danger text-white hover:opacity-90'
          : 'bg-white/[0.06] text-kd-stage-text hover:bg-white/[0.12]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const MAX_ZOOM = 8

export function Lightbox({ images, startIndex, onClose, context }: LightboxProps) {
  const [idx, setIdx] = useState(startIndex)
  // Зум маленьких картинок: transform scale поверх object-contain (картинка
  // не апскейлится сама, но scale тянет её выше натурального размера).
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  // Вид текущего кадра для обработчика клавиш (он создаётся один раз и не видит
  // свежий idx) — на видео space отдаём плееру, а не листанию галереи.
  const curKindRef = useRef<string | undefined>(undefined)

  // Смена кадра — сбрасываем зум и сдвиг.
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [idx])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Лайтбокс — верхний слой: Esc не должен долетать до модалок/настроек.
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setIdx((i) => (i + 1) % images.length)
      } else if (e.key === ' ' && curKindRef.current !== 'video') {
        // space листает галерею; на видео его перехватывает плеер (пауза/плей).
        e.preventDefault()
        setIdx((i) => (i + 1) % images.length)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setIdx((i) => (i - 1 + images.length) % images.length)
      }
    }
    window.addEventListener('keydown', onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
    }
  }, [images.length, onClose])

  if (images.length === 0) return null
  const current = images[idx]
  if (!current) return null
  curKindRef.current = current.kind
  const showNav = images.length > 1

  const zoomable = current.kind === 'image'

  function nudge(delta: number) {
    setIdx((i) => (i + delta + images.length) % images.length)
  }

  function zoomBy(factor: number) {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(1, z * factor))
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }

  function resetZoom() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function handleWheel(e: React.WheelEvent) {
    // На картинке колесо = зум; на видео/в галерее без картинки — листание.
    if (zoomable) {
      zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18)
      return
    }
    if (!showNav) return
    if (Math.abs(e.deltaY) < 24) return
    nudge(e.deltaY > 0 ? 1 : -1)
  }

  function onDragStart(e: React.MouseEvent) {
    if (zoom <= 1) return
    e.preventDefault()
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    setDragging(true)
  }

  function onDragMove(e: React.MouseEvent) {
    const d = dragRef.current
    if (!d) return
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) })
  }

  function onDragEnd() {
    dragRef.current = null
    setDragging(false)
  }

  async function copyImage() {
    const att = current!
    try {
      const res = await fetch(att.url)
      const blob = await res.blob()
      let out = blob
      // Clipboard принимает только png — перекодируем jpeg/webp на канвасе.
      if (blob.type !== 'image/png') {
        const bmp = await createImageBitmap(blob)
        const canvas = document.createElement('canvas')
        canvas.width = bmp.width
        canvas.height = bmp.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('no 2d context')
        ctx.drawImage(bmp, 0, 0)
        const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
        if (!png) throw new Error('encode failed')
        out = png
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': out })])
      toast.info('картинка скопирована')
    } catch {
      try {
        await navigator.clipboard.writeText(att.url)
        toast.info('скопирована ссылка на картинку')
      } catch { /* буфер недоступен — молчим */ }
    }
  }

  function jumpToMessage() {
    const id = context?.messageId
    onClose()
    if (!id) return
    // Даём чату отрисоваться без оверлея, потом скроллим и подсвечиваем.
    setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${id}"]`)
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setTimeout(() => {
        el.classList.add('kd-flash')
        el.addEventListener('animationend', () => el.classList.remove('kd-flash'), { once: true })
      }, 100)
    }, 50)
  }

  const meta = [
    context?.createdAt ? fmtWhen(context.createdAt) : null,
    current.originalName,
    current.width && current.height ? `${current.width}×${current.height}` : null,
    formatBytes(current.sizeBytes),
  ].filter(Boolean).join(' · ')

  const node = (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-kd-stage text-kd-stage-text font-sans select-none"
      onWheel={handleWheel}
    >
      {/* верхняя панель */}
      <div className="px-5 py-3 flex items-center gap-3 bg-black/30 border-b border-white/[0.06] shrink-0">
        {context?.authorName ? (
          <>
            <Avatar name={context.authorName} avatarUrl={context.authorAvatarUrl ?? null} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold truncate">
                {context.authorName}
                {context.channelName && (
                  <>
                    <span className="font-medium opacity-60"> в </span>
                    <span className="font-mono text-kd-warm">#{context.channelName}</span>
                  </>
                )}
              </div>
              <div className="text-[10px] font-mono opacity-60 truncate mt-px">{meta}</div>
            </div>
          </>
        ) : (
          <div className="flex-1 min-w-0 text-[10px] font-mono opacity-60 truncate">{meta}</div>
        )}
        {zoomable && (
          <div className="flex items-center gap-1 shrink-0">
            <BarButton title="отдалить · колесо вниз" onClick={() => zoomBy(1 / 1.3)}>−</BarButton>
            <button
              type="button"
              onClick={resetZoom}
              title="сбросить зум · двойной клик"
              className="px-1.5 h-8 min-w-[46px] rounded text-[11px] font-mono text-kd-stage-text hover:bg-white/[0.12] transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>
            <BarButton title="приблизить · колесо вверх" onClick={() => zoomBy(1.3)}>+</BarButton>
            <div className="w-px h-[22px] bg-white/10 mx-1 shrink-0" />
          </div>
        )}
        <BarButton title="скачать оригинал" onClick={() => { void openExternal(current.url) }}>⤓</BarButton>
        {current.kind === 'image' && (
          <BarButton title="скопировать картинку" onClick={() => { void copyImage() }}>⧉</BarButton>
        )}
        {context?.messageId && (
          <BarButton title="к сообщению" onClick={jumpToMessage}>↗</BarButton>
        )}
        <div className="w-px h-[22px] bg-white/10 mx-1 shrink-0" />
        <BarButton title="закрыть · esc" danger onClick={onClose}>×</BarButton>
      </div>

      {/* картинка + стрелки */}
      <div
        className="flex-1 min-h-0 relative flex items-center justify-center p-5 overflow-hidden"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        {showNav && (
          <>
            <button
              type="button"
              onClick={() => nudge(-1)}
              title="назад · ←"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[22px] font-mono flex items-center justify-center transition-colors"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              title="вперёд · →"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[22px] font-mono flex items-center justify-center transition-colors"
            >
              ›
            </button>
          </>
        )}
        {current.kind === 'video' ? (
          <VideoPlayer key={current.id} src={current.url} autoPlay />
        ) : (
          <img
            src={current.url}
            alt={current.originalName}
            onMouseDown={onDragStart}
            onDoubleClick={() => (zoom > 1 ? resetZoom() : zoomBy(2))}
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragging ? 'none' : 'transform 0.12s ease-out',
              cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
            }}
            className="max-w-full max-h-full object-contain rounded-lg shadow-kd-modal"
          />
        )}
      </div>

      {/* нижняя панель: позиция + миниатюры + подсказки */}
      <div className="px-5 pt-2.5 pb-3.5 bg-black/40 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center justify-end mb-2">
          <span className="text-[10px] font-mono opacity-50">
            {idx + 1} из {images.length}
            {context?.channelName && ` · из канала #${context.channelName}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIdx(i)}
              title={img.originalName}
              className={[
                'relative w-14 h-10 rounded-[3px] overflow-hidden shrink-0 transition-opacity',
                i === idx ? 'opacity-100' : 'opacity-50 hover:opacity-80',
              ].join(' ')}
              style={i === idx ? { boxShadow: '0 0 0 2px var(--kd-accent)' } : undefined}
            >
              {img.kind === 'video' ? (
                <>
                  <video src={img.url} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-mono font-bold">
                    ▶
                  </span>
                </>
              ) : (
                <img
                  src={img.thumbUrl ?? img.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              )}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-mono opacity-40 shrink-0">
            ← → · esc · space ⏵ · колесо — зум
          </span>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return node
  return createPortal(node, document.body)
}
