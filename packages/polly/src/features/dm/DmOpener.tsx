import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import { ApiError } from '../../lib/api.js'
import { openDmWithUser } from './api.js'

interface DmOpenerProps {
  userId: string
}

/**
 * Резолвит userId → DM-channelId через POST /api/dm/with/:userId и редиректит
 * на /dm/:channelId. URL `/dm/with/:userId` нужен для удобства deep-link'а из
 * других мест (карточка профиля, упоминание в чате) — пользователю не нужно
 * знать channelId, чтобы открыть переписку.
 */
export function DmOpener({ userId }: DmOpenerProps) {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const inFlightFor = useRef<string | null>(null)

  useEffect(() => {
    if (inFlightFor.current === userId) return
    inFlightFor.current = userId
    setError(null)
    void openDmWithUser(userId)
      .then((res) => {
        if (res.created) void queryClient.invalidateQueries({ queryKey: ['dm-list'] })
        navigate(`/dm/${res.channel.id}`, { replace: true })
      })
      .catch((err: unknown) => {
        const msg = err instanceof ApiError ? err.message : (err as Error).message
        setError(msg || 'не получилось открыть переписку')
      })
  }, [userId, navigate, queryClient])

  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-kd-bg text-kd-text-soft">
      {error ? (
        <>
          <div className="text-[12px] text-kd-danger font-mono font-bold mb-2">{error}</div>
          <button
            type="button"
            onClick={() => navigate('/dm')}
            className="text-[11px] font-mono text-kd-text-mute hover:text-kd-text-soft transition-colors"
          >
            ← к списку переписок
          </button>
        </>
      ) : (
        <span className="text-[11px] text-kd-text-mute font-mono">открываем переписку…</span>
      )}
    </div>
  )
}
