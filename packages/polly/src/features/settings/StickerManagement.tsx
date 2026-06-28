import { type ChangeEvent, type DragEvent, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  STICKER_ALLOWED_CONTENT_TYPES,
  STICKER_MAX_BYTES,
  STICKER_MAX_DIMENSION,
  type Sticker,
} from '@kakdela/ginzu/api-types'

import { confirmDialog } from '../../components/ConfirmDialog.js'
import { Field } from '../../components/form/Field.js'
import { ApiError } from '../../lib/api.js'
import { fileToBase64 } from '../emoji/api.js'
import { createServerSticker, deleteServerSticker, useServerStickers } from '../stickers/api.js'

interface StickerManagementProps {
  serverId: string
}

const ALLOWED: ReadonlySet<string> = new Set(STICKER_ALLOWED_CONTENT_TYPES)

function contentTypeOf(file: File): (typeof STICKER_ALLOWED_CONTENT_TYPES)[number] | null {
  if (file.type === 'image/gif') return 'image/gif'
  if (file.type === 'image/webp') return 'image/webp'
  if (file.type === 'image/png') return 'image/png'
  return null
}

function suggestNameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 40)
  return base.length >= 1 ? base : 'стикер'
}

export function StickerManagement({ serverId }: StickerManagementProps) {
  const queryClient = useQueryClient()
  const { stickers } = useServerStickers(serverId)

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setFile(null)
    setName('')
    setPreview(null)
    setError(null)
  }

  function acceptFile(f: File) {
    setError(null)
    if (!ALLOWED.has(f.type)) {
      setError(`только PNG/GIF/WebP (получено ${f.type || 'unknown'})`)
      return
    }
    if (f.size > STICKER_MAX_BYTES) {
      setError(`больше ${STICKER_MAX_BYTES / 1024} КБ`)
      return
    }
    setFile(f)
    setName((prev) => prev || suggestNameFromFile(f))
    setPreview(URL.createObjectURL(f))
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
    e.target.value = ''
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) acceptFile(f)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('файл не выбран')
      const contentType = contentTypeOf(file)
      if (!contentType) throw new Error('неподдерживаемый формат')
      const trimmed = name.trim()
      if (trimmed.length < 1 || trimmed.length > 40) throw new Error('имя: 1–40 символов')
      const dataBase64 = await fileToBase64(file)
      return createServerSticker(serverId, { name: trimmed, contentType, dataBase64 })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stickers', serverId] })
      resetForm()
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : (err as Error).message
      setError(msg || 'не удалось загрузить')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteServerSticker(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stickers', serverId] })
    },
  })

  async function onDelete(item: Sticker) {
    const ok = await confirmDialog({
      title: `удалить стикер «${item.name}»?`,
      confirmLabel: 'удалить',
      danger: true,
    })
    if (!ok) return
    deleteMutation.mutate(item.id)
  }

  const canSubmit = file !== null && name.trim().length >= 1 && !createMutation.isPending

  return (
    <div className="flex flex-col gap-[18px]">
      <Field
        label="добавить стикер"
        hint={`PNG, GIF или WebP, до ${STICKER_MAX_BYTES / 1024} КБ, не больше ${STICKER_MAX_DIMENSION}×${STICKER_MAX_DIMENSION}.`}
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            'border-2 border-dashed rounded-kd p-4 flex items-center gap-3 transition-colors',
            dragOver ? 'border-kd-accent bg-kd-accent-soft/40' : 'border-kd-border bg-kd-panel-alt',
          ].join(' ')}
        >
          {preview ? (
            <img
              src={preview}
              alt="preview"
              className="w-16 h-16 object-contain rounded bg-kd-bg border border-kd-border shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded bg-kd-bg border border-kd-border flex items-center justify-center text-kd-text-mute font-mono text-[10px] shrink-0">
              —
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
              имя стикера
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              placeholder="радостный кот"
              className="bg-kd-bg border border-kd-border rounded-kd px-2.5 py-1.5 text-[12px] text-kd-text outline-none focus:border-kd-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/gif,image/webp"
              className="hidden"
              onChange={onPickFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 rounded bg-kd-panel border border-kd-border text-[11px] font-mono text-kd-text hover:bg-kd-panel-hi"
            >
              выбрать…
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => createMutation.mutate()}
              className="px-3 py-1 rounded bg-kd-accent text-white text-[11px] font-bold font-mono hover:bg-kd-accent-deep disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? '…' : 'загрузить'}
            </button>
          </div>
        </div>
        {error && <div className="text-[11px] text-kd-danger font-mono mt-2">{error}</div>}
      </Field>

      <Field label={stickers.length === 0 ? 'пока ничего' : `всего · ${stickers.length}`}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
          {stickers.map((s) => (
            <div
              key={s.id}
              className="group relative rounded-kd border border-kd-border bg-kd-panel-alt overflow-hidden"
              title={s.name}
            >
              <div className="aspect-square flex items-center justify-center p-2">
                <img src={s.imageUrl} alt={s.name} className="max-w-full max-h-full object-contain" draggable={false} />
              </div>
              <div className="px-1 py-0.5 text-[9px] font-mono text-kd-text-mute truncate text-center border-t border-kd-border">
                {s.name}
              </div>
              <button
                type="button"
                onClick={() => onDelete(s)}
                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-kd-danger text-white text-[10px] font-bold transition-opacity"
                title="удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </Field>
    </div>
  )
}
