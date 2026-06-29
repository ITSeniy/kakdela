// Десктоп-интеграция (Tauri): автозапуск, поведение окна, бейдж/мигание
// таскбара, keep-awake. Всё через динамические импорты — в браузерном режиме
// (`pnpm dev:web`) функции no-op. Бизнес-логика обращается сюда, а не к
// @tauri-apps/* напрямую (см. правило host-абстракции в CLAUDE.md).

function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

export function isDesktop(): boolean {
  return isTauri()
}

async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  const { invoke: inv } = await import('@tauri-apps/api/core')
  return inv(cmd, args)
}

// ───── Автозапуск (tauri-plugin-autostart) ─────

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    return await isEnabled()
  } catch (err) {
    console.warn('[desktop] autostart isEnabled failed', err)
    return false
  }
}

export async function setAutostart(on: boolean): Promise<void> {
  if (!isTauri()) return
  try {
    const mod = await import('@tauri-apps/plugin-autostart')
    if (on) await mod.enable()
    else await mod.disable()
  } catch (err) {
    console.warn('[desktop] autostart toggle failed', err)
  }
}

// ───── Окно ─────

/** Запущено ли с флагом автозапуска (--minimized). */
export async function wasLaunchedMinimized(): Promise<boolean> {
  if (!isTauri()) return false
  try {
    return Boolean(await invoke('launched_minimized'))
  } catch {
    return false
  }
}

export async function hideMainWindow(): Promise<void> {
  if (!isTauri()) return
  try {
    await invoke('hide_main_window')
  } catch (err) {
    console.warn('[desktop] hide window failed', err)
  }
}

/** Закрывать окно в трей (true) или выходить (false). */
export async function setCloseToTray(toTray: boolean): Promise<void> {
  if (!isTauri()) return
  try {
    await invoke('set_close_to_tray', { toTray })
  } catch (err) {
    console.warn('[desktop] set close-to-tray failed', err)
  }
}

// ───── Таскбар ─────

/** Overlay-бейдж непрочитанного на иконке таскбара (Windows). null — снять. */
export async function setTaskbarBadge(iconBase64: string | null): Promise<void> {
  if (!isTauri()) return
  try {
    await invoke('set_taskbar_badge', { iconBase64 })
  } catch (err) {
    console.warn('[desktop] taskbar badge failed', err)
  }
}

/** Мигнуть иконкой таскбара (привлечь внимание) — при упоминании без фокуса. */
export async function flashTaskbar(): Promise<void> {
  if (!isTauri()) return
  try {
    const { getCurrentWindow, UserAttentionType } = await import('@tauri-apps/api/window')
    await getCurrentWindow().requestUserAttention(UserAttentionType.Critical)
  } catch (err) {
    console.warn('[desktop] flash taskbar failed', err)
  }
}

// ───── Звонок ─────

/** Не давать ПК уснуть/гасить экран, пока true (на время звонка). */
export async function setKeepAwake(on: boolean): Promise<void> {
  if (!isTauri()) return
  try {
    await invoke('keep_awake', { on })
  } catch (err) {
    console.warn('[desktop] keep-awake failed', err)
  }
}
