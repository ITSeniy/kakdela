import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri рекомендует строгий порт и отключение clear-screen.
// См. https://v2.tauri.app/start/frontend/vite/
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: {
      // Не следить за Rust-частью — Tauri сам её ребилдит
      ignored: ['**/src-tauri/**'],
    },
  },
})
