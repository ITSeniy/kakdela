import { type ChangeEvent, type DragEvent, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  CUSTOM_EMOJI_ALLOWED_CONTENT_TYPES,
  CUSTOM_EMOJI_MAX_BYTES,
  CUSTOM_EMOJI_MAX_DIMENSION,
  type CustomEmoji,
} from '@kakdela/ginzu/api-types'

import { confirmDialog } from '../../components/ConfirmDialog.js'
import { Field } from '../../components/form/Field.js'
import { ApiError } from '../../lib/api.js'
import { createServerEmoji, deleteServerEmoji, fileToBase64, useServerEmoji } from '../emoji/api.js'

interface EmojiManagementProps {
  serverId: string
}

const ALLOWED: ReadonlySet<string> = new Set(CUSTOM_EMOJI_ALLOWED_CONTENT_TYPES)
const NAME_PATTERN = /^[a-z0-9_]{2,32}$/

function suggestNameFromFile(file: File): string {
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  return base.length >= 2 ? base : 'new_emoji'
}

export function EmojiManagement({ serverId }: EmojiManagementProps) {
  const queryClient = useQueryClient()
  const { emoji } = useServerEmoji(serverId)

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
      setError(`только PNG/GIF (получено ${f.type || 'unknown'})`)
      return
    }
    if (f.size > CUSTOM_EMOJI_MAX_BYTES) {
      setError(`больше ${CUSTOM_EMOJI_MAX_BYTES / 1024} КБ`)
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
      if (!NAME_PATTERN.test(name)) {
        throw new Error('имя: 2-32 символа, только a-z, 0-9, _')
      }
      const dataBase64 = await fileToBase64(file)
      const contentType = file.type === 'image/gif' ? 'image/gif' : 'image/png'
      return createServerEmoji(serverId, { name, contentType, dataBase64 })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['emoji', serverId] })
      resetForm()
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : (err as Error).message
      setError(msg || 'не удалось загрузить')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteServerEmoji(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['emoji', serverId] })
    },
  })

  async function onDelete(item: CustomEmoji) {
    const ok = await confirmDialog({
      title: `удалить :${item.name}:?`,
      confirmLabel: 'удалить',
      danger: true,
    })
    if (!ok) return
    deleteMutation.mutate(item.id)
  }

  const canSubmit = file !== null && NAME_PATTERN.test(name) && !createMutation.isPending

  return (
    <div className="flex flex-col gap-[18px]">
      <Field
        label="добавить эмодзи"
        hint={`PNG или GIF, до ${CUSTOM_EMOJI_MAX_BYTES / 1024} КБ, не больше ${CUSTOM_EMOJI_MAX_DIMENSION}×${CUSTOM_EMOJI_MAX_DIMENSION}.`}
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
              className="w-12 h-12 object-contain rounded bg-kd-bg border border-kd-border shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-kd-bg border border-kd-border flex items-center justify-center text-kd-text-mute font-mono text-[10px] shrink-0">
              —
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
              имя — :name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().slice(0, 32))}
              placeholder="party_parrot"
              className="bg-kd-bg border border-kd-border rounded-kd px-2.5 py-1.5 text-[12px] text-kd-text font-mono outline-none focus:border-kd-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/gif"
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

      <Field label={emoji.length === 0 ? 'пока ничего' : `всего · ${emoji.length}`}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
          {emoji.map((e) => (
            <div
              key={e.id}
              className="group relative aspect-square rounded-kd border border-kd-border bg-kd-panel-alt flex items-center justify-center"
              title={`:${e.name}:`}
            >
              <img src={e.imageUrl} alt={`:${e.name}:`} className="w-10 h-10 object-contain" draggable={false} />
              <div className="absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] font-mono text-kd-text-mute truncate text-center bg-kd-panel/80">
                :{e.name}:
              </div>
              <button
                type="button"
                onClick={() => onDelete(e)}
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
