import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { wsClient } from '../../lib/ws.js'
import { listThreads } from './api.js'
import { useThreadUi } from './store.js'

interface ThreadListProps {
  channelId: string
  /** Show even when there are no active threads (no-op when empty). */
  alwaysVisible?: boolean
}

function BranchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={10} height={10}>
      <path d="M6 3v12" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

export function ThreadList({ channelId, alwaysVisible = false }: ThreadListProps) {
  const [expanded, setExpanded] = useState(true)
  const queryClient = useQueryClient()
  const openThread = useThreadUi((s) => s.open)
  const activeThreadId = useThreadUi((s) => s.openThreadId)

  const { data: threads = [] } = useQuery({
    queryKey: ['threads', channelId],
    queryFn: () => listThreads(channelId, false),
    staleTime: 30_000,
  })

  // Авто-инвалидация при thread.new / thread.archive / msg.new в тредах.
  useEffect(() => {
    return wsClient.on((event) => {
      if (event.t === 'thread.new' && event.parentChannelId === channelId) {
        void queryClient.invalidateQueries({ queryKey: ['threads', channelId] })
      }
      if (event.t === 'thread.archive' && event.parentChannelId === channelId) {
        void queryClient.invalidateQueries({ queryKey: ['threads', channelId] })
      }
    })
  }, [channelId, queryClient])

  if (threads.length === 0 && !alwaysVisible) return null

  return (
    <div className="ml-3 my-1 border-l border-kd-border pl-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-mono font-bold text-kd-text-mute hover:text-kd-text-soft transition-colors uppercase tracking-[0.04em]"
      >
        <span>{expanded ? '⌄' : '›'} треды</span>
        <span className="text-kd-text-soft">{threads.length}</span>
      </button>
      {expanded && threads.map((t) => {
        const isActive = activeThreadId === t.channel.id
        return (
          <button
            key={t.channel.id}
            type="button"
            onClick={() => openThread(t.channel.id, channelId)}
            className={[
              'w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-left transition-colors text-[11px]',
              isActive
                ? 'bg-kd-panel-hi text-kd-text font-semibold'
                : 'text-kd-text-soft hover:text-kd-text',
            ].join(' ')}
            title={`${t.messageCount} сообщ.`}
          >
            <BranchIcon />
            <span className="flex-1 truncate">{t.channel.name}</span>
            {t.messageCount > 0 && (
              <span className="text-[9px] font-mono text-kd-text-mute">{t.messageCount}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
