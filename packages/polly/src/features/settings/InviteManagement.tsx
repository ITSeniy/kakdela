// Инвайты сервера: link-row с кодом + copy, сегменты опций, список активных.
// Источник паттерна: designs/final-extras.jsx (FinalInvite).

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { InviteSummary } from '@kakdela/ginzu/api-types'

import { confirmDialog } from '../../components/ConfirmDialog.js'
import { Field } from '../../components/form/Field.js'
import { ApiError } from '../../lib/api.js'
import { createInvite, listInvites, revokeInvite } from '../servers/api.js'

interface InviteManagementProps {
  serverId: string
}

const EXPIRY_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: '1д',  days: 1 },
  { label: '7д',  days: 7 },
  { label: '30д', days: 30 },
  { label: '∞',   days: null },
]

const MAX_USES_PRESETS: Array<{ label: string; value: number | null }> = [
  { label: '1', value: 1 },
  { label: '5', value: 5 },
  { label: '∞', value: null },
]

function fmtDate(iso: string | null): string {
  if (!iso) return 'без срока'
  return new Date(iso).toLocaleString('ru', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function inviteStatus(inv: InviteSummary): 'active' | 'revoked' | 'expired' | 'exhausted' {
  if (inv.revoked) return 'revoked'
  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return 'expired'
  if (inv.maxUses !== null && inv.useCount >= inv.maxUses) return 'exhausted'
  return 'active'
}

const STATUS_LABEL: Record<ReturnType<typeof inviteStatus>, string> = {
  active:    'активен',
  revoked:   'отозван',
  expired:   'истёк',
  exhausted: 'исчерпан',
}

/** Mono-label опции в духе «— срок действия» (designs/final-extras.jsx). */
function OptionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-mono text-kd-text-mute tracking-[0.05em] mb-1.5">
      — {children}
    </div>
  )
}

