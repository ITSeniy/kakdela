import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  ChannelSchema,
  CreateThreadRequestSchema,
  CreateThreadResponseSchema,
  ErrorBodySchema,
  MessageSchema,
  ThreadListResponseSchema,
  type Message,
  type ThreadSummary,
} from '@kakdela/ginzu/api-types'

import { channels, messages } from '../db/schema.js'
import { db } from '../lib/db.js'
import { assertCanAccessChannel, notFound } from '../lib/permissions.js'
import { broadcastToChannel, broadcastToServer } from '../ws/broadcast.js'
import { registry } from '../ws/registry.js'

const THREAD_NAME_MAX = 100

function deriveName(parentContent: string, override?: string): string {
  if (override && override.trim()) return override.trim().slice(0, THREAD_NAME_MAX)
  const collapsed = parentContent.replace(/\s+/g, ' ').trim()
  if (!collapsed) return 'тред'
  return collapsed.length > 50 ? collapsed.slice(0, 47) + '…' : collapsed
}

function channelRowToApi(row: typeof channels.$inferSelect) {
  return {
    id:              row.id,
    serverId:        row.serverId,
    name:            row.name,
    kind:            row.kind,
    category:        row.category,
    topic:           row.topic,
    position:        row.position,
    parentChannelId: row.parentChannelId,
    parentMessageId: row.parentMessageId,
    archivedAt:      row.archivedAt?.toISOString() ?? null,
    slowModeSec:     row.slowModeSec,
    autoDeleteSec:   row.autoDeleteSec,
    isDefault:       row.isDefault,
    friendsOnly:     row.friendsOnly,
    nsfw:            row.nsfw,
    threadsAllowed:  row.threadsAllowed,
  }
}

