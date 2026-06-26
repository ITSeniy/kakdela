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
  /** NSFW-канал: скрыть медиа за блюром до клика «показать». */
  blur?: boolean
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

/** Превью видео в стиле фото: первый кадр + ▶, клик открывает лайтбокс. */
function VideoThumb({
  attachment,
  onOpen,
}: {
  attachment: Attachment
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block rounded-kd overflow-hidden border border-kd-border bg-kd-stage"
      style={{ width: 400, maxWidth: '100%', aspectRatio: '16 / 9' }}
      title={attachment.originalName}
    >
      {/* preload=metadata рисует первый кадр без скачивания всего файла */}
      <video
        src={attachment.url}
        preload="metadata"
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-11 h-11 rounded-full bg-kd-overlay-strong text-kd-stage-text flex items-center justify-center text-[16px] pl-0.5">
          ▶
        </span>
      </span>
      <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded bg-kd-overlay-strong text-kd-stage-text text-[9px] font-mono">
        видео · {formatBytes(attachment.sizeBytes)}
      </span>
    </button>
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

export function AttachmentList({ attachments, lightboxContext, blur = false }: AttachmentListProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  // NSFW-канал: медиа скрыто за блюром до первого клика «показать».
  const [revealed, setRevealed] = useState(false)
  if (attachments.length === 0) return null

  // В лайтбокс идут и фото, и видео — единая лента просмотра.
  const media = attachments.filter((a) => a.kind === 'image' || a.kind === 'video')

  function openMedia(att: Attachment) {
    const idx = media.findIndex((a) => a.id === att.id)
    if (idx >= 0) setLightboxIdx(idx)
  }

  const hideBehindBlur = blur && !revealed

  return (
    <div className="mt-1.5 flex flex-col gap-1.5 items-start relative">
      <div className={hideBehindBlur ? 'flex flex-col gap-1.5 items-start blur-xl pointer-events-none select-none' : 'flex flex-col gap-1.5 items-start'}>
        {attachments.map((att) => {
          switch (att.kind) {
            case 'image':
              return <ImageThumb key={att.id} attachment={att} onOpen={() => openMedia(att)} />
            case 'video':
              return <VideoThumb key={att.id} attachment={att} onOpen={() => openMedia(att)} />
            case 'audio':
              return <AudioView key={att.id} attachment={att} />
            default:
              return <FileCard key={att.id} attachment={att} />
          }
        })}
      </div>
      {hideBehindBlur && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-kd bg-kd-overlay-soft text-center"
        >
          <span className="text-[13px]">🔞</span>
          <span className="text-[11px] font-mono text-kd-text font-semibold">NSFW · показать</span>
        </button>
      )}
      {lightboxIdx !== null && (
        <Lightbox
          images={media}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          context={lightboxContext}
        />
      )}
    </div>
  )
}
