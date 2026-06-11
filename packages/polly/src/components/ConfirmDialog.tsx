// Замена window.confirm: императивный confirmDialog(...) → Promise<boolean>.
// Хост рендерится один раз в App. Дизайн — обычная узкая модалка на Modal.

import { useEffect, useState } from 'react'
import { create } from 'zustand'

import { Modal, ModalHeader } from './Modal.js'

interface ConfirmRequest {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Для необратимых действий: подтверждение активно только после
      точного ввода этой строки (паттерн «напиши имя сервера»). */
  requireText?: string
  resolve(ok: boolean): void
}

interface ConfirmState {
  current: ConfirmRequest | null
  open(req: ConfirmRequest): void
  settle(ok: boolean): void
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  open(req) {
    // Параллельный запрос — прежний отклоняем, новый показываем.
    get().current?.resolve(false)
    set({ current: req })
  },
  settle(ok) {
    get().current?.resolve(ok)
    set({ current: null })
  },
}))

export function confirmDialog(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().open({ ...opts, resolve })
  })
}

export function ConfirmDialogHost() {
  const current = useConfirmStore((s) => s.current)
  const settle = useConfirmStore((s) => s.settle)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    setTyped('')
  }, [current])

  if (!current) return null

  const confirmable = !current.requireText || typed.trim() === current.requireText

  return (
    <Modal onClose={() => settle(false)} width={380}>
      <ModalHeader title={current.title} onClose={() => settle(false)} />
      <div className="px-5 py-4 flex flex-col gap-4">
        {current.body && (
          <div className="text-[12px] text-kd-text-soft leading-relaxed">{current.body}</div>
        )}
        {current.requireText && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
              введи «{current.requireText}» для подтверждения
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="bg-kd-bg border border-kd-border rounded px-2 py-1.5 text-[13px] text-kd-text outline-none focus:border-kd-danger font-mono"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => settle(false)}
            autoFocus={!current.danger && !current.requireText}
            className="px-3 py-1.5 rounded bg-kd-panel-alt border border-kd-border text-[11px] font-mono text-kd-text-soft hover:bg-kd-panel-hi"
          >
            {current.cancelLabel ?? 'отмена'}
          </button>
          <button
            type="button"
            onClick={() => settle(true)}
            disabled={!confirmable}
            autoFocus={current.danger && !current.requireText}
            className={[
              'px-3 py-1.5 rounded text-[11px] font-bold font-mono text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              current.danger
                ? 'bg-kd-danger hover:opacity-90'
                : 'bg-kd-accent hover:bg-kd-accent-deep',
            ].join(' ')}
          >
            {current.confirmLabel ?? 'ок ⏎'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
