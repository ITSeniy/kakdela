import { useCallback, useEffect, useRef, useState } from 'react'

import { Slider } from '../../components/form/Slider.js'

const OUTPUT_SIZE = 256        // финальный квадратный аватар
const PREVIEW_SIZE = 240       // canvas в модалке (px)
const MAX_INPUT_BYTES = 2 * 1024 * 1024
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp']

export interface AvatarCropperProps {
  /** Initial preview source, e.g. existing avatarUrl. */
  initialUrl?: string | null
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

interface ImageState {
  el: HTMLImageElement
  /** Zoom: 1.0 = «cover» (минимум, чтобы заполнить рамку). */
  zoom: number
  /** Offset of the image center relative to canvas center in canvas pixels. */
  dx: number
  dy: number
  /** Minimum zoom — кэшируем, чтобы slider не позволял уходить ниже cover. */
  minZoom: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('не получилось загрузить изображение'))
    img.src = src
  })
}

/**
 * Минимальный квадратный кроппер: drag для перемещения, slider для zoom,
 * жесткое ограничение, чтобы рамка всегда заполнена изображением (зум >=
 * cover). Не используем сторонние библиотеки — для квадратного кропа 50
 * строк работают надёжнее.
 */
export function AvatarCropper({ initialUrl, onConfirm, onCancel }: AvatarCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<ImageState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; dx0: number; dy0: number } | null>(null)

  const draw = useCallback((s: ImageState) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
    const { el, zoom, dx, dy } = s
    const drawW = el.width * zoom
    const drawH = el.height * zoom
    const drawX = (PREVIEW_SIZE - drawW) / 2 + dx
    const drawY = (PREVIEW_SIZE - drawH) / 2 + dy
    ctx.drawImage(el, drawX, drawY, drawW, drawH)
  }, [])

  useEffect(() => {
    if (!initialUrl) return
    let cancelled = false
    loadImage(initialUrl).then((img) => {
      if (cancelled) return
      const minZoom = Math.max(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height)
      const s: ImageState = { el: img, zoom: minZoom, dx: 0, dy: 0, minZoom }
      setState(s)
      draw(s)
    }).catch(() => { /* ignore — пользователь всё равно загрузит файл */ })
    return () => { cancelled = true }
  }, [initialUrl, draw])

  // Clamp the offset so we don't pan past the image edges.
  function clamp(s: ImageState): ImageState {
    const halfW = (s.el.width * s.zoom - PREVIEW_SIZE) / 2
    const halfH = (s.el.height * s.zoom - PREVIEW_SIZE) / 2
    return {
      ...s,
      dx: Math.max(-halfW, Math.min(halfW, s.dx)),
      dy: Math.max(-halfH, Math.min(halfH, s.dy)),
    }
  }

  async function loadFile(file: File) {
    setError(null)
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError('поддерживаются jpeg / png / webp')
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('файл больше 2 МБ — выберите поменьше')
      return
    }
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      const minZoom = Math.max(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height)
      const next = clamp({ el: img, zoom: minZoom, dx: 0, dy: 0, minZoom })
      setState(next)
      draw(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ошибка чтения изображения')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  function onPickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) void loadFile(f)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) void loadFile(f)
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!state) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, dx0: state.dx, dy0: state.dy }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current || !state) return
    const next = clamp({
      ...state,
      dx: dragRef.current.dx0 + (e.clientX - dragRef.current.startX),
      dy: dragRef.current.dy0 + (e.clientY - dragRef.current.startY),
    })
    setState(next)
    draw(next)
  }
  function onMouseUp() { dragRef.current = null }

  function onZoom(z: number) {
    if (!state) return
    const next = clamp({ ...state, zoom: Math.max(state.minZoom, z) })
    setState(next)
    draw(next)
  }

  async function confirm() {
    if (!state) return
    // Рендерим кроп в офскрин-канвас 256×256.
    const out = document.createElement('canvas')
    out.width = OUTPUT_SIZE
    out.height = OUTPUT_SIZE
    const ctx = out.getContext('2d')
    if (!ctx) {
      setError('браузер не даёт 2d-контекст')
      return
    }
    const scale = OUTPUT_SIZE / PREVIEW_SIZE
    const drawW = state.el.width * state.zoom * scale
    const drawH = state.el.height * state.zoom * scale
    const drawX = (OUTPUT_SIZE - drawW) / 2 + state.dx * scale
    const drawY = (OUTPUT_SIZE - drawH) / 2 + state.dy * scale
    ctx.drawImage(state.el, drawX, drawY, drawW, drawH)
    const blob = await new Promise<Blob | null>((resolve) => {
      out.toBlob(resolve, 'image/jpeg', 0.9)
    })
    if (!blob) {
      setError('не удалось сжать в jpeg')
      return
    }
    onConfirm(blob)
  }

  const hasImage = state !== null
  const maxZoom = state ? state.minZoom * 4 : 1
  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="relative w-full flex flex-col items-center gap-2"
      >
        <div className="relative" style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
          <canvas
            ref={canvasRef}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className="bg-kd-bg-deep rounded-full border border-kd-border cursor-grab active:cursor-grabbing"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          />
          {!hasImage && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-kd-text-mute font-mono pointer-events-none text-center px-4">
              перетащите картинку <br /> или выберите ниже
            </div>
          )}
        </div>
        {hasImage && (
          <Slider
            label="масштаб"
            display={`${Math.round((state!.zoom / state!.minZoom) * 100)}%`}
            value={state!.zoom}
            min={state!.minZoom}
            max={maxZoom}
            step={0.01}
            onChange={onZoom}
            className="w-full max-w-[240px]"
          />
        )}
      </div>

      {error && (
        <div className="text-[11px] text-kd-danger font-mono">{error}</div>
      )}

      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-mono text-kd-accent hover:text-kd-accent-deep cursor-pointer">
          <input
            type="file"
            accept={ACCEPTED_MIME.join(',')}
            onChange={onPickerChange}
            className="hidden"
          />
          выбрать файл…
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-[11px] font-mono rounded border border-kd-border text-kd-text-soft hover:text-kd-text"
          >
            отмена
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!hasImage}
            className="px-3 py-1 text-[11px] font-mono font-bold rounded bg-kd-accent text-white hover:bg-kd-accent-deep disabled:opacity-50"
          >
            сохранить
          </button>
        </div>
      </div>
      <div className="text-[10px] text-kd-text-mute font-mono">
        jpeg / png / webp · до 2 МБ · авто-кроп до квадрата 256×256
      </div>
    </div>
  )
}
