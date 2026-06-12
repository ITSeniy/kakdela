import { useState } from 'react'

import type { Attachment } from '@kakdela/ginzu/api-types'

import { Icon } from '../../components/Icon.js'
import { openExternal } from '../../lib/host/shell.js'
import { Lightbox, type LightboxContext } from './Lightbox.js'
import { formatBytes } from './formatBytes.js'

interface AttachmentListProps {
  attachments: Attachment[]
  /** Контекст сообщения для шапки лайтбокса (автор, канал, дата, jump). */
  lightboxContext?: LightboxContext
}

/** EXT для плашки карточки файла: расширение из имени, максимум 4 символа. */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return 'FILE'
  return name.slice(dot + 1).toUpperCase().slice(0, 4) || 'FILE'
}

function ImageThumb({
  attachment,
  onOpen,
}: {
  attachment: Attachment
  onOpen: () => void
}) {
  // Целевой размер: длинная сторона ≤400, высота ≤300. Высоту НЕ фиксируем —
  // задаём aspect-ratio: когда maxWidth ужимает блок в узком чате, высота
  // следует за пропорцией и картинка не обрезается object-cover'ом.
  const maxW = 400
  const maxH = 300
  let w = attachment.width ?? maxW
  let h = attachment.height ?? maxH
  if (w > maxW) { h = h * (maxW / w); w = maxW }
  if (h > maxH) { w = w * (maxH / h); h = maxH }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block rounded-kd overflow-hidden border border-kd-border bg-kd-panel-alt"
      style={{ width: Math.round(w), maxWidth: '100%', aspectRatio: `${Math.round(w)} / ${Math.round(h)}` }}
      title={attachment.originalName}
    >
      <img
        src={attachment.thumbUrl ?? attachment.url}
        alt={attachment.originalName}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </button>
  )
}

function VideoView({ attachment }: { attachment: Attachment }) {
  return (
    <video
      controls
      preload="metadata"
      src={attachment.url}
      className="rounded-kd border border-kd-border bg-kd-stage"
      style={{ maxWidth: 600, maxHeight: 400 }}
    />
  )
}

function AudioView({ attachment }: { attachment: Attachment }) {
  return (
    <div className="px-3 py-2 bg-kd-panel-alt rounded-kd border border-kd-border" style={{ maxWidth: 420 }}>
      <div className="text-[11px] text-kd-text font-mono truncate mb-1">{attachment.originalName}</div>
      <audio controls preload="metadata" src={attachment.url} className="w-full" />
    </div>
  )
}

function FileCard({ attachment }: { attachment: Attachment }) {
  function download(e: React.MouseEvent) {
    e.preventDefault()
    void openExternal(attachment.url)
  }
  return (
    <div
      className="inline-flex items-center gap-2 p-2 max-w-[340px] rounded-kd border border-kd-border bg-kd-panel-alt"
      title={attachment.originalName}
    >
      <div className="w-8 h-8 shrink-0 rounded bg-kd-warm text-white text-[10px] font-bold font-mono flex items-center justify-center select-none">
        {extOf(attachment.originalName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-kd-text font-semibold truncate font-sans">{attachment.originalName}</div>
        <div className="text-[11px] text-kd-text-soft font-mono">{formatBytes(attachment.sizeBytes)}</div>
      </div>
      <a
        href={attachment.url}
        onClick={download}
        title="скачать"
        className="text-kd-text-mute hover:text-kd-text shrink-0 p-1"
      >
        <Icon.Download size={13} />
      </a>
    </div>
  )
}

export function AttachmentList({ attachments, lightboxContext }: AttachmentListProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (attachments.length === 0) return null

  const images = attachments.filter((a) => a.kind === 'image')

  function openImage(att: Attachment) {
    const idx = images.findIndex((a) => a.id === att.id)
    if (idx >= 0) setLightboxIdx(idx)
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1.5 items-start">
      {attachments.map((att) => {
        switch (att.kind) {
          case 'image':
            return <ImageThumb key={att.id} attachment={att} onOpen={() => openImage(att)} />
          case 'video':
            return <VideoView key={att.id} attachment={att} />
          case 'audio':
            return <AudioView key={att.id} attachment={att} />
          default:
            return <FileCard key={att.id} attachment={att} />
        }
      })}
      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          context={lightboxContext}
        />
      )}
    </div>
  )
}
