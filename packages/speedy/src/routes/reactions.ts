import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { ErrorBodySchema } from '@kakdela/ginzu/api-types'

import { messages, reactions } from '../db/schema.js'
import { db } from '../lib/db.js'
import { assertCanAccessChannel, notFound } from '../lib/permissions.js'
import { broadcastToChannel } from '../ws/broadcast.js'

const emojiSchema = z.string().min(1).max(64)

export const reactionsRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── POST /api/messages/:id/reactions ─────
  app.post(
    '/messages/:id/reactions',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ emoji: emojiSchema }),
        response: {
          200: z.object({ ok: z.literal(true) }),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { id: messageId } = req.params
      const { emoji } = req.body
      const userId = req.authUser!.id

      const msgRows = await db
        .select({ channelId: messages.channelId, deletedAt: messages.deletedAt })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1)
      const msg = msgRows[0]
      if (!msg || msg.deletedAt !== null) throw notFound('message-not-found', 'message not found')

      await assertCanAccessChannel(userId, msg.channelId)

      await db.insert(reactions).values({ messageId, userId, emoji }).onConflictDoNothing()

      void broadcastToChannel(msg.channelId, {
        t: 'reaction.add',
        channelId: msg.channelId,
        messageId,
        userId,
        emoji,
      })

      return reply.code(200).send({ ok: true })
    },
  )

  // ───── DELETE /api/messages/:id/reactions/:emoji ─────
  app.delete(
    '/messages/:id/reactions/:emoji',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid(), emoji: emojiSchema }),
        response: {
          204: z.null(),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { id: messageId, emoji } = req.params
      const userId = req.authUser!.id

      const msgRows = await db
        .select({ channelId: messages.channelId, deletedAt: messages.deletedAt })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1)
      const msg = msgRows[0]
      if (!msg || msg.deletedAt !== null) throw notFound('message-not-found', 'message not found')

      await assertCanAccessChannel(userId, msg.channelId)

      await db
        .delete(reactions)
        .where(
          and(
            eq(reactions.messageId, messageId),
            eq(reactions.userId, userId),
            eq(reactions.emoji, emoji),
          ),
        )

      void broadcastToChannel(msg.channelId, {
        t: 'reaction.remove',
        channelId: msg.channelId,
        messageId,
        userId,
        emoji,
      })

      return reply.code(204).send(null)
    },
  )
}