export const threadsRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── POST /api/channels/:channelId/messages/:messageId/threads ─────
  //
  // Создаёт тред из сообщения. Тред живёт как обычный текстовый канал, но с
  // `parent_channel_id` и `parent_message_id`. `server_id` наследуется от
  // родителя — благодаря этому существующая permission-проверка через
  // membership работает без переделок.
  app.post(
    '/channels/:channelId/messages/:messageId/threads',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({
          channelId: z.string().uuid(),
          messageId: z.string().uuid(),
        }),
        body: CreateThreadRequestSchema,
        response: {
          201: CreateThreadResponseSchema,
          400: ErrorBodySchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId, messageId } = req.params
      const { name: providedName, firstMessage } = req.body
      const userId = req.authUser!.id

      const parentChannelRows = await db
        .select()
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1)
      const parentChannel = parentChannelRows[0]
      if (!parentChannel) throw notFound('channel-not-found', 'channel not found')
      if (parentChannel.parentChannelId !== null) {
        return reply.code(400).send({ error: { code: 'nested-thread', message: 'threads cannot nest' } })
      }
      if (parentChannel.kind === 'dm') {
        return reply.code(400).send({ error: { code: 'dm-thread-unsupported', message: 'threads in DM channels are not supported' } })
      }
      if (!parentChannel.serverId) {
        return reply.code(400).send({ error: { code: 'channel-without-server', message: 'cannot create thread on this channel' } })
      }
      if (!parentChannel.threadsAllowed) {
        return reply.code(403).send({ error: { code: 'threads-disabled', message: 'в этом канале треды выключены' } })
      }

      await assertCanAccessChannel(userId, channelId)

      const parentMessageRows = await db
        .select({ id: messages.id, content: messages.content, channelId: messages.channelId, deletedAt: messages.deletedAt })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1)
      const parentMessage = parentMessageRows[0]
      if (!parentMessage || parentMessage.deletedAt !== null) {
        throw notFound('message-not-found', 'parent message not found')
      }
      if (parentMessage.channelId !== channelId) {
        return reply.code(400).send({ error: { code: 'message-channel-mismatch', message: 'message does not belong to this channel' } })
      }

      // Идемпотентность: если уже есть тред на этом сообщении — возвращаем его.
      const existingRows = await db
        .select()
        .from(channels)
        .where(eq(channels.parentMessageId, messageId))
        .limit(1)
      if (existingRows[0]) {
        return reply.code(201).send({
          thread: channelRowToApi(existingRows[0]),
          firstMessage: null,
        })
      }

      const threadName = deriveName(parentMessage.content, providedName)

      const insertedThreads = await db
        .insert(channels)
        .values({
          serverId:        parentChannel.serverId,
          name:            threadName,
          kind:            'text',
          parentChannelId: channelId,
          parentMessageId: messageId,
          position:        0,
        })
        .returning()
      const thread = insertedThreads[0]
      if (!thread) throw new Error('insert into channels returned no rows')

      // Hot-attach: все участники сервера, кто сейчас подписан на
      // родительский канал, должны автоматически получать события треда.
      // Альтернатива — субскрайбить только при открытии — дороже по UX:
      // badge «N сообщений» не будет обновляться без открытого панели.
      for (const conn of registry.forChannel(channelId)) {
        registry.subscribeChannel(conn, thread.id)
      }

      // Optional first message.
      let firstMsg: Message | null = null
      if (firstMessage) {
        const inserted = await db
          .insert(messages)
          .values({
            channelId: thread.id,
            authorId:  userId,
            content:   firstMessage,
          })
          .returning({
            id:        messages.id,
            channelId: messages.channelId,
            authorId:  messages.authorId,
            content:   messages.content,
            replyToId: messages.replyToId,
            createdAt: messages.createdAt,
            editedAt:  messages.editedAt,
          })
        const m = inserted[0]
        if (m) {
          firstMsg = {
            id:          m.id,
            channelId:   m.channelId,
            authorId:    m.authorId,
            content:     m.content,
            replyToId:   m.replyToId,
            replyTo:     null,
            createdAt:   m.createdAt.toISOString(),
            editedAt:    m.editedAt?.toISOString() ?? null,
            reactions:   [],
            attachments: [],
            thread:      null,
            pinned:      false,
            pinnedAt:    null,
            forwarded:   null,
            linkPreviews: [],
          }
        }
      }

      const evt = {
        t: 'thread.new' as const,
        parentChannelId: channelId,
        parentMessageId: messageId,
        threadChannelId: thread.id,
        name: thread.name,
      }
      // Чтобы все, кто открыт на канале, узнали о бейдже.
      void broadcastToChannel(channelId, evt)
      // А также участники сервера — на случай, если в их client-кэше есть
      // незагруженные родительские сообщения.
      void broadcastToServer(parentChannel.serverId, evt)

      if (firstMsg) {
        void broadcastToChannel(thread.id, { t: 'msg.new', channelId: thread.id, message: firstMsg })
      }

      return reply.code(201).send({
        thread: channelRowToApi(thread),
        firstMessage: firstMsg,
      })
    },
  )

  // ───── GET /api/channels/:channelId/threads ─────
  app.get(
    '/channels/:channelId/threads',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        querystring: z.object({
          includeArchived: z.coerce.boolean().optional().default(false),
        }),
        response: {
          200: ThreadListResponseSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const { includeArchived } = req.query
      const userId = req.authUser!.id

      await assertCanAccessChannel(userId, channelId)

      const conditions = [eq(channels.parentChannelId, channelId)]
      if (!includeArchived) conditions.push(isNull(channels.archivedAt))

      const threadRows = await db
        .select()
        .from(channels)
        .where(and(...conditions))
        .orderBy(desc(channels.createdAt))

      if (threadRows.length === 0) return reply.code(200).send({ threads: [] })

      const threadIds = threadRows.map((t) => t.id)
      const aggRows = await db
        .select({
          channelId:     messages.channelId,
          count:         sql<number>`COUNT(*)::int`,
          lastCreatedAt: sql<Date>`MAX(${messages.createdAt})`,
        })
        .from(messages)
        .where(and(
          inArray(messages.channelId, threadIds),
          isNull(messages.deletedAt),
        ))
        .groupBy(messages.channelId)
      const aggByChannel = new Map(aggRows.map((r) => [r.channelId, r]))

      const threads: ThreadSummary[] = threadRows.map((t) => {
        const agg = aggByChannel.get(t.id)
        return {
          channel:         channelRowToApi(t),
          parentMessageId: t.parentMessageId,
          messageCount:    agg?.count ?? 0,
          lastMessageAt:   agg?.lastCreatedAt ? new Date(agg.lastCreatedAt).toISOString() : null,
        }
      })

      return reply.code(200).send({ threads })
    },
  )

  // ───── POST /api/threads/:id/archive ─────
  app.post(
    '/threads/:id/archive',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ archived: z.boolean().optional().default(true) }).optional(),
        response: {
          200: ChannelSchema,
          400: ErrorBodySchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params
      const archived = req.body?.archived ?? true
      const userId = req.authUser!.id

      const rows = await db.select().from(channels).where(eq(channels.id, id)).limit(1)
      const thread = rows[0]
      if (!thread || thread.parentChannelId === null) {
        throw notFound('thread-not-found', 'thread not found')
      }

      await assertCanAccessChannel(userId, id)

      const next = archived ? new Date() : null
      const updated = await db
        .update(channels)
        .set({ archivedAt: next })
        .where(eq(channels.id, id))
        .returning()
      const fresh = updated[0]
      if (!fresh) throw new Error('update channels returned no rows')

      if (archived && fresh.parentChannelId) {
        void broadcastToChannel(fresh.parentChannelId, {
          t: 'thread.archive',
          parentChannelId: fresh.parentChannelId,
          threadChannelId: fresh.id,
          archivedAt: (fresh.archivedAt ?? new Date()).toISOString(),
        })
      }

      return reply.code(200).send(channelRowToApi(fresh))
    },
  )
}

// Silence unused-import warnings for helpers we may want elsewhere.
void MessageSchema
void isNotNull
