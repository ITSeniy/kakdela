// Тонкая обёртка над `@tauri-apps/plugin-notification` с fallback'ом на
// браузерный Notification API. Импорт тауровского плагина — динамический,
// чтобы `pnpm dev:web` (без Tauri) не падал на ESM-resolve'е.

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
  /** Уникальный ключ — позволяет ОС объединять/заменять уведомления. */
  tag?: string
  /** Срабатывает на user click (web only — Tauri 2 пока не пробрасывает). */
  onClick?: () => void
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
      const mod = await import('@tauri-apps/plugin-notification')
      mod.sendNotification({ title: opts.title, body: opts.body })
      // onClick для Tauri 2: плагин ещё не пробрасывает события клика в JS
      // на Windows (только app-handle в Rust). Click → focus_main_window
      // вызовем в hook'е через WS unread-полл.
      return
    } catch (err) {
      console.warn('[notify] tauri send failed, falling back to web', err)
    }
  }

  if (typeof Notification === 'undefined') return
  try {
    const n = new Notification(opts.title, { body: opts.body, tag: opts.tag })
    if (opts.onClick) {
      n.onclick = () => {
        opts.onClick?.()
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
 * (OS-диалог не требует жеста).
 */
let primed = false
export function primeNotifyPermission(): void {
  if (primed) return
  primed = true
  if (isTauri()) {
    void ensurePermission()
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
