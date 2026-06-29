// Готовит круглую иконку для нативного Windows-тоста (Discord-подобный вид):
// аватар автора либо цветной кружок с инициалами. Рисуем в canvas и отдаём
// base64 PNG — Rust пишет его во временный файл и подставляет как
// appLogoOverride (см. lib.rs::write_toast_icon). Используется только в Tauri.

import { pickAvatarColor } from '../../components/palette.js'

const SIZE = 96

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // crossOrigin даёт незапятнанный canvas, если сервер шлёт CORS-заголовки;
    // иначе toDataURL бросит — поймаем и нарисуем инициалы.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

/** object-fit: cover для квадрата SIZE×SIZE. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement): void {
  const s = Math.min(img.width, img.height)
  const sx = (img.width - s) / 2
  const sy = (img.height - s) / 2
  ctx.drawImage(img, sx, sy, s, s, 0, 0, SIZE, SIZE)
}

function drawInitials(ctx: CanvasRenderingContext2D, name: string): void {
  ctx.fillStyle = pickAvatarColor(name)
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 40px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials(name), SIZE / 2, SIZE / 2 + 2)
}

function newCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // Круглый клип (WinRT тоже умеет hint-crop=circle, но рисуем сами — так
  // одинаково для аватара и инициалов и не зависит от версии шаблона).
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  return { canvas, ctx }
}

/**
 * base64 PNG (без `data:`-префикса) круглой иконки или null. Аватар по URL
 * пробуем нарисовать; при недоступности/CORS-запятнанности — инициалы.
 */
export async function renderToastIconBase64(
  name: string,
  avatarUrl: string | null,
): Promise<string | null> {
  if (typeof document === 'undefined') return null

  if (avatarUrl) {
    try {
      const img = await loadImage(avatarUrl)
      const c = newCanvas()
      if (c) {
        drawCover(c.ctx, img)
        return c.canvas.toDataURL('image/png').split(',')[1] ?? null
      }
    } catch {
      /* не загрузилось или canvas запятнан — рисуем инициалы ниже */
    }
  }

  const c = newCanvas()
  if (!c) return null
  drawInitials(c.ctx, name)
  try {
    return c.canvas.toDataURL('image/png').split(',')[1] ?? null
  } catch {
    return null
  }
}
