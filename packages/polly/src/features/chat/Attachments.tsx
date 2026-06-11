import { useEffect, useState } from 'react'

import type { Attachment } from '@kakdela/ginzu/api-types'

import { formatBytes } from './formatBytes.js'

export type PendingAttachment =
  | { localId: string; file: File; status: 'uploading'; pct: number; abort: AbortController }
  | { localId: string; file: File; status: 'ready'; attachment: Attachment }
  | { localId: string; file: File; status: 'error'; message: string }

interface AttachmentsProps {
  items: PendingAttachment[]
  onRemove: (localId: string) => void
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

function ThumbImage({ file }: { file: File }) {
  // URL создаём и отзываем строго в одном эффекте: связка useMemo + cleanup
  // ломалась под StrictMode (double-mount отзывал URL, memo не пересоздавал).
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  if (!objectUrl) return null
  return <img src={objectUrl} alt="" className="w-full h-full object-cover" />
}

function ThumbGeneric({ file }: { file: File }) {
  const ext = (file.name.split('.').pop() ?? '').toUpperCase().slice(0, 4) || '?'
  return (
    <div className="w-full h-full flex items-center justify-center bg-kd-panel-hi text-kd-text-mute font-mono text-[10px] font-bold">
      {ext}
    </div>
  )
}

export function Attachments({ items, onRemove }: AttachmentsProps) {
  if (items.length === 0) return null
  return (
    <div className="mb-2 px-3 py-2 bg-kd-panel rounded-kd border border-kd-border flex gap-2 overflow-x-auto">
      {items.map((item) => {
        const failed = item.status === 'error'
        const uploading = item.status === 'uploading'
        const pct = uploading ? item.pct : item.status === 'ready' ? 100 : 0
        return (
          <div
            key={item.localId}
            className="relative shrink-0 w-32 rounded-kd border border-kd-border bg-kd-panel-alt overflow-hidden"
            title={item.file.name}
          >
            <div className="relative aspect-square">
              {isImage(item.file) ? <ThumbImage file={item.file} /> : <ThumbGeneric file={item.file} />}
              <button
                type="button"
                onClick={() => onRemove(item.localId)}
                title={uploading ? 'отменить' : 'убрать'}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-kd-bg-deep/85 text-kd-text-soft hover:text-kd-danger flex items-center justify-center font-bold text-[12px] leading-none"
              >
                ×
              </button>
              {failed && (
                <div className="absolute inset-0 flex items-center justify-center bg-kd-danger/30 text-kd-danger font-mono text-[10px] font-bold">
                  ошибка
                </div>
              )}
            </div>
            <div className="px-1.5 py-1">
              <div className="text-[10px] text-kd-text truncate font-mono">{item.file.name}</div>
              <div className="text-[9px] text-kd-text-mute font-mono">{formatBytes(item.file.size)}</div>
              {(uploading || failed) && (
                <div className="mt-1 h-0.5 bg-kd-panel-hi rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${failed ? 'bg-kd-danger' : pct >= 100 ? 'bg-kd-accent' : 'bg-kd-warm'}`}
                    style={{ width: `${failed ? 100 : pct}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
