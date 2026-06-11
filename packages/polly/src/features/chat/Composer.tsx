import React, { type ClipboardEvent, type DragEvent, type KeyboardEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react'

import type { Attachment, CustomEmoji, Message } from '@kakdela/ginzu/api-types'

import { Icon } from '../../components/Icon.js'
import {
  MAX_ATTACHMENT_SIZE,
  UploadError,
  isSupportedType,
  uploadAttachment,
} from '../files/upload.js'
import { Attachments, type PendingAttachment } from './Attachments.js'

const LazyEmojiPicker = React.lazy(() => import('./EmojiPicker.js'))

const MAX_ATTACHMENTS = 10

interface ComposerProps {
  channelName: string
  customEmoji?: ReadonlyArray<CustomEmoji>
  replyTo: Message | null
  replyAuthor: string | undefined
  onCancelReply: () => void
  onSend: (content: string, attachments: Attachment[]) => void
}

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function Composer({ channelName, customEmoji, replyTo, replyAuthor, onCancelReply, onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pickerContainerRef = useRef<HTMLDivElement>(null)
  const dragCounter = useRef(0)
  const attachmentsRef = useRef<PendingAttachment[]>([])
  attachmentsRef.current = attachments

  useEffect(() => {
    if (!pickerOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [pickerOpen])

  // Вставляем emoji-токен на позицию курсора (или в конец, если фокус
  // потерян). Native unicode emoji приходят как `😀`, custom — как `:name:`.
  function insertEmoji(token: string) {
    const ta = taRef.current
    if (!ta) {
      setText((prev) => prev + token)
      return
    }
    const start = ta.selectionStart ?? text.length
    const end = ta.selectionEnd ?? start
    const next = text.slice(0, start) + token + text.slice(end)
    setText(next)
    // Возвращаем фокус и курсор сразу после вставки.
    requestAnimationFrame(() => {
      ta.focus()
      const caret = start + token.length
      ta.setSelectionRange(caret, caret)
    })
  }

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  useEffect(() => {
    if (!warning) return
    const t = window.setTimeout(() => setWarning(null), 4000)
    return () => window.clearTimeout(t)
  }, [warning])

  function updateAttachment(localId: string, next: PendingAttachment) {
    setAttachments((arr) => arr.map((a) => (a.localId === localId ? next : a)))
  }

  const startUpload = useCallback((file: File) => {
    const localId = makeLocalId()
    const abort = new AbortController()
    const initial: PendingAttachment = { localId, file, status: 'uploading', pct: 0, abort }
    setAttachments((arr) => [...arr, initial])

    void (async () => {
      try {
        const attachment = await uploadAttachment(file, {
          signal: abort.signal,
          onProgress: (pct) => {
            const current = attachmentsRef.current.find((a) => a.localId === localId)
            if (current && current.status === 'uploading') {
              updateAttachment(localId, { ...current, pct })
            }
          },
        })
        const current = attachmentsRef.current.find((a) => a.localId === localId)
        if (!current) return // removed mid-flight
        updateAttachment(localId, { localId, file, status: 'ready', attachment })
      } catch (err) {
        if (err instanceof UploadError && err.code === 'aborted') return
        const message = err instanceof UploadError ? err.message : (err as Error).message || 'upload failed'
        const current = attachmentsRef.current.find((a) => a.localId === localId)
        if (!current) return
        updateAttachment(localId, { localId, file, status: 'error', message })
      }
    })()
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const slotsAvailable = MAX_ATTACHMENTS - attachmentsRef.current.length
    if (slotsAvailable <= 0) {
      setWarning(`можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`)
      return
    }
    let skipped = 0
    let added = 0
    for (const file of files) {
      if (added >= slotsAvailable) {
        skipped += 1
        continue
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setWarning(`«${file.name}» больше 25 МБ — не загружаем`)
        continue
      }
      if (!isSupportedType(file.type)) {
        setWarning(`«${file.name}» — неподдерживаемый формат`)
        continue
      }
      startUpload(file)
      added += 1
    }
    if (skipped > 0) {
      setWarning(`можно прикрепить не больше ${MAX_ATTACHMENTS} файлов, пропущено ${skipped}`)
    }
  }, [startUpload])

  function removeAttachment(localId: string) {
    const item = attachmentsRef.current.find((a) => a.localId === localId)
    if (item && item.status === 'uploading') item.abort.abort()
    setAttachments((arr) => arr.filter((a) => a.localId !== localId))
  }

  function pickFiles() {
    fileInputRef.current?.click()
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) addFiles(Array.from(files))
    e.target.value = ''
  }

  function handleDragEnter(e: DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    dragCounter.current += 1
    setIsDragOver(true)
  }
  function handleDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  function handleDragLeave() {
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setIsDragOver(false)
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length > 0) addFiles(files)
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData.items
    const files: File[] = []
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      if (!item) continue
      if (item.kind === 'file') {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      addFiles(files)
    }
  }

  function send() {
    const trimmed = text.trim()
    const ready: Attachment[] = attachments.flatMap((a) => (a.status === 'ready' ? [a.attachment] : []))
    const stillUploading = attachments.some((a) => a.status === 'uploading')
    if (stillUploading) return
    if (!trimmed && ready.length === 0) return
    onSend(trimmed, ready)
    setText('')
    setAttachments([])
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
    if (e.key === 'Escape' && replyTo) onCancelReply()
  }

  const placeholder = channelName ? `сообщение в #${channelName}…` : 'сообщение…'

  const hasUploading = attachments.some((a) => a.status === 'uploading')
  const hasReady = attachments.some((a) => a.status === 'ready')
  const sendDisabled = hasUploading || (!text.trim() && !hasReady)

  return (
    <div
      className="px-4 pb-3.5 pt-2 shrink-0 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-2 z-20 pointer-events-none rounded-kd border-2 border-dashed border-kd-accent bg-kd-accent-soft/60 flex items-center justify-center">
          <span className="text-[12px] font-bold text-kd-accent-deep font-mono">
            отпустите файл здесь
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-kd-panel rounded-kd border border-kd-border text-[11px]">
          <span className="text-kd-text-mute">↳ отвечаете на</span>
          <b className="text-kd-text font-mono">{replyAuthor ?? '???'}</b>
          <span className="text-kd-text-soft truncate flex-1">{replyTo.content}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-kd-text-mute hover:text-kd-danger px-1"
            title="отменить ответ (esc)"
          >
            <Icon.X size={12} />
          </button>
        </div>
      )}
      <Attachments items={attachments} onRemove={removeAttachment} />
      {warning && (
        <div className="mb-1.5 text-[10px] text-kd-danger font-mono">{warning}</div>
      )}
      <div className="bg-kd-panel rounded-kd border border-kd-border flex items-center gap-2.5 px-3 py-2">
        <button
          type="button"
          onClick={pickFiles}
          title="прикрепить файл"
          className="text-kd-text-mute hover:text-kd-text-soft transition-colors shrink-0"
        >
          <Icon.Plus size={15} />
        </button>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent resize-none text-[12px] text-kd-text outline-none placeholder:text-kd-text-mute leading-relaxed font-sans"
          style={{ maxHeight: 200 }}
        />
        <div className="flex items-center gap-2 text-kd-text-mute shrink-0">
          <span className="text-[10px] font-mono opacity-70 select-none">md</span>
          <div className="relative" ref={pickerContainerRef}>
            <button
              type="button"
              title="эмодзи"
              onClick={() => setPickerOpen((o) => !o)}
              className="hover:text-kd-text-soft transition-colors"
            >
              <Icon.Smile size={15} />
            </button>
            {pickerOpen && (
              <div className="absolute bottom-8 right-0 z-50 shadow-lg">
                <Suspense fallback={<div className="p-3 text-[11px] text-kd-text-mute bg-kd-panel rounded-kd border border-kd-border">…</div>}>
                  <LazyEmojiPicker
                    customEmoji={customEmoji}
                    onSelect={(token) => {
                      insertEmoji(token)
                      setPickerOpen(false)
                    }}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={sendDisabled}
          title={hasUploading ? 'ждём загрузку…' : undefined}
          className="px-2.5 py-1 bg-kd-accent text-white text-[11px] font-semibold font-mono rounded hover:bg-kd-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          send ⏎
        </button>
      </div>
      <div className="mt-1.5 px-1 text-[10px] text-kd-text-mute flex items-center gap-2.5">
        {/* Слева — место typing-индикатора; пока подсказка про перенос строки. */}
        <span>shift+⏎ — новая строка</span>
        <div className="flex-1" />
        <span className="font-mono">**жирный**  _курсив_  `код`</span>
      </div>
    </div>
  )
}
