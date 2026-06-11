// Императивный API тостов: toast.error('…'), toast.info('…', { undo }).

import { useToastStore, type ToastKind } from './store.js'

export { Toaster } from './Toaster.js'

interface ToastOptions {
  /** Если задано — в тосте появляется кнопка «отменить». */
  undo?: () => void
  /** мс до автозакрытия (по умолчанию 4000; с undo — 6000). */
  duration?: number
}

function show(kind: ToastKind, message: string, opts?: ToastOptions): number {
  return useToastStore.getState().push({
    kind,
    message,
    action: opts?.undo ? { label: 'отменить', fn: opts.undo } : undefined,
    duration: opts?.duration ?? (opts?.undo ? 6000 : 4000),
  })
}

export const toast = {
  info: (message: string, opts?: ToastOptions) => show('info', message, opts),
  success: (message: string, opts?: ToastOptions) => show('success', message, opts),
  error: (message: string, opts?: ToastOptions) => show('error', message, opts),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
}
