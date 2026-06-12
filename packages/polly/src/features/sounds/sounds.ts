// Звуки интерфейса: три пака.
//   • «какао»  — мягкие синусовые перезвоны, синтез через WebAudio (дефолт);
//   • «ретро»  — 8-битные квадратные бипы, тоже синтез;
//   • «свой»   — бинарные аудиофайлы из ./custom/ (см. README там же);
//                для событий без файла — fallback на синтез «какао».
// Настройки (вкл/выкл, громкость, пак) — в настройках → звуки.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SoundEvent =
  | 'mute-on' | 'mute-off'
  | 'deafen-on' | 'deafen-off'
  | 'voice-join' | 'voice-leave'
  | 'user-join' | 'user-leave'
  | 'moved'
  | 'notification'
  | 'stream-start' | 'stream-end'
  | 'viewer-join' | 'viewer-leave'

export const SOUND_EVENT_LABELS: Record<SoundEvent, string> = {
  'mute-on':      'микрофон выключен',
  'mute-off':     'микрофон включён',
  'deafen-on':    'звук выключен',
  'deafen-off':   'звук включён',
  'voice-join':   'вы зашли в голосовой',
  'voice-leave':  'вы вышли из голосового',
  'user-join':    'кто-то зашёл',
  'user-leave':   'кто-то вышел',
  'moved':        'вас переместили',
  'notification': 'уведомление',
  'stream-start': 'стрим начался',
  'stream-end':   'стрим закончился',
  'viewer-join':  'зритель зашёл на стрим',
  'viewer-leave': 'зритель ушёл со стрима',
}

export type SoundPackId = 'kakao' | 'retro' | 'custom'

// Файловый пак: Vite собирает все аудио из ./custom/, имя файла = имя
// события (`voice-join.mp3` и т.п.). Карта статична на момент сборки —
// после добавления файлов нужен перезапуск dev-сервера / пересборка.
const CUSTOM_FILE_URLS: Partial<Record<SoundEvent, string>> = (() => {
  const out: Partial<Record<SoundEvent, string>> = {}
  const files = import.meta.glob('./custom/*.{mp3,ogg,wav,m4a,webm,flac,aac}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>
  for (const [path, url] of Object.entries(files)) {
    const base = path.split('/').pop()?.replace(/\.[a-z0-9]+$/i, '') ?? ''
    if (base in SOUND_EVENT_LABELS) out[base as SoundEvent] = url
  }
  return out
})()

const EVENT_COUNT = Object.keys(SOUND_EVENT_LABELS).length
const CUSTOM_COUNT = Object.keys(CUSTOM_FILE_URLS).length

export const SOUND_PACKS: Array<{ id: SoundPackId; label: string; hint: string }> = [
  { id: 'kakao', label: 'какао', hint: 'мягкие перезвоны' },
  { id: 'retro', label: 'ретро', hint: '8-битные бипы' },
  {
    id: 'custom',
    label: 'свой',
    hint: CUSTOM_COUNT > 0
      ? `из файлов · ${CUSTOM_COUNT}/${EVENT_COUNT}`
      : 'файлов нет — см. sounds/custom',
  },
]

interface SoundSettings {
  enabled: boolean
  volume: number // 0..1
  pack: SoundPackId
  setEnabled(on: boolean): void
  setVolume(v: number): void
  setPack(pack: SoundPackId): void
}

export const useSoundSettings = create<SoundSettings>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.5,
      pack: 'kakao',
      setEnabled: (enabled) => set({ enabled }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setPack: (pack) => set({ pack }),
    }),
    { name: 'kd:sounds' },
  ),
)

/** Нота: частота (Гц), старт и длительность (сек), относительная громкость. */
interface Note { f: number; t: number; d: number; g?: number }

