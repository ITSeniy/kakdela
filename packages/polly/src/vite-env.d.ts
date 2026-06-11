/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPEEDY_URL: string
  readonly VITE_SPEEDY_WS_URL: string
  readonly VITE_LIVEKIT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
