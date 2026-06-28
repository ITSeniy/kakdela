// Базовый URL backend'а — единый источник для api.ts, ws.ts, auth/api.ts,
// AuthScreen.tsx. Приоритет резолва:
//
//   1. Явный VITE_SPEEDY_URL (build-time) — всегда побеждает. Так задаётся
//      реальный сервер для прода и для физического телефона (LAN-IP / домен).
//   2. Android-эмулятор → http://10.0.2.2:3001. `10.0.2.2` — это алиас loopback
//      хоста изнутри эмулятора (его `localhost` указывает на сам телефон).
//   3. Иначе (desktop / web) → http://localhost:3001.
//
// Детект платформы — синхронный по userAgent: модульные константы читаются при
// загрузке, а getPlatform() из host-слоя асинхронный. Для выбора хоста UA-проверки
// достаточно (Android System WebView всегда содержит "Android" в UA).
//
// ВНИМАНИЕ: 10.0.2.2 верен именно для ЭМУЛЯТОРА. На реальном устройстве адрес
// сервера задаётся через VITE_SPEEDY_URL при сборке APK.

function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function resolveSpeedyUrl(): string {
  const explicit = import.meta.env.VITE_SPEEDY_URL
  if (explicit) return explicit
  if (isAndroidWebView()) return 'http://10.0.2.2:3001'
  return 'http://localhost:3001'
}

/** HTTP-база backend'а, напр. `http://localhost:3001`. Без хвостового слэша. */
export const SPEEDY_URL = resolveSpeedyUrl()

/** Хост:порт для отображения в UI (экран входа). */
export function speedyHost(): string {
  try {
    return new URL(SPEEDY_URL).host
  } catch {
    return SPEEDY_URL
  }
}
