import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  EditMessageRequestSchema,
  ErrorBodySchema,
  MessageSchema,
  MessagesPageSchema,
  SendMessageRequestSchema,
  type Attachment,
  type ReactionAggregate,
  type ReplyRef,
  type ThreadInfo,
} from '@kakdela/ginzu/api-types'

import { channels, dmChannels, mentions as mentionsTable, messages, reactions as reactionsTable, serverMembers, users } from '../db/schema.js'
import { db } from '../lib/db.js'
import { extractMentions, type MentionCandidate, type ParsedMention } from '../lib/mention-extractor.js'
import { assertCanAccessChannel, assertRole, notFound } from '../lib/permissions.js'
import { presence } from '../presence/store.js'
import { attachFilesToMessage, loadAttachmentsForMessages } from './files.js'
import { broadcastToChannel, broadcastToUser } from '../ws/broadcast.js'

const EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

const MSG_COLS = {
  id:          messages.id,
  channelId:   messages.channelId,
  authorId:    messages.authorId,
  content:     messages.content,
  replyToId:   messages.replyToId,
  createdAt:   messages.createdAt,
  editedAt:    messages.editedAt,
}

async function resolveReplies(ids: string[]): Promise<Map<string, ReplyRef>> {
  const map = new Map<string, ReplyRef>()
  if (ids.length === 0) return map
  const rows = await db
    .select({
      id:          messages.id,
      displayName: users.displayName,
      content:     messages.content,
      deletedAt:   messages.deletedAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.authorId, users.id))
    .where(inArray(messages.id, ids))
  for (const r of rows) {
    map.set(r.id, r.deletedAt !== null
      ? { id: r.id, deleted: true }
      : { id: r.id, deleted: false, authorName: r.displayName, content: r.content },
    )
  }
  return map
}

interface MentionContext {
  candidates: MentionCandidate[]
  allowBroadcast: boolean
  onlineIds: string[]
}

/**
 * Собирает контекст для `extractMentions`: кто может быть упомянут (server
 * members / DM-участники), разрешён ли @everyone / @here (только owner/admin
 * сервера), и кто сейчас онлайн (для @here).
 */
async function buildMentionContext(
  authorId: string,
  channelId: string,
): Promise<MentionContext> {
  const chRows = await db
    .select({ serverId: channels.serverId, kind: channels.kind })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
  const ch = chRows[0]
  if (!ch) return { candidates: [], allowBroadcast: false, onlineIds: [] }

  if (ch.kind === 'dm') {
    const dmRows = await db
      .select({ userAId: dmChannels.userAId, userBId: dmChannels.userBId })
      .from(dmChannels)
      .where(eq(dmChannels.channelId, channelId))
      .limit(1)
    const dm = dmRows[0]
    if (!dm) return { candidates: [], allowBroadcast: false, onlineIds: [] }
    const ids = [dm.userAId, dm.userBId]
    const userRows = await db
      .select({ id: users.id, displayName: users.displayName, username: users.username })
      .from(users)
      .where(inArray(users.id, ids))
    return { candidates: userRows, allowBroadcast: false, onlineIds: [] }
  }

  // server channel
  if (!ch.serverId) return { candidates: [], allowBroadcast: false, onlineIds: [] }
  const memberRows = await db
    .select({
      id:          users.id,
      displayName: users.displayName,
      username:    users.username,
      role:        serverMembers.role,
    })
    .from(serverMembers)
    .innerJoin(users, eq(serverMembers.userId, users.id))
    .where(eq(serverMembers.serverId, ch.serverId))

  const author = memberRows.find((m) => m.id === authorId)
  const allowBroadcast = author?.role === 'owner' || author?.role === 'admin'

  const presenceMap = await presence.getStatusBulk(memberRows.map((m) => m.id))
  const onlineIds = memberRows
    .filter((m) => {
      const p = presenceMap.get(m.id)?.status ?? 'offline'
      return p === 'online' || p === 'idle' || p === 'dnd'
    })
    .map((m) => m.id)

  return {
    candidates: memberRows.map((m) => ({ id: m.id, displayName: m.displayName, username: m.username })),
    allowBroadcast,
    onlineIds,
  }
}

