import type { Attachment } from '@kakdela/ginzu/api-types'

export interface PendingMessage {
  id: string
  channelId: string
  authorId: string
  content: string
  replyToId: string | null
  createdAt: string
  editedAt: null
  attachments: Attachment[]
  _pending: 'sending' | 'error'
  _nonce: string
}
