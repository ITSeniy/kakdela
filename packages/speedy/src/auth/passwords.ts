import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2'

// Argon2id is the default algorithm in @node-rs/argon2 — we don't pass
// `algorithm` here because it's a const enum and `isolatedModules` forbids
// reading those at runtime. The encoded hash starts with `$argon2id$`,
// which `verify()` parses to pick the correct variant.
const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export function hashPassword(password: string): Promise<string> {
  return argonHash(password, HASH_OPTIONS)
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argonVerify(hash, password)
}

// Pre-generated hash used to keep login timing constant when the email
// doesn't exist. Computed once at module init so /login spends the same
// argon2 budget regardless of which branch it takes.
const FAKE_PASSWORD = 'pad-against-timing-attacks-' + Math.random().toString(36)
let fakeHashPromise: Promise<string> | null = null

export function fakeHash(): Promise<string> {
  fakeHashPromise ??= argonHash(FAKE_PASSWORD, HASH_OPTIONS)
  return fakeHashPromise
}

export async function verifyAgainstFakeHash(password: string): Promise<false> {
  const h = await fakeHash()
  await argonVerify(h, password)
  return false
}
