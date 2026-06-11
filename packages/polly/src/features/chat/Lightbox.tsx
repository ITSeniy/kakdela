import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import type { Attachment } from '@kakdela/ginzu/api-types'

import { openExternal } from '../../lib/host/shell.js'

interface LightboxProps {
  images: Attachment[]
  startIndex: number
  onClose: () => void
}

export function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(startIndex)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setIdx((i) => (i + 1) % images.length)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setIdx((i) => (i - 1 + images.length) % images.length)
      }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [images.length, onClose])

  if (images.length === 0) return null
  const current = images[idx]
  if (!current) return null
  const showNav = images.length > 1

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function nudge(delta: number) {
    setIdx((i) => (i + delta + images.length) % images.length)
  }

  function handleWheel(e: React.WheelEvent) {
    if (!showNav) return
    if (Math.abs(e.deltaY) < 24) return
    nudge(e.deltaY > 0 ? 1 : -1)
  }

  function handleDownload() {
    void openExternal(current!.url)
  }

  const node = (
    <div
      className="fixed inset-0 z-50 bg-kd-stage/95 flex items-center justify-center select-none"
      onClick={handleBackdropClick}
      onWheel={handleWheel}
    >
      <button
        type="button"
        onClick={onClose}
        title="закрыть · esc"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-kd-overlay-soft hover:bg-kd-overlay-strong text-kd-stage-text text-[20px] font-bold flex items-center justify-center"
      >
        ×
      </button>
      <button
        type="button"
        onClick={handleDownload}
        title="скачать оригинал"
        className="absolute top-4 right-16 px-3 py-2 rounded bg-kd-overlay-soft hover:bg-kd-overlay-strong text-kd-stage-text text-[11px] font-mono"
      >
        скачать ⏷
      </button>
      {showNav && (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            title="назад · ←"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-kd-overlay-soft hover:bg-kd-overlay-strong text-kd-stage-text text-[20px] font-bold flex items-center justify-center"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            title="вперёд · →"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-kd-overlay-soft hover:bg-kd-overlay-strong text-kd-stage-text text-[20px] font-bold flex items-center justify-center"
          >
            ›
          </button>
        </>
      )}
      <img
        src={current.url}
        alt={current.originalName}
        className="max-w-[92vw] max-h-[88vh] object-contain shadow-kd-modal"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-kd-stage-text/80 font-mono bg-kd-overlay-soft px-3 py-1 rounded">
        {current.originalName}
        {showNav && <span className="ml-2 opacity-70">· {idx + 1} / {images.length}</span>}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return node
  return createPortal(node, document.body)
}
