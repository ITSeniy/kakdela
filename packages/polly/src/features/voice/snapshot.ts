import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client'

export class SnapshotError extends Error {
  constructor(public readonly code: 'no-frame' | 'no-canvas-ctx' | 'blob-failed') {
    super(code)
    this.name = 'SnapshotError'
  }
}

/**
 * Снять текущий кадр screen-share track'а в JPEG Blob. Идея:
 *
 *   1. `track.attach()` отдаёт нам <video> с уже подписанным `srcObject` —
 *      руками `new Video()` + `srcObject = ...` сделать сложнее (race с
 *      autoplay, нужно ждать `loadedmetadata`).
 *   2. canvas.drawImage(video, …) рисует именно текущий decoded-кадр.
 *   3. detach обязательно: иначе LiveKit считает video элемент активным
 *      подписчиком трека и будет дольше держать decoding pipeline.
 *
 * Если track ещё не прогрелся (videoWidth = 0) — кидаем 'no-frame',
 * caller решает: показать ошибку или попробовать через 100ms ещё раз.
 */
export async function snapshotTrack(
  track: LocalVideoTrack | RemoteVideoTrack,
): Promise<Blob> {
  const video = track.attach() as HTMLVideoElement
  try {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new SnapshotError('no-frame')
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new SnapshotError('no-canvas-ctx')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => {
      // 0.85 — sweet-spot для JPEG: визуально без артефактов, ~200-500 KB
      // на 1080p. webp сильно меньше при том же качестве, но не везде
      // одинаково декодится (см. T-053 пометка).
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    })
    if (!blob) throw new SnapshotError('blob-failed')
    return blob
  } finally {
    try { track.detach(video) } catch { /* SDK already detached */ }
    video.remove()
  }
}
