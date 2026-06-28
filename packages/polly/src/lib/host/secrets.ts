// Persistent, encrypted-at-rest хранилище мелких секретов (access-токен; позже —
// прикладные мелочи). Бэкенд по умолчанию: non-extractable AES-GCM ключ, лежащий
// в IndexedDB — его сырые байты JS прочитать НЕ может (ими владеет crypto.subtle),
// и им шифруется каждое значение. Переживает холодный старт; на диске — только
// шифртекст.
//
// Это СОФТВАРНОЕ шифрование. Аппаратное запечатывание ключа придёт отдельно:
//   • desktop  — OS keychain через tauri-plugin-stronghold (T-068);
//   • Android  — Android Keystore через крипто-стор libsignal (T-101). Когда тот
//     нативный мост появится, это хранилище будет делегировать ему.
// Если IndexedDB/WebCrypto недоступны (нестрогий контекст, web-dev) — fallback на
// sessionStorage, чтобы код не падал. localStorage не используем (CONVENTIONS).

export interface Secrets {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

const DB_NAME = 'kd-secure'
const DB_VERSION = 1
const STORE_KEYS = 'meta'   // держит CryptoKey под id 'aesKey'
const STORE_VAULT = 'vault' // держит { iv, ct } под именем секрета
const AES_KEY_ID = 'aesKey'

function cryptoAvailable(): boolean {
  return (
    typeof indexedDB !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  )
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_KEYS)) db.createObjectStore(STORE_KEYS)
      if (!db.objectStoreNames.contains(STORE_VAULT)) db.createObjectStore(STORE_VAULT)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Достаём (или единожды создаём) non-extractable AES-GCM ключ. Хранится прямо в
// IndexedDB как CryptoKey — structured clone это умеет, и ключ остаётся
// non-extractable после восстановления.
let keyPromise: Promise<CryptoKey> | null = null
function getAesKey(db: IDBDatabase): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const existing = await idbGet<CryptoKey>(db, STORE_KEYS, AES_KEY_ID)
      if (existing) return existing
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false, // extractable = false: сырые байты ключа недоступны из JS
        ['encrypt', 'decrypt'],
      )
      await idbPut(db, STORE_KEYS, AES_KEY_ID, key)
      return key
    })().catch((err) => {
      keyPromise = null
      throw err
    })
  }
  return keyPromise
}

interface VaultRecord {
  iv: ArrayBuffer
  ct: ArrayBuffer
}

const enc = new TextEncoder()
const dec = new TextDecoder()

const cryptoSecrets: Secrets = {
  async get(key) {
    const db = await openDb()
    const rec = await idbGet<VaultRecord>(db, STORE_VAULT, key)
    if (!rec) return null
    const aesKey = await getAesKey(db)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, aesKey, rec.ct)
    return dec.decode(plain)
  },
  async set(key, value) {
    const db = await openDb()
    const aesKey = await getAesKey(db)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(value))
    await idbPut(db, STORE_VAULT, key, { iv: iv.buffer, ct } satisfies VaultRecord)
  },
  async delete(key) {
    const db = await openDb()
    await idbDelete(db, STORE_VAULT, key)
  },
}

// Fallback для окружений без WebCrypto/IndexedDB (web-dev в нестрогом контексте).
const sessionSecrets: Secrets = {
  async get(key) { return sessionStorage.getItem(key) },
  async set(key, value) { sessionStorage.setItem(key, value) },
  async delete(key) { sessionStorage.removeItem(key) },
}

// Обёртка: пробуем зашифрованный стор, при любой ошибке откатываемся на
// sessionStorage — чтобы auth не падал из-за частных причуд WebView/приватного
// режима. Решение «какой бэкенд» принимается лениво и кешируется.
function makeSecrets(): Secrets {
  if (!cryptoAvailable()) return sessionSecrets
  const primary = cryptoSecrets
  return {
    async get(key) {
      try { return await primary.get(key) } catch { return sessionSecrets.get(key) }
    },
    async set(key, value) {
      try { await primary.set(key, value) } catch { await sessionSecrets.set(key, value) }
    },
    async delete(key) {
      try { await primary.delete(key) } catch { await sessionSecrets.delete(key) }
      // Чистим и fallback на всякий случай — секрет не должен «протекать» мимо.
      try { await sessionSecrets.delete(key) } catch { /* ignore */ }
    },
  }
}

export const secrets: Secrets = makeSecrets()
