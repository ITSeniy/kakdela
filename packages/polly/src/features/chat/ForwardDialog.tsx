// Диалог пересыла: выбор канала/лички назначения + необязательная подпись.
// Источник назначений — те же queries, что и в командной палитре (серверы →
// текстовые каналы) плюс список DM. Никаких новых эндпоинтов на чтение.

import { useMemo, useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import { Icon } from '../../components/Icon.js'
import { Modal, ModalHeader } from '../../components/Modal.js'
import { toast } from '../../components/toast/index.js'
import { listDms } from '../dm/api.js'
import { getServerDetail, listServers } from '../servers/api.js'
import { forwardMessage } from './api.js'
import { useForwardUi } from './forwardStore.js'

interface Dest {
  channelId: string
  label: string
  hint: string
  kind: 'text' | 'dm'
}

export function ForwardDialog() {
  const message = useForwardUi((s) => s.message)
  const close = useForwardUi((s) => s.close)
  const queryClient = useQueryClient()

  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const open = message !== null

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: listServers,
    staleTime: 30_000,
    enabled: open,
  })
  const detailQueries = useQueries({
    queries: servers.map((s) => ({
      queryKey: ['server', s.id],
      queryFn: () => getServerDetail(s.id),
      staleTime: 30_000,
      enabled: open,
    })),
  })
  const { data: dms = [] } = useQuery({
    queryKey: ['dm-list'],
    queryFn: listDms,
    staleTime: 10_000,
    enabled: open,
  })

  const dests = useMemo<Dest[]>(() => {
    const out: Dest[] = []
    for (const dq of detailQueries) {
      const detail = dq.data
      if (!detail) continue
      for (const c of detail.channels) {
        if (c.kind !== 'text') continue
        out.push({ channelId: c.id, label: `#${c.name}`, hint: detail.server.name, kind: 'text' })
      }
    }
    for (const d of dms) {
      out.push({ channelId: d.channelId, label: d.otherUser.displayName, hint: 'личные', kind: 'dm' })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQueries.map((q) => q.dataUpdatedAt).join('|'), dms])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return dests
    return dests.filter((d) => d.label.toLowerCase().includes(q) || d.hint.toLowerCase().includes(q))
  }, [dests, query])

  if (!open || !message) return null

  function reset() {
    setQuery(''); setNote(''); setSelected(null); setSending(false)
  }

  async function submit() {
    if (!selected || !message) return
    setSending(true)
    try {
      await forwardMessage(message.id, { toChannelId: selected, ...(note.trim() ? { note: note.trim() } : {}) })
      const dest = dests.find((d) => d.channelId === selected)
      void queryClient.invalidateQueries({ queryKey: ['messages', selected] })
      if (dest?.kind === 'dm') void queryClient.invalidateQueries({ queryKey: ['dm-list'] })
      toast.success(`переслано в ${dest?.label ?? 'канал'}`)
      reset()
      close()
    } catch (err) {
      toast.error('не удалось переслать сообщение')
      console.error('[forward] failed', err)
      setSending(false)
    }
  }

  return (
    <Modal onClose={() => { reset(); close() }} width={440}>
      <ModalHeader title="переслать сообщение" onClose={() => { reset(); close() }} />
      <div className="flex flex-col min-h-0">
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-kd bg-kd-bg border border-kd-border">
            <Icon.Search size={13} className="text-kd-text-mute shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="куда переслать…"
              autoFocus
              className="flex-1 bg-transparent outline-none text-[13px] text-kd-text placeholder:text-kd-text-mute"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 max-h-[40vh] px-2 pb-1">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[11px] font-mono text-kd-text-mute">ничего не нашлось</div>
          )}
          {filtered.map((d) => {
            const active = d.channelId === selected
            return (
              <button
                key={d.channelId}
                type="button"
                onClick={() => setSelected(d.channelId)}
                className={[
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-kd text-left transition-colors',
                  active ? 'bg-kd-accent-bg border border-kd-accent' : 'border border-transparent hover:bg-kd-panel-hi',
                ].join(' ')}
              >
                <span className="w-[20px] text-center text-kd-text-mute shrink-0">
                  {d.kind === 'dm' ? <span className="text-[11px] font-mono">@</span> : <Icon.Hash size={12} />}
                </span>
                <span className="flex-1 min-w-0 truncate text-[12px] text-kd-text">{d.label}</span>
                <span className="text-[10px] font-mono text-kd-text-mute shrink-0">{d.hint}</span>
              </button>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-kd-border bg-kd-panel-alt shrink-0 flex flex-col gap-2.5">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            placeholder="добавить подпись (необязательно)"
            className="w-full px-3 py-2 rounded-kd bg-kd-bg border border-kd-border text-[12px] text-kd-text outline-none focus:border-kd-accent"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); close() }}
              className="px-4 py-1.5 rounded border border-kd-border text-[12px] font-mono text-kd-text-soft hover:text-kd-text"
            >
              отмена
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!selected || sending}
              className="px-4 py-1.5 rounded bg-kd-accent text-white text-[12px] font-mono font-bold hover:bg-kd-accent-deep disabled:opacity-50"
            >
              {sending ? 'пересылаем…' : 'переслать'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