export function InviteManagement({ serverId }: InviteManagementProps) {
  const queryClient = useQueryClient()
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['invites', serverId],
    queryFn:  () => listInvites(serverId),
    staleTime: 30_000,
  })

  const [expiresIn, setExpiresIn] = useState<number | null>(7)
  const [maxUses,   setMaxUses]   = useState<number | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [copied,    setCopied]    = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: () =>
      createInvite(serverId, {
        ...(expiresIn !== null ? { expiresInDays: expiresIn } : {}),
        ...(maxUses   !== null ? { maxUses } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invites', serverId] })
      setError(null)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : (err as Error).message),
  })

  const revokeMutation = useMutation({
    mutationFn: (code: string) => revokeInvite(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invites', serverId] })
    },
  })

  function copyUrl(url: string, code: string) {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(code)
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500)
    })
  }

  function askRevoke(code: string) {
    void confirmDialog({
      title: `отозвать инвайт ${code}?`,
      confirmLabel: 'отозвать',
      danger: true,
    }).then((ok) => {
      if (ok) revokeMutation.mutate(code)
    })
  }

  const activeInvites = invites.filter((inv) => inviteStatus(inv) === 'active')
  // Link-row показывает самый свежий активный инвайт (как в эталоне).
  const latest = [...activeInvites].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]

  return (
    <div className="flex flex-col gap-[18px]">
      <Field label="ссылка-приглашение" hint="код пускает на сервер — делись только со своими">
        {latest ? (
          <>
            <div className="flex gap-1.5">
              <div className="flex-1 min-w-0 px-3 py-[9px] bg-kd-bg border border-kd-border rounded font-mono text-[12px] flex items-center gap-1">
                <span className="text-kd-accent font-bold tracking-widest truncate">{latest.code}</span>
                <span className="flex-1" />
                <span className="text-[9px] text-kd-text-mute shrink-0">
                  {latest.maxUses !== null ? `${latest.useCount} / ${latest.maxUses}` : `${latest.useCount} / ∞`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyUrl(latest.url, latest.code)}
                title={latest.url}
                className="px-3.5 py-[9px] rounded bg-kd-accent text-white text-[11px] font-mono font-bold hover:bg-kd-accent-deep shrink-0"
              >
                ⧉ копировать
              </button>
            </div>
            <div className={`text-[10px] font-mono mt-1.5 ${copied === latest.code ? 'text-kd-accent' : 'text-kd-text-mute'}`}>
              {copied === latest.code ? '✓ скопировано · ' : ''}действует до {fmtDate(latest.expiresAt)}
            </div>
          </>
        ) : (
          <div className="px-3 py-[9px] bg-kd-bg border border-dashed border-kd-border rounded font-mono text-[11px] text-kd-text-mute">
            активных инвайтов нет — создай ниже
          </div>
        )}
      </Field>

      <Field label="новый инвайт">
        <div className="grid grid-cols-2 gap-3.5 mb-2.5">
          <div>
            <OptionLabel>срок действия</OptionLabel>
            <div className="flex bg-kd-bg border border-kd-border rounded p-0.5">
              {EXPIRY_PRESETS.map((p) => (
                <button
                  key={String(p.days)}
                  type="button"
                  onClick={() => setExpiresIn(p.days)}
                  className={[
                    'flex-1 px-1 py-[5px] text-[10px] font-mono rounded-[3px] text-center transition-colors',
                    expiresIn === p.days
                      ? 'bg-kd-accent text-white font-bold'
                      : 'text-kd-text-soft font-medium hover:text-kd-text',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <OptionLabel>макс. применений</OptionLabel>
            <div className="flex bg-kd-bg border border-kd-border rounded p-0.5">
              {MAX_USES_PRESETS.map((p) => (
                <button
                  key={String(p.value)}
                  type="button"
                  onClick={() => setMaxUses(p.value)}
                  className={[
                    'flex-1 px-1 py-[5px] text-[10px] font-mono rounded-[3px] text-center transition-colors',
                    maxUses === p.value
                      ? 'bg-kd-accent text-white font-bold'
                      : 'text-kd-text-soft font-medium hover:text-kd-text',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-kd-danger font-mono flex-1 min-w-0">{error}</div>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="px-3.5 py-1.5 rounded bg-kd-accent text-white text-[11px] font-bold font-mono hover:bg-kd-accent-deep disabled:opacity-50 shrink-0"
          >
            {createMutation.isPending ? '…' : 'создать инвайт'}
          </button>
        </div>
      </Field>

      <Field
        label={invites.length === 0
          ? 'пока ничего'
          : `активные приглашения · ${activeInvites.length}`}
      >
        {isLoading && (
          <div className="text-center text-kd-text-mute font-mono text-[11px] py-4">загружаем…</div>
        )}
        <ul>
          {invites.map((inv, i) => {
            const st = inviteStatus(inv)
            const usesLabel = inv.maxUses !== null
              ? `${inv.useCount}/${inv.maxUses}`
              : `${inv.useCount}/∞`
            const dim = st !== 'active'
            return (
              <li
                key={inv.code}
                className={[
                  'flex items-center gap-2.5 py-1.5',
                  i < invites.length - 1 ? 'border-b border-kd-border-soft' : '',
                  dim ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span className={`text-[11px] font-mono font-bold shrink-0 ${dim ? 'text-kd-text-mute' : 'text-kd-accent'}`}>
                  /{inv.code}
                </span>
                <span className="text-[10px] text-kd-text-soft shrink-0">{STATUS_LABEL[st]}</span>
                <span className="flex-1" />
                <span className="text-[10px] font-mono text-kd-text-mute shrink-0">{usesLabel}</span>
                <span className="text-[10px] font-mono text-kd-text-mute shrink-0">· до {fmtDate(inv.expiresAt)}</span>
                {st === 'active' && (
                  <>
                    <button
                      type="button"
                      onClick={() => copyUrl(inv.url, inv.code)}
                      title={inv.url}
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono text-kd-text-soft hover:text-kd-text hover:bg-kd-panel-hi shrink-0"
                    >
                      {copied === inv.code ? '✓' : '⧉'}
                    </button>
                    <button
                      type="button"
                      onClick={() => askRevoke(inv.code)}
                      disabled={revokeMutation.isPending}
                      title="отозвать"
                      className="px-1.5 py-0.5 rounded text-[13px] font-mono text-kd-text-mute hover:text-kd-danger disabled:opacity-50 shrink-0"
                    >
                      ×
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </Field>
    </div>
  )
}
