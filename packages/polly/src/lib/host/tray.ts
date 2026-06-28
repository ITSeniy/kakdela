// Обёртка над двумя tauri::command'ами из src-tauri/src/lib.rs:
//   • set_tray_badge(count: u32) — обновить tooltip / macOS title-badge
//   • focus_main_window()         — показать и сфокусировать главное окно
//
// В non-Tauri окружении (`pnpm dev:web`) обе функции — no-op.

function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

export async function setTrayBadge(count: number): Promise<void> {
  if (!isTauri()) return
  try {
    const mod = await import('@tauri-apps/api/core')
    await mod.invoke('set_tray_badge', { count: Math.max(0, Math.floor(count)) })
  } catch (err) {
    console.warn('[tray] set_tray_badge failed', err)
  }
}

export async function focusMainWindow(): Promise<void> {
  if (!isTauri()) {
    if (typeof window !== 'undefined') window.focus()
    return
  }
  try {
    const mod = await import('@tauri-apps/api/core')
    await mod.invoke('focus_main_window')
  } catch (err) {
    console.warn('[tray] focus_main_window failed', err)
  }
}

// Входящий DM-звонок (T-087): на desktop поднять окно поверх всех и попросить
// внимания (active=true), снять always-on-top после ответа (active=false).
// В web — best-effort window.focus(), в остальном no-op.
export async function setCallAlert(active: boolean): Promise<void> {
  if (!isTauri()) {
    if (active && typeof window !== 'undefined') window.focus()
    return
  }
  try {
    const mod = await import('@tauri-apps/api/core')
    await mod.invoke('set_call_alert', { active })
  } catch (err) {
    console.warn('[tray] set_call_alert failed', err)
  }
}
