import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  isOwn: boolean
  canDelete: boolean
  editDisabled: boolean
  /** Не отображать «начать тред» — для DM-каналов и для самих тредов. */
  hideStartThread?: boolean
  onReply: () => void
  onStartThread?: () => void
  onEdit: () => void
  onDelete: () => void
  onCopyText: () => void
  onCopyLink: () => void
  onClose: () => void
}

const MENU_WIDTH = 172

function Item({
  onClick, danger, disabled, children,
}: {
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors
        ${disabled
          ? 'text-kd-text-mute cursor-not-allowed opacity-50'
          : danger
            ? 'text-kd-danger hover:bg-kd-danger/10'
            : 'text-kd-text hover:bg-kd-panel-alt'
        }`}
    >
      {children}
    </button>
  )
}

export function ContextMenu({
  x, y, isOwn, canDelete, editDisabled, hideStartThread,
  onReply, onStartThread, onEdit, onDelete, onCopyText, onCopyLink, onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Позиция после измерения реального размера меню: пока null — рендерим
  // невидимо в точке клика, после measure прижимаем к краям окна (а если
  // снизу не влезает — открываем вверх от курсора, как в Discord).
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))
    let ny = y
    if (y + rect.height > window.innerHeight - 8) {
      ny = Math.max(8, y - rect.height)
    }
    setPos({ x: nx, y: ny })
  }, [x, y])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-kd-panel border border-kd-border rounded-kd shadow-lg py-1 select-none"
      style={{
        left: pos?.x ?? x,
        top: pos?.y ?? y,
        minWidth: MENU_WIDTH,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <Item onClick={() => { onReply(); onClose() }}>↩ Ответить</Item>
      {!hideStartThread && onStartThread && (
        <Item onClick={() => { onStartThread(); onClose() }}>↳ Начать тред</Item>
      )}
      <Item onClick={() => { onCopyText(); onClose() }}>Копировать текст</Item>
      <Item onClick={() => { onCopyLink(); onClose() }}>Копировать ссылку</Item>
      {isOwn && (
        <Item
          onClick={() => { onEdit(); onClose() }}
          disabled={editDisabled}
        >
          {editDisabled ? 'Изменить (окно закрыто)' : 'Изменить'}
        </Item>
      )}
      {canDelete && (
        <>
          <div className="my-1 border-t border-kd-border" />
          <Item onClick={() => { onDelete(); onClose() }} danger>
            Удалить
          </Item>
        </>
      )}
    </div>
  )
}
