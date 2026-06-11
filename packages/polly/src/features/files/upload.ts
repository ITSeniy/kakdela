import {
  MAX_ATTACHMENT_SIZE,
  PRESIGN_ALLOWED_CONTENT_TYPES,
  type Attachment,
  type FinalizeResponse,
  type PresignResponse,
} from '@kakdela/ginzu/api-types'

import { ApiError, apiFetch } from '../../lib/api.js'

export class UploadError extends Error {
  constructor(
    public readonly code:
      | 'presign-failed'
      | 'upload-failed'
      | 'finalize-failed'
      | 'unsupported-type'
      | 'too-large'
      | 'aborted',
    message: string,
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

const SUPPORTED_TYPES: ReadonlySet<string> = new Set(PRESIGN_ALLOWED_CONTENT_TYPES)

export function isSupportedType(mime: string): boolean {
  return SUPPORTED_TYPES.has(mime)
}

export { MAX_ATTACHMENT_SIZE }

// Normalize browser-supplied MIME quirks (Windows in particular reports
// `application/x-zip-compressed` for .zip and `audio/mp3` for .mp3).
const MIME_ALIASES: Record<string, string> = {
  'application/x-zip-compressed': 'application/zip',
  'application/x-zip':            'application/zip',
  'audio/mp3':                    'audio/mpeg',
  'audio/x-mpeg':                 'audio/mpeg',
  'audio/x-mpg':                  'audio/mpeg',
  'audio/x-mp3':                  'audio/mpeg',
}

function detectMime(file: File): string {
  const raw = file.type ? (MIME_ALIASES[file.type] ?? file.type) : ''
  if (raw) return raw
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'txt') return 'text/plain'
  if (ext === 'zip') return 'application/zip'
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'mp3') return 'audio/mpeg'
  if (ext === 'ogg') return 'audio/ogg'
  return ''
}

export interface UploadOptions {
  onProgress?: (pct: number) => void
  signal?: AbortSignal
}

async function putWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  { onProgress, signal }: UploadOptions,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new UploadError('upload-failed', `S3 PUT failed: ${xhr.status} ${xhr.statusText}`))
    }
    xhr.onerror = () => reject(new UploadError('upload-failed', 'network error during upload'))
    xhr.onabort = () => reject(new UploadError('aborted', 'upload aborted'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
      } else {
        signal.addEventListener('abort', () => xhr.abort(), { once: true })
      }
    }

    xhr.send(blob)
  })
}

/**
 * Полный двухфазный upload для T-063 attachments:
 *   1. POST /api/files/presign — создаёт DB-row 'pending', возвращает PUT URL
 *   2. PUT в MinIO (с прогрессом через XHR)
 *   3. POST /api/files/:id/finalize — сервер проверяет magic bytes,
 *      определяет dimensions, переключает в 'ready' и возвращает Attachment.
 */
export async function uploadAttachment(
  file: File,
  opts: UploadOptions = {},
): Promise<Attachment> {
  const contentType = detectMime(file)
  if (!isSupportedType(contentType)) {
    throw new UploadError('unsupported-type', `unsupported content type: ${contentType || '(unknown)'}`)
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new UploadError('too-large', `файл больше ${Math.round(MAX_ATTACHMENT_SIZE / 1024 / 1024)} МБ`)
  }

  let presign: PresignResponse
  try {
    presign = await apiFetch<PresignResponse>('/api/files/presign', {
      method: 'POST',
      body: JSON.stringify({
        contentType,
        size: file.size,
        originalName: file.name.slice(0, 255),
      }),
    })
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err)
    throw new UploadError('presign-failed', msg)
  }

  try {
    await putWithProgress(presign.uploadUrl, file, contentType, opts)
  } catch (err) {
    if (err instanceof UploadError) throw err
    throw new UploadError('upload-failed', err instanceof Error ? err.message : String(err))
  }

  let finalized: FinalizeResponse
  try {
    finalized = await apiFetch<FinalizeResponse>(`/api/files/${presign.fileId}/finalize`, {
      method: 'POST',
    })
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err)
    throw new UploadError('finalize-failed', msg)
  }

  return finalized.attachment
}

/**
 * Используется снапшотом screen-share (T-053): для него важен только
 * publicUrl, который потом вставляется в content сообщения. Двухфазный
 * flow с finalize не нужен — снапшот сразу attachable и не имеет
 * метаданных, а сам JPEG идёт прямо в чат как markdown image.
 */
export async function uploadBlob(blob: Blob): Promise<{ fileId: string; publicUrl: string }> {
  if (!SUPPORTED_TYPES.has(blob.type)) {
    throw new UploadError('unsupported-type', `unsupported content type: ${blob.type}`)
  }

  let presign: PresignResponse
  try {
    presign = await apiFetch<PresignResponse>('/api/files/presign', {
      method: 'POST',
      body: JSON.stringify({ contentType: blob.type, size: blob.size }),
    })
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : String(err)
    throw new UploadError('presign-failed', msg)
  }

  let res: Response
  try {
    res = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type },
    })
  } catch (err) {
    throw new UploadError('upload-failed', err instanceof Error ? err.message : String(err))
  }
  if (!res.ok) {
    throw new UploadError('upload-failed', `S3 PUT failed: ${res.status} ${res.statusText}`)
  }

  // Snapshot path — caller publishes publicUrl directly without finalize.
  // The finalize endpoint would still work, but T-053 messages embed the URL
  // as markdown image and don't need a structured attachment record yet.
  return { fileId: presign.fileId, publicUrl: presign.publicUrl }
}
