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

// Кнопки всплывашки форматирования (Discord-style). wrap — маркеры по краям
// выделения, block — префикс каждой выделенной строки.
const FORMAT_ACTIONS: Array<
  | { id: string; label: React.ReactNode; title: string; kind: 'wrap'; marker: string }
  | { id: string; label: React.ReactNode; title: string; kind: 'block'; prefix: string }
> = [
  { id: 'bold',    label: <b>B</b>,            title: 'жирный · **',        kind: 'wrap', marker: '**' },
  { id: 'italic',  label: <i>I</i>,            title: 'курсив · _',         kind: 'wrap', marker: '_' },
  { id: 'under',   label: <u>U</u>,            title: 'подчёркнутый · __',  kind: 'wrap', marker: '__' },
  { id: 'strike',  label: <s>S</s>,            title: 'зачёркнутый · ~~',   kind: 'wrap', marker: '~~' },
  { id: 'quote',   label: <span>“</span>,      title: 'цитата · >',         kind: 'block', prefix: '> ' },
  { id: 'code',    label: <span>&lt;&gt;</span>, title: 'код · `',          kind: 'wrap', marker: '`' },
  { id: 'spoiler', label: <span>◉</span>,      title: 'спойлер · ||',       kind: 'wrap', marker: '||' },
]

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
  // Всплывашка форматирования — пока в textarea есть выделение.
  const [hasSelection, setHasSelection] = useState(false)

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

  function syncSelection() {
    const ta = taRef.current
    if (!ta) return
    setHasSelection(ta.selectionStart !== ta.selectionEnd)
  }

  /** Обернуть выделение маркерами; повторное применение снимает их. */
  function applyWrap(marker: string) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end) return
    const selected = text.slice(start, end)
    const before = text.slice(0, start)
    const after = text.slice(end)

    const alreadyWrapped =
      before.endsWith(marker) && after.startsWith(marker)
    let next: string
    let selStart: number
    let selEnd: number
    if (alreadyWrapped) {
      next = before.slice(0, -marker.length) + selected + after.slice(marker.length)
      selStart = start - marker.length
      selEnd = end - marker.length
    } else if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
      const inner = selected.slice(marker.length, -marker.length)
      next = before + inner + after
      selStart = start
      selEnd = start + inner.length
    } else {
      next = before + marker + selected + marker + after
      selStart = start + marker.length
      selEnd = end + marker.length
    }
    setText(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(selStart, selEnd)
    })
  }

  /** Префикс каждой выделенной строки (цитата). */
  function applyBlock(prefix: string) {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end) return
    // Расширяем до границ строк, чтобы префикс встал в начале каждой.
    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEndRaw = text.indexOf('\n', end)
    const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw
    const block = text.slice(lineStart, lineEnd)
    const lines = block.split('\n')
    const allPrefixed = lines.every((l) => l.startsWith(prefix))
    const nextBlock = lines
      .map((l) => (allPrefixed ? l.slice(prefix.length) : prefix + l))
      .join('\n')
    const next = text.slice(0, lineStart) + nextBlock + text.slice(lineEnd)
    setText(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(lineStart, lineStart + nextBlock.length)
    })
  }

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
      <div className="bg-kd-panel rounded-kd border border-kd-border flex items-center gap-2.5 px-3 py-2 relative">
        {/* Всплывашка форматирования над полем — пока есть выделение.
            onMouseDown+preventDefault: клик не должен снимать выделение. */}
        {hasSelection && (
          <div
            className="absolute bottom-full left-2 mb-1.5 z-40 flex items-center gap-px bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal px-1 py-0.5 select-none"
            onMouseDown={(e) => e.preventDefault()}
          >
            {FORMAT_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.title}
                onClick={() => (a.kind === 'wrap' ? applyWrap(a.marker) : applyBlock(a.prefix))}
                className="w-7 h-7 rounded flex items-center justify-center text-[13px] text-kd-text-soft hover:text-kd-text hover:bg-kd-panel-hi transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
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
          onKeyUp={syncSelection}
          onPaste={handlePaste}
          onSelect={syncSelection}
          onMouseUp={syncSelection}
          onBlur={() => {
            // Микро-задержка: клик по кнопке всплывашки не должен убить её
            // раньше, чем сработает onClick (mousedown уже preventDefault'ится,
            // но blur по другим причинам — гасим выделение).
            setTimeout(syncSelection, 0)
          }}
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
        <span className="font-mono">**жирный** _курсив_ ~~зачёркнутый~~ `код` ||спойлер||</span>
      </div>
    </div>
  )
}
