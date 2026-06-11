import { fileTypeFromBuffer } from 'file-type'

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'application/pdf',
  'text/plain',
  'application/zip',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

const ALLOWED_SET: ReadonlySet<string> = new Set(ALLOWED_MIME_TYPES)

export function isAllowedMime(mime: string): mime is AllowedMimeType {
  return ALLOWED_SET.has(mime)
}

export const EXTENSION_FOR_TYPE: Record<AllowedMimeType, string> = {
  'image/jpeg':       'jpg',
  'image/png':        'png',
  'image/webp':       'webp',
  'image/gif':        'gif',
  'video/mp4':        'mp4',
  'video/webm':       'webm',
  'audio/mpeg':       'mp3',
  'audio/ogg':        'ogg',
  'application/pdf':  'pdf',
  'text/plain':       'txt',
  'application/zip':  'zip',
}

// MIME types whose real bytes file-type can identify. text/plain has no
// magic bytes and must be checked separately (heuristic: ASCII/UTF-8 only).
const MAGIC_DETECTABLE: ReadonlySet<AllowedMimeType> = new Set<AllowedMimeType>([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/ogg',
  'application/pdf',
  'application/zip',
])

export type MagicCheck =
  | { ok: true; detectedMime: AllowedMimeType }
  | { ok: false; reason: 'mismatch' | 'unknown' | 'not-text'; detectedMime?: string }

/**
 * Sniff the real content type from the first few KB of the file and compare
 * with the declared MIME. We refuse to trust the client's contentType — that
 * value was set on presign time and could be a lie (e.g. an .exe declared as
 * image/png to slip past the whitelist).
 *
 * `file-type` reads magic bytes; ~64 KB is more than enough for every format
 * we accept (most need < 100 bytes). For text/plain we approximate by
 * rejecting anything that contains a NUL byte in the prefix.
 */
export async function checkMagicBytes(
  declared: AllowedMimeType,
  prefix: Uint8Array,
): Promise<MagicCheck> {
  if (declared === 'text/plain') {
    for (let i = 0; i < prefix.length; i += 1) {
      if (prefix[i] === 0) return { ok: false, reason: 'not-text' }
    }
    return { ok: true, detectedMime: 'text/plain' }
  }

  const detected = await fileTypeFromBuffer(prefix)
  if (!detected) {
    return MAGIC_DETECTABLE.has(declared)
      ? { ok: false, reason: 'unknown' }
      : { ok: true, detectedMime: declared }
  }

  // file-type returns `audio/mpeg` for mp3, but some versions return `audio/mp3`.
  // Normalize before comparing.
  const detectedMime = detected.mime === 'audio/mp3' ? 'audio/mpeg' : detected.mime

  if (detectedMime !== declared) {
    return { ok: false, reason: 'mismatch', detectedMime }
  }
  return { ok: true, detectedMime: declared as AllowedMimeType }
}
