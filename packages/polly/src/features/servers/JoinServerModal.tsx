import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { Modal, ModalHeader } from '../../components/Modal.js'
import { ApiError } from '../../lib/api.js'
import { lookupInvite, type InviteInfo } from '../auth/api.js'
import { acceptInvite } from './api.js'
import { useServerCreateJoinUi } from './store.js'

function inviteErrorText(code: string): string {
  if (code === 'invite-not-found')  return 'инвайт не найден'
  if (code === 'invite-expired')    return 'инвайт истёк'
  if (code === 'invite-exhausted')  return 'все места по этому инвайту заняты'
  return 'что-то пошло не так'
}

function normalize(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
}

export function JoinServerModal() {
  const view = useServerCreateJoinUi((s) => s.view)
  const initialInviteCode = useServerCreateJoinUi((s) => s.initialInviteCode)
  const close = useServerCreateJoinUi((s) => s.close)
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()

  const [code, setCode] = useState(initialInviteCode)
  const [preview, setPreview] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    if (view === 'join') {
      setCode(initialInviteCode)
      setPreview(null)
      setError(null)
    }
  }, [view, initialInviteCode])

  async function doLookup() {
    const norm = normalize(code)
    if (norm.length < 8) return
    setLookingUp(true)
    setError(null)
    try {
      const info = await lookupInvite(norm)
      setPreview(info)
    } catch (err) {
      setPreview(null)
      setError(err instanceof ApiError ? inviteErrorText(err.code) : 'что-то пошло не так')
    } finally {
      setLookingUp(false)
    }
  }

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvite(normalize(code)),
    onSuccess: ({ serverId }) => {
      void queryClient.invalidateQueries({ queryKey: ['servers'] })
      close()
      navigate(`/servers/${serverId}`)
    },
    onError: (err) => {
      setError(err instanceof ApiError ? inviteErrorText(err.code) : 'не удалось присоединиться')
    },
  })

  if (view !== 'join') return null

  const display = code.length > 4 ? code.slice(0, 4) + '-' + code.slice(4) : code

  return (
    <Modal onClose={close}>
      <ModalHeader title="принять инвайт" onClose={close} />

      <div className="px-5 py-5 flex flex-col gap-4 overflow-y-auto min-h-0">
        <div>
          <label className="block text-[10px] font-bold font-mono uppercase tracking-wider text-kd-text-mute mb-1.5">
            код
          </label>
          <input
            type="text"
            value={display}
            onChange={(e) => { setCode(normalize(e.target.value)); setPreview(null); setError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') void doLookup() }}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            className="w-full px-3 py-2 text-[18px] font-mono text-center rounded-kd bg-kd-bg border border-kd-border outline-none focus:border-kd-accent tracking-widest"
          />
          <div className="mt-1 text-[10px] text-kd-text-mute font-mono text-center">
            {normalize(code).length}/8
          </div>
        </div>

        {error && <div className="text-[11px] text-kd-danger font-mono">{error}</div>}

        {preview && (
          <div className="p-3 rounded-kd border border-kd-border bg-kd-panel-alt flex items-center gap-3">
            {preview.serverIcon ? (
              <img src={preview.serverIcon} alt={preview.serverName} className="w-12 h-12 rounded-kd object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-kd bg-kd-warm flex items-center justify-center text-white font-bold text-[13px]">
                {preview.serverName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-kd-text truncate">{preview.serverName}</div>
              {preview.expiresAt && (
                <div className="text-[10px] text-kd-text-mute font-mono mt-0.5">
                  до {new Date(preview.expiresAt).toLocaleDateString('ru')}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 rounded bg-kd-panel-alt border border-kd-border text-[11px] font-mono text-kd-text-soft hover:bg-kd-panel-hi"
          >
            отмена
          </button>
          {!preview ? (
            <button
              type="button"
              disabled={normalize(code).length < 8 || lookingUp}
              onClick={() => void doLookup()}
              className="px-3 py-1.5 rounded bg-kd-accent text-white text-[11px] font-bold font-mono hover:bg-kd-accent-deep disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lookingUp ? '…' : 'проверить'}
            </button>
          ) : (
            <button
              type="button"
              disabled={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate()}
              className="px-3 py-1.5 rounded bg-kd-accent text-white text-[11px] font-bold font-mono hover:bg-kd-accent-deep disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptMutation.isPending ? '…' : 'вступить ⏎'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
