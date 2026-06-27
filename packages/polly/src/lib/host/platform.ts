// Тонкая обёртка над `@tauri-apps/plugin-os` с web-fallback'ом для
// `pnpm dev:web` (когда Tauri-обвязки нет в принципе).

export type HostPlatform = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'web'

/** Мобильные таргеты (Tauri mobile). */
const MOBILE_PLATFORMS: ReadonlySet<HostPlatform> = new Set(['android', 'ios'])

/** true для android/ios — используется для выбора мобильного shell (T-100). */
export function isMobilePlatform(p: HostPlatform): boolean {
  return MOBILE_PLATFORMS.has(p)
}

let cached: HostPlatform | null = null

function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

export async function getPlatform(): Promise<HostPlatform> {
  if (cached) return cached
  if (!isTauri()) {
    cached = 'web'
    return cached
  }
  try {
    const mod = await import('@tauri-apps/plugin-os')
    const p = mod.platform()
    if (
      p === 'macos' || p === 'windows' || p === 'linux'
      || p === 'android' || p === 'ios'
    ) {
      cached = p
      return p
    }
    cached = 'web'
    return cached
  } catch (err) {
    console.warn('[host/platform] failed to detect platform, falling back to web', err)
    cached = 'web'
    return cached
  }
}
