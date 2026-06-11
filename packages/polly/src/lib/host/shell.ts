function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

/** Open an external URL. In Tauri the OS default browser is used (so the link
 *  does not load inside the desktop window). In web-only dev mode we fall
 *  back to a noopener window.open. */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const mod = await import('@tauri-apps/plugin-shell')
      await mod.open(url)
      return
    } catch (err) {
      console.warn('[host/shell] tauri-plugin-shell unavailable, falling back', err)
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
