import React, { Suspense, useEffect, useRef, useState } from 'react'

import type { MemberPublic, ReactionAggregate } from '@kakdela/ginzu/api-types'

const LazyEmojiPicker = React.lazy(() => import('./EmojiPicker.js'))

interface ReactionsProps {
  messageId: string
  reactions: ReactionAggregate[]
  currentUserId: string | null
  memberMap: ReadonlyMap<string, MemberPublic>
  onAdd: (messageId: string, emoji: string) => void
  onRemove: (messageId: string, emoji: string) => void
}

export function Reactions({ messageId, reactions, currentUserId, memberMap, onAdd, onRemove }: ReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerContainerRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="mt-1 flex flex-wrap gap-1 items-center">
      {reactions.map((r) => {
        const mine = currentUserId !== null && r.users.includes(currentUserId)
        const names = r.users.map((uid) => memberMap.get(uid)?.displayName ?? '?').join(', ')
        return (
          <button
            key={r.emoji}
            type="button"
            title={names}
            onClick={() => mine ? onRemove(messageId, r.emoji) : onAdd(messageId, r.emoji)}
            className={`flex items-center gap-1 px-1.5 py-px rounded text-[11px] bg-kd-panel-alt border transition-colors ${
              mine
                ? 'border-kd-accent'
                : 'border-kd-border hover:border-kd-accent-soft'
            }`}
          >
            <span className="text-kd-text">{r.emoji}</span>
            <span className="font-mono text-[10px] text-kd-text-soft">{r.count}</span>
          </button>
        )
      })}

      <div className="relative" ref={pickerContainerRef}>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center px-1.5 py-px rounded text-[11px] border border-dashed border-kd-border text-kd-text-mute hover:border-kd-accent-soft hover:text-kd-text-soft"
          title="добавить реакцию"
        >
          +
        </button>

        {pickerOpen && (
          <div className="absolute bottom-8 left-0 z-50 shadow-lg">
            <Suspense fallback={<div className="p-3 text-[11px] text-kd-text-mute bg-kd-panel rounded-kd border border-kd-border">…</div>}>
              <LazyEmojiPicker
                onSelect={(emoji) => {
                  onAdd(messageId, emoji)
                  setPickerOpen(false)
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
