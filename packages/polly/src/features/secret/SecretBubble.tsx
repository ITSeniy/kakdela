// T-103 — пузырь секретного сообщения. Геометрия и стиль 1:1 с
// designs/final-secret-chat.jsx (SecretBubble): мои справа на kd-accent, чужие
// слева на kd-panel + border, аватар 26 у входящих, футер mono с замком и
// «✓✓ прочитано» (зелёным) для своих прочитанных. Текст — локальный плейнтекст
// через markdown-it + DOMPurify, БЕЗ OG-превью.

import { useMemo } from 'react'

import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'
import { renderMarkdown } from '../chat/markdown.js'
import type { StoredSecretMessage } from '../../lib/host/secret-store.js'

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

export function SecretBubble({
  message,
  peerName,
  peerAvatarUrl,
}: {
  message: StoredSecretMessage
  peerName: string
  peerAvatarUrl?: string | null
}) {
  const isOwn = message.direction === 'out'
  const html = useMemo(() => renderMarkdown(message.body), [message.body])

  return (
    <div className={`flex gap-2.5 px-4 py-1 items-end ${isOwn ? 'flex-row-reverse' : ''}`}>
      {isOwn ? (
        <div className="w-[26px] shrink-0" />
      ) : (
        <Avatar name={peerName} avatarUrl={peerAvatarUrl ?? null} size={26} />
      )}
      <div className={`max-w-[74%] flex flex-col min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={[
            'px-3 py-2 rounded-kd text-[14px] leading-[1.45] break-words max-w-full min-w-0',
            isOwn ? 'bg-kd-accent text-white kd-on-accent' : 'bg-kd-panel border border-kd-border text-kd-text',
          ].join(' ')}
        >
          <div className="kd-md" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <div className="flex items-center gap-1.5 mt-[3px] px-[3px] text-[10px] font-mono text-kd-text-mute">
          <Icon.Lock size={9} aria-label="секретное" />
          <span>{fmtTime(message.sentAtMs)}</span>
          {isOwn && message.status === 'read' && <span className="text-kd-online">✓✓ прочитано</span>}
        </div>
      </div>
    </div>
  )
}