// Мелодии задаём один раз; пак меняет тембр (волну), темп и октаву.
const MELODIES: Record<SoundEvent, Note[]> = {
  'mute-off':     [{ f: 440, t: 0, d: 0.09 }, { f: 587, t: 0.08, d: 0.12 }],
  'mute-on':      [{ f: 587, t: 0, d: 0.09 }, { f: 440, t: 0.08, d: 0.12 }],
  'deafen-off':   [{ f: 330, t: 0, d: 0.09 }, { f: 440, t: 0.08, d: 0.09 }, { f: 554, t: 0.16, d: 0.14 }],
  'deafen-on':    [{ f: 554, t: 0, d: 0.09 }, { f: 440, t: 0.08, d: 0.09 }, { f: 330, t: 0.16, d: 0.14 }],
  'voice-join':   [{ f: 392, t: 0, d: 0.1 }, { f: 523, t: 0.09, d: 0.1 }, { f: 659, t: 0.18, d: 0.18 }],
  'voice-leave':  [{ f: 659, t: 0, d: 0.1 }, { f: 523, t: 0.09, d: 0.1 }, { f: 392, t: 0.18, d: 0.18 }],
  'user-join':    [{ f: 523, t: 0, d: 0.08 }, { f: 659, t: 0.07, d: 0.12 }],
  'user-leave':   [{ f: 659, t: 0, d: 0.08 }, { f: 523, t: 0.07, d: 0.12 }],
  'moved':        [{ f: 440, t: 0, d: 0.07 }, { f: 554, t: 0.06, d: 0.07 }, { f: 440, t: 0.12, d: 0.07 }, { f: 659, t: 0.18, d: 0.16 }],
  'notification': [{ f: 880, t: 0, d: 0.08, g: 0.8 }, { f: 1175, t: 0.07, d: 0.16, g: 0.7 }],
  'stream-start': [{ f: 523, t: 0, d: 0.09 }, { f: 659, t: 0.08, d: 0.09 }, { f: 784, t: 0.16, d: 0.2 }],
  'stream-end':   [{ f: 784, t: 0, d: 0.09 }, { f: 659, t: 0.08, d: 0.09 }, { f: 523, t: 0.16, d: 0.2 }],
  'viewer-join':  [{ f: 740, t: 0, d: 0.06, g: 0.6 }, { f: 988, t: 0.05, d: 0.09, g: 0.6 }],
  'viewer-leave': [{ f: 988, t: 0, d: 0.06, g: 0.6 }, { f: 740, t: 0.05, d: 0.09, g: 0.6 }],
}

interface PackVoice {
  wave: OscillatorType
  /** Множитель частоты (октава/тон пака). */
  pitch: number
  /** Множитель темпа: <1 — быстрее. */
  tempo: number
  gain: number
}

const PACK_VOICES: Record<Exclude<SoundPackId, 'custom'>, PackVoice> = {
  kakao: { wave: 'sine',   pitch: 1,   tempo: 1,    gain: 1 },
  retro: { wave: 'square', pitch: 1.5, tempo: 0.75, gain: 0.35 },
}

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (ctx) return ctx
  try {
    ctx = new AudioContext()
    return ctx
  } catch {
    return null
  }
}

// Декодированные буферы файлового пака — по одному decode на URL за сессию.
const bufferCache = new Map<string, Promise<AudioBuffer | null>>()

function loadBuffer(ac: AudioContext, url: string): Promise<AudioBuffer | null> {
  let p = bufferCache.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ac.decodeAudioData(b))
      .catch(() => null)
    bufferCache.set(url, p)
  }
  return p
}

/** Проиграть событие текущим паком. force — для превью в настройках,
    когда звуки выключены тумблером. */
export function playSound(event: SoundEvent, opts?: { force?: boolean; pack?: SoundPackId }): void {
  const { enabled, volume, pack } = useSoundSettings.getState()
  if (!enabled && !opts?.force) return
  if (volume <= 0) return
  const ac = audioCtx()
  if (!ac) return
  if (ac.state === 'suspended') void ac.resume().catch(() => { /* ignore */ })

  const packId = opts?.pack ?? pack

  // Файловый пак: проигрываем буфер; если файла для события нет —
  // проваливаемся в синтез «какао», чтобы событие не было немым.
  if (packId === 'custom') {
    const url = CUSTOM_FILE_URLS[event]
    if (url) {
      void loadBuffer(ac, url).then((buf) => {
        if (!buf) return
        const src = ac.createBufferSource()
        const gain = ac.createGain()
        src.buffer = buf
        gain.gain.value = volume
        src.connect(gain)
        gain.connect(ac.destination)
        src.start()
      })
      return
    }
  }

  const voice = PACK_VOICES[packId === 'custom' ? 'kakao' : packId]
  const now = ac.currentTime + 0.02
  for (const note of MELODIES[event]) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = voice.wave
    osc.frequency.value = note.f * voice.pitch
    const start = now + note.t * voice.tempo
    const dur = Math.max(0.04, note.d * voice.tempo)
    const peak = 0.18 * volume * voice.gain * (note.g ?? 1)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + dur + 0.05)
  }
}
