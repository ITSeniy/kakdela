import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Modal, ModalHeader } from '../../components/Modal.js'
import { ApiError } from '../../lib/api.js'
import { UploadError, isSupportedType, uploadAttachment } from '../files/upload.js'
import { createServer } from './api.js'
import { useServerCreateJoinUi } from './store.js'

export function CreateServerModal() {
  const view = useServerCreateJoinUi((s) => s.view)
  const close = useServerCreateJoinUi((s) => s.close)
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Сброс формы при открытии модалки.
  useEffect(() => {
    if (view === 'create') {
      setName(''); setIconUrl(null); setPreviewUrl(null); setError(null); setUploading(false)
    }
  }, [view])

  const createMutation = useMutation({
    mutationFn: () => createServer({ name: name.trim(), iconUrl: iconUrl ?? undefined }),
    onSuccess: (server) => {
      void queryClient.invalidateQueries({ queryKey: ['servers'] })
      close()
      navigate(`/servers/${server.id}`)
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : (err as Error).message)
    },
  })

  async function pickAndUpload(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('нужна картинка')
      return
    }
    if (!isSupportedType(file.type)) {
      setError(`формат ${file.type} не поддерживается`)
      return
    }
    setUploading(true)
    try {
      const att = await uploadAttachment(file)
      setIconUrl(att.url)
      setPreviewUrl(att.url)
    } catch (err) {
      const msg = err instanceof UploadError ? err.message : (err as Error).message
      setError(msg || 'не удалось загрузить иконку')
    } finally {
      setUploading(false)
    }
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) void pickAndUpload(f)
    e.target.value = ''
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void pickAndUpload(f)
  }

  if (view !== 'create') return null

  const canSubmit = name.trim().length >= 2 && !uploading && !createMutation.isPending

  return (
    <Modal onClose={close}>
      <ModalHeader title="новый сервер" onClose={close} />

      <div className="px-5 py-5 flex flex-col gap-4 overflow-y-auto min-h-0">
        <div className="text-[11px] text-kd-text-soft leading-relaxed">
          создаём отдельный сервер — со своими каналами, эмодзи и инвайтами.
          у других — никакого доступа, если не пригласишь.
        </div>

        <div className="flex gap-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={[
              'w-20 h-20 rounded-kd flex items-center justify-center cursor-pointer shrink-0 transition-colors',
              dragOver
                ? 'border-2 border-kd-accent bg-kd-accent-soft/40'
                : 'border-2 border-dashed border-kd-border bg-kd-panel-alt hover:border-kd-text-mute',
            ].join(' ')}
            title="перетащи или выбери иконку"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="иконка" className="w-full h-full object-cover rounded-kd" />
            ) : (
              <span className="text-[10px] font-mono text-kd-text-mute text-center px-1 leading-tight">
                {uploading ? '…' : 'иконка'}
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileInput}
          />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
              имя сервера
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 64))}
              placeholder="у камина"
              autoFocus
              className="bg-kd-bg border border-kd-border rounded px-2 py-1.5 text-[13px] text-kd-text outline-none focus:border-kd-accent"
            />
            <div className="text-[10px] font-mono text-kd-text-mute">
              {name.length}/64
            </div>
          </div>
        </div>

        {error && <div className="text-[11px] text-kd-danger font-mono">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 rounded bg-kd-panel-alt border border-kd-border text-[11px] font-mono text-kd-text-soft hover:bg-kd-panel-hi"
          >
            отмена
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
            className="px-3 py-1.5 rounded bg-kd-accent text-white text-[11px] font-bold font-mono hover:bg-kd-accent-deep disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? '…' : 'создать ⏎'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