async function persistMentions(opts: {
  messageId: string
  channelId: string
  parsed: ParsedMention[]
}): Promise<void> {
  if (opts.parsed.length === 0) return
  const rows = opts.parsed.map((m) => ({
    messageId:       opts.messageId,
    mentionedUserId: m.userId,
    mentionType:     m.type,
  }))
  // ON CONFLICT DO NOTHING для пары (messageId, mentionedUserId) — на случай
  // повторного запуска POST/edit-flow с теми же данными.
  await db.insert(mentionsTable).values(rows).onConflictDoNothing()
  for (const m of opts.parsed) {
    void broadcastToUser(m.userId, {
      t: 'mention',
      messageId: opts.messageId,
      channelId: opts.channelId,
      mentionedUserId: m.userId,
      mentionType: m.type,
    })
  }
}

function serializeMessage(
  row: {
    id: string
    channelId: string
    authorId: string
    content: string
    replyToId: string | null
    createdAt: Date
    editedAt: Date | null
  },
  reactions: ReactionAggregate[] = [],
  replyTo: ReplyRef | null = null,
  attachments: Attachment[] = [],
  thread: ThreadInfo | null = null,
) {
  return {
    id:        row.id,
    channelId: row.channelId,
    authorId:  row.authorId,
    content:   row.content,
    replyToId: row.replyToId ?? null,
    replyTo,
    createdAt: row.createdAt.toISOString(),
    editedAt:  row.editedAt?.toISOString() ?? null,
    reactions,
    attachments,
    thread,
  }
}

/**
 * Для каждого сообщения в страничке смотрим, есть ли тред с
 * parent_message_id == message.id, и приклеиваем агрегат
 * (messageCount, lastMessageAt). Двумя запросами:
 *   1. channels WHERE parent_message_id IN (msgIds)
 *   2. messages WHERE channel_id IN (threadIds) GROUP BY channel_id
 */
async function loadThreadInfoForMessages(messageIds: string[]): Promise<Map<string, ThreadInfo>> {
  const out = new Map<string, ThreadInfo>()
  if (messageIds.length === 0) return out

  const threadRows = await db
    .select({
      id:              channels.id,
      name:            channels.name,
      parentMessageId: channels.parentMessageId,
      archivedAt:      channels.archivedAt,
    })
    .from(channels)
    .where(inArray(channels.parentMessageId, messageIds))
  if (threadRows.length === 0) return out

  const threadIds = threadRows.map((t) => t.id)
  const aggRows = await db
    .select({
      channelId:     messages.channelId,
      count:         sql<number>`COUNT(*)::int`,
      lastCreatedAt: sql<Date>`MAX(${messages.createdAt})`,
    })
    .from(messages)
    .where(and(inArray(messages.channelId, threadIds), isNull(messages.deletedAt)))
    .groupBy(messages.channelId)
  const aggByChannel = new Map(aggRows.map((r) => [r.channelId, r]))

  for (const t of threadRows) {
    if (!t.parentMessageId) continue
    const agg = aggByChannel.get(t.id)
    out.set(t.parentMessageId, {
      channelId:     t.id,
      name:          t.name,
      messageCount:  agg?.count ?? 0,
      lastMessageAt: agg?.lastCreatedAt ? new Date(agg.lastCreatedAt).toISOString() : null,
      archivedAt:    t.archivedAt?.toISOString() ?? null,
    })
  }
  return out
}

