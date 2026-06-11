export interface Secrets {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

// In web-only mode (pnpm dev:web): sessionStorage.
// In Tauri mode: stronghold will be wired in T-068; sessionStorage fallback for now
// (re-auth on cold start is handled via the httpOnly refresh-token cookie, not this store).
export const secrets: Secrets = {
  async get(key) {
    return sessionStorage.getItem(key)
  },
  async set(key, value) {
    sessionStorage.setItem(key, value)
  },
  async delete(key) {
    sessionStorage.removeItem(key)
  },
}
