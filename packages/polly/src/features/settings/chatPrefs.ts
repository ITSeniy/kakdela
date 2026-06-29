// Поведенческие настройки чата и приватности. Персистятся локально (как
// appearance/notify-prefs); применяются в композере, рендере сообщений и
// presence-логике. Сервер о них не знает — это клиентские предпочтения.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Чем отправлять сообщение. ctrl-enter → Enter становится переносом строки. */
export type SendKey = 'enter' | 'ctrl-enter'
/** Формат времени у сообщений. */
export type TimeFormat = '24h' | '12h'

/** Пресеты авто-«отошёл»: минуты бездействия (0 — выключено). */
export const IDLE_PRESETS: Array<{ min: number; label: string }> = [
  { min: 0,  label: 'выкл' },
  { min: 5,  label: '5 мин' },
  { min: 10, label: '10 мин' },
  { min: 15, label: '15 мин' },
  { min: 30, label: '30 мин' },
]

interface ChatPrefsState {
  sendKey: SendKey
  timeFormat: TimeFormat
  /** Автопроигрывание GIF/видео-гифок в ленте. */
  autoplayGifs: boolean
  /** Рендерить карточки превью ссылок (OG-embeds). */
  showLinkPreviews: boolean
  /** Отправлять серверу свой сигнал «печатает». */
  sendTyping: boolean
  /** Показывать индикатор «кто печатает» у композера. */
  showTyping: boolean
  /** Минуты бездействия до авто-«отошёл» (0 — выключено). */
  idleAfterMin: number
  setSendKey(v: SendKey): void
  setTimeFormat(v: TimeFormat): void
  setAutoplayGifs(v: boolean): void
  setShowLinkPreviews(v: boolean): void
  setSendTyping(v: boolean): void
  setShowTyping(v: boolean): void
  setIdleAfterMin(v: number): void
}

export const useChatPrefs = create<ChatPrefsState>()(
  persist(
    (set) => ({
      sendKey: 'enter',
      timeFormat: '24h',
      autoplayGifs: true,
      showLinkPreviews: true,
      sendTyping: true,
      showTyping: true,
      idleAfterMin: 0,
      setSendKey: (sendKey) => set({ sendKey }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setAutoplayGifs: (autoplayGifs) => set({ autoplayGifs }),
      setShowLinkPreviews: (showLinkPreviews) => set({ showLinkPreviews }),
      setSendTyping: (sendTyping) => set({ sendTyping }),
      setShowTyping: (showTyping) => set({ showTyping }),
      setIdleAfterMin: (idleAfterMin) => set({ idleAfterMin }),
    }),
    { name: 'kd:chat:prefs' },
  ),
)

/** Время сообщения по выбранному формату (24/12ч). */
export function formatClock(iso: string, fmt: TimeFormat): string {
  return new Date(iso).toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: fmt === '12h',
  })
}
