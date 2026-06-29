// Рисует overlay-бейдж непрочитанного для иконки таскбара (Windows): красный
// кружок с числом. Возвращает base64 PNG или null (когда счётчик 0 — бейдж
// снимается). Рендерим крупно (48px) — Windows сам ужмёт до ~16px overlay.

const SIZE = 48

export function renderBadgeIconBase64(count: number): string | null {
  if (typeof document === 'undefined' || count <= 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Красный кружок-бейдж (конвенция overlay-иконок непрочитанного).
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = '#e5484d'
  ctx.fill()

  const text = count > 99 ? '99+' : String(count)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Подбираем размер под длину: одна цифра крупнее, «99+» мельче.
  const fontPx = text.length >= 3 ? 22 : text.length === 2 ? 28 : 34
  ctx.font = `700 ${fontPx}px Inter, system-ui, sans-serif`
  ctx.fillText(text, SIZE / 2, SIZE / 2 + 2)

  try {
    return canvas.toDataURL('image/png').split(',')[1] ?? null
  } catch {
    return null
  }
}