export const messagesRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/channels/:channelId/messages ─────
  app.get(
    '/channels/:channelId/messages',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        querystring: z.object({
          before: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(50),
        }),
        response: {
          200: MessagesPageSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const { before, limit } = req.query
      const userId = req.authUser!.id

      await assertCanAccessChannel(userId, channelId)

      const conditions = [
        eq(messages.channelId, channelId),
        isNull(messages.deletedAt),
        ...(before !== undefined ? [lt(messages.id, before)] : []),
      ]

      const rows = await db
        .select(MSG_COLS)
        .from(messages)
        .where(and(...conditions))
        .orderBy(desc(messages.id))
        .limit(limit + 1)

      const hasMore = rows.length > limit
      if (hasMore) rows.pop()

      const nextCursor = hasMore ? (rows[rows.length - 1]?.id ?? null) : null

      rows.reverse()

      const reactionsMap = new Map<string, ReactionAggregate[]>()
      const replyMap = new Map<string, ReplyRef>()
      let attachmentsMap = new Map<string, Attachment[]>()
      let threadMap = new Map<string, ThreadInfo>()

      if (rows.length > 0) {
        const msgIds = rows.map((r) => r.id)
        const reactRows = await db
          .select({
            messageId: reactionsTable.messageId,
            emoji:     reactionsTable.emoji,
            count:     sql<number>`count(*)::int`,
            users:     sql<string[]>`array_agg(${reactionsTable.userId}::text)`,
          })
          .from(reactionsTable)
          .where(inArray(reactionsTable.messageId, msgIds))
          .groupBy(reactionsTable.messageId, reactionsTable.emoji)
        for (const r of reactRows) {
          const list = reactionsMap.get(r.messageId) ?? []
          list.push({ emoji: r.emoji, count: r.count, users: r.users })
          reactionsMap.set(r.messageId, list)
        }

        const replyIds = [...new Set(rows.map((r) => r.replyToId).filter((id): id is string => id !== null))]
        const resolved = await resolveReplies(replyIds)
        resolved.forEach((v, k) => replyMap.set(k, v))

        attachmentsMap = await loadAttachmentsForMessages(msgIds)
        threadMap = await loadThreadInfoForMessages(msgIds)
      }

      return reply.code(200).send({
        messages: rows.map((r) => serializeMessage(
          r,
          reactionsMap.get(r.id) ?? [],
          r.replyToId ? (replyMap.get(r.replyToId) ?? null) : null,
          attachmentsMap.get(r.id) ?? [],
          threadMap.get(r.id) ?? null,
        )),
        nextCursor,
      })
    },
  )

  // ───── POST /api/channels/:channelId/messages ─────
  app.post(
    '/channels/:channelId/messages',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        body: SendMessageRequestSchema,
        response: {
          201: MessageSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const { content, replyToId, clientNonce, attachments: attachmentIds } = req.body
      const userId = req.authUser!.id

      await assertCanAccessChannel(userId, channelId)

      // Idempotency: return existing message if same nonce+author
      if (clientNonce) {
        const existing = await db
          .select(MSG_COLS)
          .from(messages)
          .where(and(eq(messages.authorId, userId), eq(messages.clientNonce, clientNonce)))
          .limit(1)
        if (existing[0]) {
          const ex = existing[0]
          const exReplyTo = ex.replyToId
            ? (await resolveReplies([ex.replyToId])).get(ex.replyToId) ?? null
            : null
          const exAttachments = (await loadAttachmentsForMessages([ex.id])).get(ex.id) ?? []
          return reply.code(201).send(serializeMessage(ex, [], exReplyTo, exAttachments))
        }
      }

      const inserted = await db
        .insert(messages)
        .values({
          channelId,
          authorId: userId,
          content,
          replyToId: replyToId ?? null,
          clientNonce: clientNonce ?? null,
        })
        .returning(MSG_COLS)

      const msg = inserted[0]
      if (!msg) throw new Error('insert into messages returned no rows')

      let attachedFiles: Attachment[] = []
      if (attachmentIds && attachmentIds.length > 0) {
        attachedFiles = await attachFilesToMessage({
          fileIds:   attachmentIds,
          ownerId:   userId,
          messageId: msg.id,
        })
      }

      const mentionCtx = await buildMentionContext(userId, channelId)
      const parsedMentions = extractMentions({
        text:           content,
        authorId:       userId,
        candidates:     mentionCtx.candidates,
        allowBroadcast: mentionCtx.allowBroadcast,
        onlineIds:      mentionCtx.onlineIds,
      })
      await persistMentions({ messageId: msg.id, channelId, parsed: parsedMentions })

      const replyToData = msg.replyToId
        ? (await resolveReplies([msg.replyToId])).get(msg.replyToId) ?? null
        : null
      const serialized = serializeMessage(msg, [], replyToData, attachedFiles)
      void broadcastToChannel(channelId, { t: 'msg.new', channelId, message: serialized })

      return reply.code(201).send(serialized)
    },
  )

  // ───── PATCH /api/messages/:id ─────
  app.patch(
    '/messages/:id',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: EditMessageRequestSchema,
        response: {
          200: MessageSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params
      const { content } = req.body
      const userId = req.authUser!.id

      const rows = await db
        .select({
          ...MSG_COLS,
          deletedAt: messages.deletedAt,
        })
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1)
      const msg = rows[0]
      if (!msg) throw notFound('message-not-found', 'message not found')
      if (msg.deletedAt !== null) throw notFound('message-not-found', 'message not found')
      if (msg.authorId !== userId) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'only the author can edit this message' } })
      }
      if (Date.now() - msg.createdAt.getTime() > EDIT_WINDOW_MS) {
        return reply.code(403).send({ error: { code: 'edit-window-expired', message: 'edit window has closed (30 days)' } })
      }

      const updated = await db
        .update(messages)
        .set({ content, editedAt: new Date() })
        .where(eq(messages.id, id))
        .returning(MSG_COLS)

      const result = updated[0]
      if (!result) throw new Error('update messages returned no rows')

      // ── diff mentions: добавляем новые, убираем удалённые. На добавленных
      //    шлём mention WS event, чтобы у нового упомянутого появился бейдж.
      const existing = await db
        .select({ mentionedUserId: mentionsTable.mentionedUserId })
        .from(mentionsTable)
        .where(eq(mentionsTable.messageId, id))
      const existingIds = new Set(existing.map((m) => m.mentionedUserId))

      const ctx = await buildMentionContext(userId, result.channelId)
      const parsed = extractMentions({
        text:           content,
        authorId:       userId,
        candidates:     ctx.candidates,
        allowBroadcast: ctx.allowBroadcast,
        onlineIds:      ctx.onlineIds,
      })
      const parsedById = new Map(parsed.map((m) => [m.userId, m.type]))

      const toAdd = parsed.filter((m) => !existingIds.has(m.userId))
      const toRemove = Array.from(existingIds).filter((uid) => !parsedById.has(uid))

      if (toRemove.length > 0) {
        await db
          .delete(mentionsTable)
          .where(and(
            eq(mentionsTable.messageId, id),
            inArray(mentionsTable.mentionedUserId, toRemove),
          ))
      }
      if (toAdd.length > 0) {
        await persistMentions({ messageId: id, channelId: result.channelId, parsed: toAdd })
      }

      const editAttachments = (await loadAttachmentsForMessages([result.id])).get(result.id) ?? []
      const serialized = serializeMessage(result, [], null, editAttachments)
      void broadcastToChannel(result.channelId, {
        t: 'msg.edit',
        channelId: result.channelId,
        messageId: result.id,
        content: result.content,
        editedAt: serialized.editedAt ?? new Date().toISOString(),
      })

      return reply.code(200).send(serialized)
    },
  )

  // ───── DELETE /api/messages/:id ─────
  app.delete(
    '/messages/:id',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          204: z.null(),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params
      const userId = req.authUser!.id

      const rows = await db
        .select({
          authorId:  messages.authorId,
          channelId: messages.channelId,
          deletedAt: messages.deletedAt,
        })
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1)
      const msg = rows[0]
      if (!msg) throw notFound('message-not-found', 'message not found')
      if (msg.deletedAt !== null) throw notFound('message-not-found', 'message not found')

      const isAuthor = msg.authorId === userId

      if (!isAuthor) {
        // Admins/owners can delete any message in a server channel.
        // В DM admin'ов нет — удалять может только автор.
        const channelRows = await db
          .select({ serverId: channels.serverId, kind: channels.kind })
          .from(channels)
          .where(eq(channels.id, msg.channelId))
          .limit(1)
        const ch = channelRows[0]
        if (!ch) throw notFound('channel-not-found', 'channel not found')
        if (ch.kind === 'dm' || !ch.serverId) {
          return reply.code(403).send({ error: { code: 'forbidden', message: 'only the author can delete this message' } })
        }
        await assertRole(userId, ch.serverId, ['owner', 'admin'])
      }

      await db
        .update(messages)
        .set({ deletedAt: new Date(), content: '' })
        .where(eq(messages.id, id))

      void broadcastToChannel(msg.channelId, {
        t: 'msg.delete',
        channelId: msg.channelId,
        messageId: id,
      })

      return reply.code(204).send(null)
    },
  )
}
