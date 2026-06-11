import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Modal, ModalHeader } from '../../components/Modal.js'
import { ApiError } from '../../lib/api.js'
import { createThread } from './api.js'
import { useThreadUi } from './store.js'

export function CreateThreadDialog() {
  const creatingFor = useThreadUi((s) => s.creatingFor)
  const cancelCreate = useThreadUi((s) => s.cancelCreate)
  const openPanel = useThreadUi((s) => s.open)
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!creatingFor) return
    setName('')
    setFirstMessage('')
    setError(null)
    // Через micro-defer, чтобы portal успел смонтироваться.
    queueMicrotask(() => nameRef.current?.focus())
  }, [creatingFor])

  if (!creatingFor) return null

  async function submit() {
    if (!creatingFor) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await createThread(creatingFor.channelId, creatingFor.messageId, {
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(firstMessage.trim() ? { firstMessage: firstMessage.trim() } : {}),
      })
      void queryClient.invalidateQueries({ queryKey: ['threads', creatingFor.channelId] })
      void queryClient.invalidateQueries({ queryKey: ['messages', creatingFor.channelId] })
      openPanel(res.thread.id, creatingFor.channelId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={cancelCreate} width={460}>
      <ModalHeader title="создать тред" onClose={cancelCreate} />
      <div className="p-5 overflow-y-auto">
        <div className="text-[11px] text-kd-text-mute font-mono mb-3 px-2 py-1.5 bg-kd-panel-alt border border-kd-border-soft rounded truncate">
          ↳ {creatingFor.preview || '(пустое сообщение)'}
        </div>

        <label className="block">
          <div className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider mb-1">название (необязательно)</div>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            placeholder="по умолчанию — первые 50 символов сообщения"
            maxLength={100}
            className="w-full px-3 py-1.5 rounded border border-kd-border bg-kd-panel-alt text-[13px] text-kd-text outline-none focus:border-kd-accent"
          />
        </label>

        <label className="block mt-3">
          <div className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider mb-1">первое сообщение (необязательно)</div>
          <textarea
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value.slice(0, 4000))}
            rows={3}
            placeholder="…можно открыть пустой тред и начать обсуждение там"
            className="w-full px-3 py-1.5 rounded border border-kd-border bg-kd-panel-alt text-[13px] text-kd-text outline-none focus:border-kd-accent resize-y font-sans"
          />
        </label>

        {error && (
          <div className="mt-2 px-3 py-2 rounded bg-kd-danger/10 text-kd-danger text-[11px] font-mono">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancelCreate}
            className="px-3 py-1.5 rounded border border-kd-border text-[11px] font-mono text-kd-text-soft hover:text-kd-text"
          >
            отмена
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="px-3 py-1.5 rounded bg-kd-accent text-white text-[11px] font-mono font-semibold hover:bg-kd-accent-deep disabled:opacity-50"
          >
            {submitting ? 'создаём…' : 'создать тред ⏎'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
