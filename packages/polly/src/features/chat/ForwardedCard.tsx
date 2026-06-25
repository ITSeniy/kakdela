// Карточка пересланного сообщения: источник (автор · канал) + контент +
// вложения оригинала. Используется и в server-чате (Message), и в личке
// (DmBubble). Контент рендерится тем же markdown-пайплайном (эмодзи, спойлеры).

import { useMemo } from 'react'

import type { Channel, CustomEmoji, ForwardedRef, MemberPublic } from '@kakdela/ginzu/api-types'

import { AttachmentList } from './AttachmentView.js'
import { renderMarkdown } from './markdown.js'

interface ForwardedCardProps {
  fwd: ForwardedRef
  memberMap: ReadonlyMap<string, MemberPublic>
  channelMap: ReadonlyMap<string, Channel>
  emojiMap?: ReadonlyMap<string, CustomEmoji>
}

export function ForwardedCard({ fwd, memberMap, channelMap, emojiMap }: ForwardedCardProps) {
  const html = useMemo(
    () => renderMarkdown(fwd.content, { members: memberMap, channels: channelMap, emoji: emojiMap }),
    [fwd.content, memberMap, channelMap, emojiMap],
  )
  return (
    <div className="mt-0.5 border-l-2 border-kd-accent/40 pl-2.5 py-0.5 min-w-0">
      <div className="flex items-center gap-1 text-[10px] text-kd-text-mute font-mono mb-0.5">
        <span className="text-kd-accent">↪</span> переслано · {fwd.authorName} · {fwd.channelLabel}
      </div>
      {fwd.content && (
        <div className="kd-md text-[13px] text-kd-text leading-relaxed break-words min-w-0" dangerouslySetInnerHTML={{ __html: html }} />
      )}
      {fwd.attachments.length > 0 && <AttachmentList attachments={fwd.attachments} />}
    </div>
  )
}
