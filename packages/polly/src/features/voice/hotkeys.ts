// Горячие клавиши на голосовые функции (мут, деафен, выход из ГС).
//
// Два бэкенда:
//   • Tauri (десктоп) — системно-глобальные шорткаты через
//     tauri-plugin-global-shortcut: работают и при свёрнутом окне.
//   • Web — слушатель keydown на window: работает только при фокусе окна
//     (браузер не умеет глобальные хоткеи).
//
// Бинды хранятся локально (kd:hotkeys), по умолчанию ничего не назначено —
// глобальный шорткат «съедает» клавишу во всей системе, это должно быть
// осознанным выбором пользователя.

import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { isTypingTarget } from './usePushToTalk.js'
import { leaveVoiceRoom, toggleDeafenVoice, toggleMuteVoice } from './useVoiceRoom.js'

export type HotkeyAction = 'toggle-mute' | 'toggle-deafen' | 'leave-voice'

export const HOTKEY_ACTIONS: Array<{ id: HotkeyAction; label: string; hint: string }> = [
  { id: 'toggle-mute',   label: 'микрофон вкл/выкл',  hint: 'не работает в режиме push-to-talk' },
  { id: 'toggle-deafen', label: 'звук вкл/выкл',      hint: 'заглушить наушники и микрофон' },
  { id: 'leave-voice',   label: 'покинуть голосовой', hint: 'отключиться от текущего канала' },
]

export interface KeyBinding {
  /** KeyboardEvent.code основной клавиши — 'KeyM', 'F9', 'Numpad5'… */
  code: string
  ctrl: boolean
  alt: boolean
  shift: boolean
}

type Bindings = Partial<Record<HotkeyAction, KeyBinding | null>>

interface HotkeyState {
  bindings: Bindings
  setBinding(action: HotkeyAction, binding: KeyBinding | null): void
}

export const useHotkeySettings = create<HotkeyState>()(
  persist(
    (set) => ({
      bindings: {},
      setBinding: (action, binding) =>
        set((s) => ({ bindings: { ...s.bindings, [action]: binding } })),
    }),
    { name: 'kd:hotkeys' },
  ),
)

async function runHotkeyAction(action: HotkeyAction): Promise<void> {
  switch (action) {
    case 'toggle-mute':   return toggleMuteVoice()
    case 'toggle-deafen': return toggleDeafenVoice()
    case 'leave-voice':
      // Вне голосового — no-op, чтобы случайное нажатие ничего не ломало.
      await leaveVoiceRoom()
      return
  }
}

function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

/**
 * Tauri-акселератор из биндинга. Ключ — каноничное имя KeyboardEvent.code
 * ('KeyM', 'Digit5', 'F9', 'Space', 'ArrowUp'…): парсер плагина понимает
 * их напрямую через keyboard-types.
 */
function toAccelerator(b: KeyBinding): string {
  const parts: string[] = []
  if (b.ctrl) parts.push('ctrl')
  if (b.alt) parts.push('alt')
  if (b.shift) parts.push('shift')
  parts.push(b.code)
  return parts.join('+')
}

/**
 * Hook монтируется один раз в Shell. Перерегистрирует шорткаты при каждом
 * изменении биндов.
 */
export function useHotkeys(): void {
  const bindings = useHotkeySettings((s) => s.bindings)

  useEffect(() => {
    const entries = (Object.entries(bindings) as Array<[HotkeyAction, KeyBinding | null]>)
      .filter((e): e is [HotkeyAction, KeyBinding] => e[1] !== null && e[1] !== undefined)
    if (entries.length === 0) return undefined

    let disposed = false

    // ── Web fallback: keydown на window ──
    function onKeyDown(ev: KeyboardEvent) {
      for (const [action, b] of entries) {
        if (ev.code !== b.code) continue
        if (ev.ctrlKey !== b.ctrl || ev.altKey !== b.alt || ev.shiftKey !== b.shift) continue
        // Голую клавишу (без ctrl/alt) не перехватываем из полей ввода —
        // иначе бинд на букву ломает набор текста.
        if (!b.ctrl && !b.alt && isTypingTarget(ev.target)) return
        ev.preventDefault()
        void runHotkeyAction(action)
        return
      }
    }

    if (!isTauri()) {
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }

    // ── Tauri: системно-глобальные шорткаты ──
    let mod: typeof import('@tauri-apps/plugin-global-shortcut') | null = null
    void (async () => {
      try {
        mod = await import('@tauri-apps/plugin-global-shortcut')
      } catch (err) {
        // Плагин недоступен (старый бинарь без пересборки) — деградируем в
        // оконный слушатель, чтобы бинды работали хотя бы при фокусе.
        console.warn('[hotkeys] global-shortcut unavailable, window fallback', err)
        if (!disposed) window.addEventListener('keydown', onKeyDown)
        return
      }
      if (disposed) return
      const byAccel = new Map(entries.map(([action, b]) => [toAccelerator(b), action] as const))
      for (const [accel, action] of byAccel) {
        try {
          await mod.register(accel, (event) => {
            if (event.state !== 'Pressed') return
            void runHotkeyAction(action)
          })
        } catch (err) {
          // Комбинация занята другим приложением — пропускаем только её.
          console.warn('[hotkeys] register failed:', accel, err)
        }
      }
      if (disposed) void mod.unregisterAll().catch(() => {})
    })()

    return () => {
      disposed = true
      window.removeEventListener('keydown', onKeyDown)
      if (mod) void mod.unregisterAll().catch(() => {})
    }
  }, [bindings])
}
