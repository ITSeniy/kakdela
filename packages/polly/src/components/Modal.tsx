// Единая модалка: оверлей + панель. Источник паттерна: designs/final-extras.jsx
// (FinalInvite), final-profile.jsx. Все модалки приложения строятся на ней.

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  onClose(): void
  children: React.ReactNode
  /** Ширина панели, px. По умолчанию 420 (узкие формы). */
  width?: number
  /** Доп. классы панели (например, h-[580px] для настроек канала). */
  className?: string
  /** Закрывать по клику на фон (по умолчанию true). */
  closeOnBackdrop?: boolean
}

export function Modal({ onClose, children, width = 420, className, closeOnBackdrop = true }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Capture + stopPropagation: Esc закрывает только модалку, не доходя
        // до лежащих под ней слоёв (полноэкранные настройки, меню).
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prev
    }
  }, [onClose])

  function onBackdrop(e: React.MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-40 bg-kd-overlay-soft backdrop-blur-[2px] flex items-center justify-center"
      onClick={onBackdrop}
    >
      <div
        className={[
          'relative max-w-[92vw] max-h-[88vh] bg-kd-panel rounded-[10px] border border-kd-border',
          'shadow-kd-modal overflow-hidden flex flex-col',
          className ?? '',
        ].join(' ')}
        style={{ width }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

interface ModalHeaderProps {
  title: React.ReactNode
  onClose(): void
  /** Слева от заголовка (иконка сервера/канала). */
  leading?: React.ReactNode
}

export function ModalHeader({ title, onClose, leading }: ModalHeaderProps) {
  return (
    <div className="px-5 py-3 border-b border-kd-border bg-kd-panel-alt flex items-center gap-2.5 shrink-0">
      {leading}
      <div className="text-[13px] font-bold text-kd-text flex-1 min-w-0 truncate">{title}</div>
      <button
        type="button"
        onClick={onClose}
        className="px-2.5 py-1 rounded bg-kd-bg/60 hover:bg-kd-bg text-kd-text-soft text-[10px] font-mono shrink-0"
      >
        esc ✕
      </button>
    </div>
  )
}
