import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  ChannelSchema,
  ErrorBodySchema,
  PatchChannelRequestSchema,
} from '@kakdela/ginzu/api-types'

import { channels } from '../db/schema.js'
import { audit } from '../lib/audit.js'
import { db } from '../lib/db.js'
import { assertMember, assertRole, notFound } from '../lib/permissions.js'
import { broadcastToServer } from '../ws/broadcast.js'

export const channelsRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/channels/:channelId ─────
  app.get(
    '/channels/:channelId',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        response: {
          200: ChannelSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const userId = req.authUser!.id

      const rows = await db
        .select({
          id: channels.id,
          serverId: channels.serverId,
          name: channels.name,
          kind: channels.kind,
          category: channels.category,
          topic: channels.topic,
          position: channels.position,
        })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1)
      const channel = rows[0]
      if (!channel) throw notFound('channel-not-found', 'channel not found')
      if (!channel.serverId) throw notFound('channel-not-found', 'channel not found')

      await assertMember(userId, channel.serverId)

      return reply.code(200).send(channel)
    },
  )

  // ───── PATCH /api/channels/:channelId ─────
  app.patch(
    '/channels/:channelId',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        body: PatchChannelRequestSchema,
        response: {
          200: ChannelSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const userId = req.authUser!.id

      const rows = await db
        .select({
          serverId: channels.serverId,
          name:     channels.name,
          topic:    channels.topic,
          position: channels.position,
        })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1)
      const existing = rows[0]
      if (!existing || !existing.serverId) throw notFound('channel-not-found', 'channel not found')
      const existingServerId = existing.serverId

      await assertRole(userId, existingServerId, ['owner', 'admin'])

      const { name, topic, position } = req.body
      const updates: Partial<typeof channels.$inferInsert> = {}
      if (name !== undefined) updates.name = name
      if (topic !== undefined) updates.topic = topic ?? null
      if (position !== undefined) updates.position = position

      const updated = await db
        .update(channels)
        .set(updates)
        .where(eq(channels.id, channelId))
        .returning({
          id: channels.id,
          serverId: channels.serverId,
          name: channels.name,
          kind: channels.kind,
          category: channels.category,
          topic: channels.topic,
          position: channels.position,
        })

      const channel = updated[0]
      if (!channel) throw new Error('update channels returned no rows')

      audit.log({
        serverId:   existingServerId,
        actorId:    userId,
        action:     'channel.update',
        targetType: 'channel',
        targetId:   channelId,
        metadata: {
          before: { name: existing.name, topic: existing.topic, position: existing.position },
          after:  { name: channel.name,  topic: channel.topic,  position: channel.position },
        },
      })

      void broadcastToServer(existingServerId, {
        t: 'channel.update',
        serverId: existingServerId,
        channel,
      })

      return reply.code(200).send(channel)
    },
  )

  // ───── DELETE /api/channels/:channelId ─────
  app.delete(
    '/channels/:channelId',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ channelId: z.string().uuid() }),
        response: {
          204: z.null(),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { channelId } = req.params
      const userId = req.authUser!.id

      const rows = await db
        .select({
          serverId: channels.serverId,
          name:     channels.name,
          kind:     channels.kind,
        })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1)
      const existing = rows[0]
      if (!existing || !existing.serverId) throw notFound('channel-not-found', 'channel not found')
      const existingServerId = existing.serverId

      await assertRole(userId, existingServerId, ['owner', 'admin'])

      await db.delete(channels).where(eq(channels.id, channelId))

      audit.log({
        serverId:   existingServerId,
        actorId:    userId,
        action:     'channel.delete',
        targetType: 'channel',
        // targetId намеренно `null` после delete — само сообщение об удалении
        // достаточно идентифицируется по `name` в metadata.
        targetId:   null,
        metadata: { name: existing.name, kind: existing.kind },
      })

      void broadcastToServer(existingServerId, {
        t: 'channel.delete',
        serverId: existingServerId,
        channelId,
      })

      return reply.code(204).send(null)
    },
  )
}
