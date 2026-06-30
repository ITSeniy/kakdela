// Нативный захват системного/процессного звука для демонстрации (T-094).
//
// Stage 0: спрашиваем у нативной стороны (src-tauri/src/audio/mod.rs), что
// умеет ОС. Сам захват PCM и мост в WebRTC (кастомный трек в LiveKit) добавятся
// следующими стадиями. На web/не-Tauri — «не поддерживается»: нативный захват
// возможен только в Windows-сборке.

export type AudioCaptureMode = 'unsupported' | 'system-loopback' | 'process-loopback'

export interface AudioCaptureCapability {
  /** Высшая доступная ступень захвата. */
  mode: AudioCaptureMode
  /** Доступен ли захват всего системного звука (устройство вывода). */
  systemLoopback: boolean
  /** Доступен ли per-process захват (звук одного приложения). */
  processLoopback: boolean
  /** Номер билда Windows (0 — не Windows / не определён). */
  buildNumber: number
}

const UNSUPPORTED: AudioCaptureCapability = {
  mode: 'unsupported',
  systemLoopback: false,
  processLoopback: false,
  buildNumber: 0,
}

function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

/** Что умеет ОС по части нативного захвата звука. На web — «не поддерживается». */
export async function getAudioCaptureCapability(): Promise<AudioCaptureCapability> {
  if (!isTauri()) return UNSUPPORTED
  try {
    const mod = await import('@tauri-apps/api/core')
    return await mod.invoke<AudioCaptureCapability>('audio_capture_capability')
  } catch (err) {
    console.warn('[audioCapture] capability probe failed', err)
    return UNSUPPORTED
  }
}

/** Итог тестовой записи системного звука (Stage A). */
export interface LoopbackCaptureResult {
  /** Путь к WAV-файлу. */
  path: string
  sampleRate: number
  channels: number
  frames: number
  bytes: number
}

/**
 * Stage A (debug): записать `seconds` секунд системного звука в WAV и вернуть
 * путь. Verification-артефакт — проигрываешь файл, слышишь системный звук.
 * Только в нативной Windows-сборке; на web — бросает.
 */
export async function recordLoopbackCapture(seconds: number): Promise<LoopbackCaptureResult> {
  if (!isTauri()) throw new Error('loopback capture is Windows-only')
  const mod = await import('@tauri-apps/api/core')
  return mod.invoke<LoopbackCaptureResult>('audio_capture_record', { seconds })
}

/** Процесс для пикера Stage B (PID + имя exe). */
export interface ProcessEntry {
  pid: number
  name: string
}

/** Список процессов для выбора в пикере «звук приложения». На web — пусто. */
export async function listAudioProcesses(): Promise<ProcessEntry[]> {
  if (!isTauri()) return []
  const mod = await import('@tauri-apps/api/core')
  return mod.invoke<ProcessEntry[]>('audio_list_processes')
}

/**
 * Stage B (debug): записать `seconds` секунд звука процесса `pid` (и его дерева)
 * в WAV. По-дискордовски — захват одного приложения. Только Windows-сборка.
 */
export async function recordProcessCapture(
  pid: number,
  seconds: number,
): Promise<LoopbackCaptureResult> {
  if (!isTauri()) throw new Error('process loopback is Windows-only')
  const mod = await import('@tauri-apps/api/core')
  return mod.invoke<LoopbackCaptureResult>('audio_capture_record_process', { pid, seconds })
}

/** Параметры активного стрима + способ его остановить. */
export interface AudioStreamInfo {
  sampleRate: number
  channels: number
}
export interface ActiveAudioStream extends AudioStreamInfo {
  stop(): Promise<void>
}

/**
 * Stage C: запускает непрерывный стрим PCM (48к/16/стерео) и зовёт `onPcm` на
 * каждый чанк — ArrayBuffer сырых интерливленных i16 LE (без re-encode). `pid`
 * не задан → весь системный звук. Только Windows-сборка.
 */
export async function startAudioStream(
  opts: { pid?: number },
  onPcm: (chunk: ArrayBuffer) => void,
): Promise<ActiveAudioStream> {
  if (!isTauri()) throw new Error('audio stream is Windows-only')
  const mod = await import('@tauri-apps/api/core')
  const channel = new mod.Channel<ArrayBuffer>()
  channel.onmessage = onPcm
  const info = await mod.invoke<AudioStreamInfo>('audio_stream_start', {
    pid: opts.pid ?? null,
    onPcm: channel,
  })
  return {
    ...info,
    async stop() {
      await mod.invoke('audio_stream_stop')
    },
  }
}
