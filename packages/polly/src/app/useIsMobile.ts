import { useEffect, useState } from 'react'

import { getPlatform, isMobilePlatform, type HostPlatform } from '../lib/host/platform.js'

// Ширина, ниже которой web-режим считается «телефоном». Позволяет тестировать
// мобильный shell через `pnpm dev:web`, просто сузив окно браузера.
const MOBILE_VIEWPORT_MAX = 600

function viewportIsPhone(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= MOBILE_VIEWPORT_MAX
}

/**
 * Решает, показывать ли мобильный shell (T-100).
 *
 * - Нативный мобильный таргет (android/ios) → всегда мобилка.
 * - Desktop-таргеты (windows/linux/macos) → всегда desktop, при любом размере
 *   окна (не хотим, чтобы узкое desktop-окно внезапно прыгало в мобильный UI).
 * - Web (`pnpm dev:web`) → по ширине вьюпорта, чтобы можно было разрабатывать
 *   и проверять мобильный layout без устройства.
 */
export function useIsMobile(): boolean {
  const [platform, setPlatform] = useState<HostPlatform | null>(null)
  const [phoneViewport, setPhoneViewport] = useState(viewportIsPhone)

  useEffect(() => {
    let cancelled = false
    void getPlatform().then((p) => {
      if (!cancelled) setPlatform(p)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function onResize() { setPhoneViewport(viewportIsPhone()) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (platform && isMobilePlatform(platform)) return true
  if (platform === null) return phoneViewport // до резолва платформы — по вьюпорту
  if (platform === 'web') return phoneViewport
  return false
}
