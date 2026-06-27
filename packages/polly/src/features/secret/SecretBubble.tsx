// T-103 — пузырь секретного сообщения. Геометрия как у KD_DMBubble
// (designs/final-dm.jsx): мои справа на kd-accent, чужие слева на kd-panel +
// border. Отличия секретного: микро-замочек и статус ✓/✓✓ (по read-конверту,
// T-102). Текст — локальный плейнтекст через общий markdown-пайплайн (markdown-it
// + DOMPurify), БЕЗ запроса OG-превью (приватность; превью тут просто не строим).

import { useMemo } from 'react'

import { Icon } from '../../components/Icon.js'
import { renderMarkdown } from '../chat/markdown.js'
import type { StoredSecretMessage } from '../../lib/host/secret-store.js'

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

export function SecretBubble({ message }: { message: StoredSecretMessage }) {
  const isOwn = message.direction === 'out'
  const html = useMemo(() => renderMarkdown(message.body), [message.body])

  return (
    <div className={`group flex items-end gap-2.5 px-5 py-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className={`max-w-[78%] flex flex-col min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={[
            'px-3 py-[7px] rounded-kd text-[13px] leading-[1.45] break-words max-w-full min-w-0',
            isOwn
              ? 'bg-kd-accent text-white kd-on-accent'
              : 'bg-kd-panel border border-kd-border text-kd-text',
          ].join(' ')}
        >
          <div className="kd-md" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <div className="flex items-center gap-1 mt-[3px] px-1 text-[10px] font-mono text-kd-text-mute">
          <Icon.Lock size={9} aria-label="секретное" />
          <span>{fmtTime(message.sentAtMs)}</span>
          {isOwn && (
            message.status === 'read' ? (
              <Icon.CheckCheck size={12} className="text-kd-accent" aria-label="прочитано" />
            ) : (
              <Icon.Check size={12} aria-label={message.status === 'sent' ? 'отправлено' : 'доставлено'} />
            )
          )}
        </div>
      </div>
    </div>
  )
}
