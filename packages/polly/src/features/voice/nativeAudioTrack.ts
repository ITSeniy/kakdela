// T-094 Stage C, шаг 2 — превращаем нативный PCM-стрим (из Rust, шаг 1) в живой
// аудио-MediaStreamTrack через WebCodecs AudioData + MediaStreamTrackGenerator.
// Этот трек потом публикуется в LiveKit как ScreenShareAudio (шаг 3).
//
// Формат стрима фиксирован Rust-стороной: 48 кГц, 2 канала, интерливленный
// signed-16 (s16). Поэтому здесь ничего не ресемплим и не переформатируем —
// заворачиваем сырые байты прямо в AudioData.

import { startAudioStream } from '../../lib/host/audioCapture.js'

const SAMPLE_RATE = 48_000
const CHANNELS = 2
// 2 канала × 2 байта (s16) = 4 байта на фрейм.
const BYTES_PER_FRAME = CHANNELS * 2

export interface NativeAudioTrack {
  /** Живой MediaStreamTrack с захваченным звуком — для LiveKit publishTrack. */
  track: MediaStreamTrack
  stop(): Promise<void>
}

/**
 * Запускает нативный захват и отдаёт живой аудио-трек. `pid` не задан → весь
 * системный звук; задан → конкретный процесс (Stage B). Только Windows-сборка.
 */
export async function createNativeAudioTrack(opts: { pid?: number }): Promise<NativeAudioTrack> {
  const generator = new MediaStreamTrackGenerator({ kind: 'audio' })
  const writer = generator.writable.getWriter()

  // AudioData требует монотонно растущий timestamp (мкс) — ведём его сами,
  // продвигая на длительность каждого чанка. MSTG по нему пейсит выход.
  let timestampUs = 0
  let closed = false

  const stream = await startAudioStream(opts, (chunk) => {
    if (closed) return
    const numberOfFrames = chunk.byteLength / BYTES_PER_FRAME
    if (numberOfFrames === 0) return
    const audioData = new AudioData({
      format: 's16',
      sampleRate: SAMPLE_RATE,
      numberOfFrames,
      numberOfChannels: CHANNELS,
      timestamp: timestampUs,
      data: chunk,
    })
    timestampUs += Math.round((numberOfFrames / SAMPLE_RATE) * 1_000_000)
    // Не ждём write — чтобы не блокировать приём чанков; внутренняя очередь
    // writable сглаживает. Reject у write = трек закрыт → перестаём кормить.
    writer.write(audioData).catch(() => {
      closed = true
    })
  })

  return {
    track: generator,
    async stop() {
      closed = true
      await stream.stop()
      try {
        await writer.close()
      } catch {
        /* writer уже закрыт/ошибся — не страшно */
      }
    },
  }
}
