// Модалка «создать канал» / «создать категорию» (открывается из меню шапки
// сервера). Категория в нашей схеме — строковая метка на канале, отдельной
// сущности нет, поэтому «создать категорию» = создать её первый канал.

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Icon } from '../../components/Icon.js'
import { Modal, ModalHeader } from '../../components/Modal.js'
import { ApiError } from '../../lib/api.js'
import { createChannel } from '../servers/api.js'

export type CreateChannelMode = 'channel' | 'category'

interface CreateChannelModalProps {
  serverId: string
  mode: CreateChannelMode
  /** Существующие категории — для селекта в режиме «канал». */
  categories: string[]
  onClose(): void
}

const KIND_OPTIONS = [
  { value: 'text', label: 'текстовый', hint: 'сообщения, треды, картинки' },
  { value: 'voice', label: 'голосовой', hint: 'голос и демо экрана' },
] as const

export function CreateChannelModal({ serverId, mode, categories, onClose }: CreateChannelModalProps) {
  const queryClient = useQueryClient()
  const [, navigate] = useLocation()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<'text' | 'voice'>('text')
  // mode=channel: выбранная существующая категория ('' = без категории).
  // mode=category: имя новой категории.
  const [category, setCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: () =>
      createChannel(serverId, {
        name: name.trim(),
        kind,
        ...(category.trim() ? { category: category.trim() } : {}),
      }),
    onSuccess: (channel) => {
      void queryClient.invalidateQueries({ queryKey: ['server', serverId] })
      onClose()
      navigate(`/servers/${serverId}/channels/${channel.id}`)
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : (err as Error).message)
    },
  })

  const canSubmit =
    name.trim().length >= 1
    && (mode !== 'category' || category.trim().length >= 1)
    && !createMutation.isPending

  function submit() {
    if (canSubmit) createMutation.mutate()
  }
  function onEnter(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title={mode === 'category' ? 'новая категория' : 'новый канал'}
        onClose={onClose}
      />

      <div className="px-5 py-5 flex flex-col gap-4 overflow-y-auto min-h-0">
        {mode === 'category' && (
          <>
            <div className="text-[11px] text-kd-text-soft leading-relaxed">
              категория появляется вместе со своим первым каналом — пустых
              категорий не бывает.
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
                название категории
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value.slice(0, 64))}
                onKeyDown={onEnter}
                placeholder="болтовня"
                autoFocus
                className="bg-kd-bg border border-kd-border rounded px-2 py-1.5 text-[13px] text-kd-text outline-none focus:border-kd-accent"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
            {mode === 'category' ? 'первый канал в ней' : 'имя канала'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 64))}
            onKeyDown={onEnter}
            placeholder={kind === 'voice' ? 'у костра' : 'общий'}
            autoFocus={mode === 'channel'}
            className="bg-kd-bg border border-kd-border rounded px-2 py-1.5 text-[13px] text-kd-text outline-none focus:border-kd-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
            тип канала
          </label>
          <div role="radiogroup" aria-label="тип канала" className="grid grid-cols-2 gap-2">
            {KIND_OPTIONS.map((opt) => {
              const active = opt.value === kind
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(opt.value)}
                  className={[
                    'px-3 py-2 rounded-kd border text-left transition-colors',
                    active
                      ? 'border-kd-accent bg-kd-accent text-white'
                      : 'border-kd-border bg-kd-panel text-kd-text hover:bg-kd-panel-hi',
                  ].join(' ')}
                >
                  <div className="text-[12px] font-semibold flex items-center gap-1.5">
                    {opt.value === 'voice' ? <Icon.Speaker size={11} /> : <Icon.Hash size={11} />}
                    {opt.label}
                  </div>
                  <div className={`text-[10px] font-mono ${active ? 'text-white/75' : 'text-kd-text-mute'}`}>
                    {opt.hint}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {mode === 'channel' && categories.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-kd-text-mute uppercase tracking-wider">
              категория
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-kd-bg border border-kd-border rounded px-2 py-1.5 text-[12px] text-kd-text outline-none focus:border-kd-accent"
            >
              <option value="">без категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {error && <div className="text-[11px] text-kd-danger font-mono">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-kd-panel-alt border border-kd-border text-[11px] font-mono text-kd-text-soft hover:bg-kd-panel-hi"
          >
            отмена
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="px-3 py-1.5 rounded bg-kd-accent text-white text-[11px] font-bold font-mono hover:bg-kd-accent-deep disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? '…' : 'создать ⏎'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
