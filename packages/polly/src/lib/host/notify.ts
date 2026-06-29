// Тонкая обёртка над нативными уведомлениями с fallback'ом на браузерный
// Notification API. Импорты тауровских модулей — динамические, чтобы
// `pnpm dev:web` (без Tauri) не падал на ESM-resolve'е.
//
// Клик по уведомлению:
//  • web   — Notification.onclick → переход в SPA.
//  • Tauri — десктоп-плагин НЕ зовёт JS-onClick (notify-rust `.show()` без
//            обработчика активации). Поэтому показываем тост своей Rust-командой
//            `notify_with_target`, которая ловит клик (on_activated) и эмитит
//            событие `notify-activated` с целевым URL — слушаем его здесь.

import { focusMainWindow } from './tray.js'

function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

let permissionCache: 'granted' | 'denied' | 'default' | null = null

async function ensurePermission(): Promise<boolean> {
  // Tauri: спрашиваем у плагина (он сам мостит к OS API).
  if (isTauri()) {
    try {
      const mod = await import('@tauri-apps/plugin-notification')
      if (await mod.isPermissionGranted()) {
        permissionCache = 'granted'
        return true
      }
      const result = await mod.requestPermission()
      permissionCache = result === 'granted' ? 'granted' : 'denied'
      return result === 'granted'
    } catch (err) {
      console.warn('[notify] tauri permission check failed', err)
      return false
    }
  }
  // Web fallback.
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') {
    permissionCache = 'granted'
    return true
  }
  if (Notification.permission === 'denied') {
    permissionCache = 'denied'
    return false
  }
  const result = await Notification.requestPermission()
  permissionCache = result
  return result === 'granted'
}

export interface NotifyOptions {
  title: string
  body: string
  /** Уникальный ключ — позволяет ОС объединять/заменять уведомления (web). */
  tag?: string
  /** Куда перейти по клику (web и Tauri). Главный способ навигации. */
  navigateTo?: string
  /** Web-only: явный обработчик клика (когда нет простого URL-перехода). */
  onClick?: () => void
}

/** Переход к цели по клику уведомления: показать окно и сменить роут. */
function navigateToTarget(url: string): void {
  void focusMainWindow()
  history.pushState({}, '', url)
  // wouter слушает history → форсируем перерисовку через popstate.
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// Tauri: одноразовая подписка на событие активации тоста из Rust.
let activationListenerReady: Promise<void> | null = null
function ensureTauriActivationListener(): Promise<void> {
  if (activationListenerReady) return activationListenerReady
  activationListenerReady = (async () => {
    try {
      const { listen } = await import('@tauri-apps/api/event')
      await listen<string>('notify-activated', (e) => {
        if (typeof e.payload === 'string' && e.payload) navigateToTarget(e.payload)
      })
    } catch (err) {
      console.warn('[notify] tauri activation listener failed', err)
      activationListenerReady = null // дать шанс перерегистрации
    }
  })()
  return activationListenerReady
}

/**
 * Отправляет нативную нотификацию. При первом вызове запрашивает permission;
 * если пользователь отказал — все последующие вызовы no-op до перезапуска.
 */
export async function notify(opts: NotifyOptions): Promise<void> {
  if (permissionCache === 'denied') return
  const ok = await ensurePermission()
  if (!ok) return

  if (isTauri()) {
    try {
      if (opts.navigateTo) {
        // Свой тост с обработчиком клика (Rust on_activated → событие сюда).
        await ensureTauriActivationListener()
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('notify_with_target', {
          title: opts.title,
          body: opts.body,
          target: opts.navigateTo,
        })
      } else {
        // Без перехода — обычный плагинный тост.
        const mod = await import('@tauri-apps/plugin-notification')
        mod.sendNotification({ title: opts.title, body: opts.body })
      }
      return
    } catch (err) {
      console.warn('[notify] tauri send failed, falling back to web', err)
    }
  }

  if (typeof Notification === 'undefined') return
  try {
    const handler = opts.onClick
      ?? (opts.navigateTo ? () => navigateToTarget(opts.navigateTo!) : undefined)
    const n = new Notification(opts.title, { body: opts.body, tag: opts.tag })
    if (handler) {
      n.onclick = () => {
        handler()
        n.close()
        if (typeof window !== 'undefined') window.focus()
      }
    }
  } catch (err) {
    console.warn('[notify] web Notification construction failed', err)
  }
}

/**
 * Прогревает permission заранее. Браузеры показывают промпт только в ответ
 * на user gesture — вызов Notification.requestPermission() из WS-хендлера
 * молча игнорируется, и notify() навсегда остаётся no-op. Поэтому в web-режиме
 * вешаем one-shot listener на первый клик; в Tauri спрашиваем сразу
 * (OS-диалог не требует жеста) и поднимаем слушатель активации тостов.
 */
let primed = false
export function primeNotifyPermission(): void {
  if (primed) return
  primed = true
  if (isTauri()) {
    void ensurePermission()
    void ensureTauriActivationListener()
    return
  }
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'default') {
    permissionCache = Notification.permission
    return
  }
  window.addEventListener('pointerdown', () => { void ensurePermission() }, { once: true })
}

/** Текущее состояние permission — для страницы настроек. */
export async function notifyPermissionState(): Promise<'granted' | 'denied' | 'default'> {
  if (isTauri()) {
    try {
      const mod = await import('@tauri-apps/plugin-notification')
      return (await mod.isPermissionGranted()) ? 'granted' : 'default'
    } catch {
      return 'denied'
    }
  }
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.permission
}

/** Возвращает true, если permission уже granted (без запроса). */
export async function isNotifyAllowed(): Promise<boolean> {
  if (permissionCache === 'granted') return true
  if (permissionCache === 'denied')  return false
  if (isTauri()) {
    try {
      const mod = await import('@tauri-apps/plugin-notification')
      return await mod.isPermissionGranted()
    } catch {
      return false
    }
  }
  if (typeof Notification === 'undefined') return false
  return Notification.permission === 'granted'
}
