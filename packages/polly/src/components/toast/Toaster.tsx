// Рендер стека тостов внизу по центру. Источник дизайна:
// designs/final-extras.jsx (FinalConnection → reconnect-toast).

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useToastStore, type ToastItem } from './store.js'

const KIND_DOT: Record<ToastItem['kind'], string> = {
  info: 'bg-kd-accent',
  success: 'bg-kd-online',
  error: 'bg-kd-danger',
}

function ToastRow({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), item.duration)
    return () => clearTimeout(t)
  }, [item.id, item.duration, dismiss])

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-kd-panel border border-kd-border rounded-kd shadow-kd-modal pointer-events-auto min-w-[260px] max-w-[420px]">
      <span className={`w-2 h-2 rounded-full shrink-0 ${KIND_DOT[item.kind]}`} />
      <div className="flex-1 min-w-0 text-[12px] text-kd-text leading-snug">{item.message}</div>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action!.fn()
            dismiss(item.id)
          }}
          className="shrink-0 px-2 py-1 rounded bg-kd-panel-alt border border-kd-border text-[10px] font-mono font-bold text-kd-accent-deep hover:bg-kd-panel-hi"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="shrink-0 text-kd-text-mute hover:text-kd-text text-[11px] font-mono px-1"
        aria-label="закрыть"
      >
        ✕
      </button>
    </div>
  )
}

export function Toaster() {
  const items = useToastStore((s) => s.items)
  if (items.length === 0) return null

  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {items.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  )
}
