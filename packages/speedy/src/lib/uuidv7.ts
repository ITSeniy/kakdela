import { randomBytes } from 'node:crypto'

export function uuidv7(): string {
  const ms = Date.now()
  const buf = randomBytes(16)
  buf.writeUIntBE(ms, 0, 6)      // 48-bit unix_ts_ms in first 6 bytes
  buf[6] = (buf[6]! & 0x0f) | 0x70  // version 7
  buf[8] = (buf[8]! & 0x3f) | 0x80  // variant 10xx
  const h = buf.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
