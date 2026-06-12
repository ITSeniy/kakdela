import { and, eq, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  ChannelSchema,
  CreateChannelRequestSchema,
  CreateServerRequestSchema,
  ErrorBodySchema,
  MemberPublicSchema,
  PatchServerRequestSchema,
  ServerDetailSchema,
  ServerSchema,
} from '@kakdela/ginzu/api-types'

import { channels, serverMembers, servers, users } from '../db/schema.js'
import { audit } from '../lib/audit.js'
import { db } from '../lib/db.js'
import { assertMember, assertRole, notFound } from '../lib/permissions.js'
import { presence } from '../presence/store.js'
import { broadcastToServer } from '../ws/broadcast.js'
import { registry } from '../ws/registry.js'

const STATUS_ORDER: Record<string, number> = { online: 0, idle: 1, dnd: 2, offline: 3 }

export const serversRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/servers ─────
  app.get(
    '/servers',
    {
      preHandler: app.authenticate,
      schema: {
        response: {
          200: z.object({ servers: z.array(ServerSchema) }),
          401: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const userId = req.authUser!.id

      const rows = await db
        .select({
          id: servers.id,
          name: servers.name,
          iconUrl: servers.iconUrl,
        })
        .from(serverMembers)
        .innerJoin(servers, eq(serverMembers.serverId, servers.id))
        .where(eq(serverMembers.userId, userId))

      return reply.code(200).send({ servers: rows })
    },
  )

  // ───── POST /api/servers ─────
  //
  // Любой авторизованный юзер может создать сервер. При создании сразу
  // получает роль `owner`, плюс мы заводим два дефолтных канала — #общее
  // (text) и общая комната (voice), чтобы пустой сервер не пугал свежей
  // тишиной. Всё это одной транзакцией: если что-то падает на полпути,
  // мы не оставляем «полу-сервер» без owner'а.
  app.post(
    '/servers',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateServerRequestSchema,
        response: {
          201: ServerSchema,
          401: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const userId = req.authUser!.id
      const { name, iconUrl } = req.body

      const server = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(servers)
          .values({ name, iconUrl: iconUrl ?? null, ownerId: userId })
          .returning({ id: servers.id, name: servers.name, iconUrl: servers.iconUrl })
        const row = inserted[0]
        if (!row) throw new Error('insert into servers returned no rows')

        await tx.insert(serverMembers).values({
          serverId: row.id,
          userId,
          role:     'owner',
        })

        await tx.insert(channels).values([
          { serverId: row.id, name: 'общее',         kind: 'text',  position: 0 },
          { serverId: row.id, name: 'общая комната', kind: 'voice', position: 1 },
        ])

        return row
      })

      return reply.code(201).send({ id: server.id, name: server.name, iconUrl: server.iconUrl ?? null })
    },
  )

  // ───── GET /api/servers/:serverId ─────
  app.get(
    '/servers/:serverId',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        response: {
          200: ServerDetailSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id

      await assertMember(userId, serverId)

      const serverRows = await db
        .select({ id: servers.id, name: servers.name, iconUrl: servers.iconUrl })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1)
      const server = serverRows[0]
      if (!server) throw notFound('server-not-found', 'server not found')

      const channelRows = await db
        .select({
          id: channels.id,
          serverId: channels.serverId,
          name: channels.name,
          kind: channels.kind,
          category: channels.category,
          topic: channels.topic,
          position: channels.position,
          parentChannelId: channels.parentChannelId,
        })
        .from(channels)
        .where(eq(channels.serverId, serverId))
        .orderBy(channels.position)

      const countRows = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(serverMembers)
        .where(eq(serverMembers.serverId, serverId))
      const memberCount = countRows[0]?.count ?? 0

      // Топ-уровневые каналы: исключаем DM и треды (треды живут отдельно
      // в ThreadPanel и подгружаются через /api/channels/:id/threads).
      return reply.code(200).send({
        server,
        channels: channelRows.filter((c) => c.kind !== 'dm' && c.parentChannelId === null),
        memberCount,
      })
    },
  )

  // ───── GET /api/servers/:serverId/members ─────
  app.get(
    '/servers/:serverId/members',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        response: {
          200: z.object({ members: z.array(MemberPublicSchema) }),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id

      await assertMember(userId, serverId)

      const serverExists = await db
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1)
      if (!serverExists[0]) throw notFound('server-not-found', 'server not found')

      const rows = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          status: users.status,
          role: serverMembers.role,
        })
        .from(serverMembers)
        .innerJoin(users, eq(serverMembers.userId, users.id))
        .where(eq(serverMembers.serverId, serverId))

      // Overlay live presence from Redis; fall back to DB column when missing.
      const presenceMap = await presence.getStatusBulk(rows.map((r) => r.id))
      const enriched = rows.map((r) => ({
        ...r,
        status: presenceMap.get(r.id)?.status ?? r.status,
      }))

      enriched.sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 4
        const sb = STATUS_ORDER[b.status] ?? 4
        if (sa !== sb) return sa - sb
        return a.displayName.localeCompare(b.displayName)
      })

      return reply.code(200).send({ members: enriched })
    },
  )

  // ───── POST /api/servers/:serverId/channels ─────
  app.post(
    '/servers/:serverId/channels',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        body: CreateChannelRequestSchema,
        response: {
          201: ChannelSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id

      await assertRole(userId, serverId, ['owner', 'admin'])

      const serverExists = await db
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1)
      if (!serverExists[0]) throw notFound('server-not-found', 'server not found')

      const { name, kind, category, topic } = req.body

      // Position: next after last channel of same kind
      const maxRows = await db
        .select({ max: sql<number>`COALESCE(MAX(position), -1)::int` })
        .from(channels)
        .where(eq(channels.serverId, serverId))
      const position = (maxRows[0]?.max ?? -1) + 1

      const inserted = await db
        .insert(channels)
        .values({ serverId, name, kind, category: category ?? null, topic: topic ?? null, position })
        .returning({
          id: channels.id,
          serverId: channels.serverId,
          name: channels.name,
          kind: channels.kind,
          category: channels.category,
          topic: channels.topic,
          position: channels.position,
        })

      const channel = inserted[0]
      if (!channel) throw new Error('insert into channels returned no rows')

      audit.log({
        serverId,
        actorId:    userId,
        action:     'channel.create',
        targetType: 'channel',
        targetId:   channel.id,
        metadata: {
          name:     channel.name,
          kind:     channel.kind,
          category: channel.category,
        },
      })

      // Hot-attach: подписки на каналы выдаются соединению на hello, поэтому
      // уже подключённых участников сервера досубскрайбим вручную — иначе
      // msg.new в новом канале не дойдёт до них до реконнекта (тот же
      // паттерн, что у DM и тредов).
      for (const conn of registry.forServer(serverId)) {
        registry.subscribeChannel(conn, channel.id)
      }
      void broadcastToServer(serverId, { t: 'channel.create', serverId, channel })

      return reply.code(201).send(channel)
    },
  )

  // ───── PATCH /api/servers/:serverId ─────
  //
  // Изменение имени / иконки. Owner/admin only. Owner создаёт `iconUrl`
  // отдельным upload'ом через /api/files и присылает финальный publicUrl.
  app.patch(
    '/servers/:serverId',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        body: PatchServerRequestSchema,
        response: {
          200: ServerSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id
      const { name, iconUrl } = req.body

      await assertRole(userId, serverId, ['owner', 'admin'])

      const updates: Partial<typeof servers.$inferInsert> = {}
      if (name !== undefined) updates.name = name
      if (iconUrl !== undefined) updates.iconUrl = iconUrl ?? null

      const updated = await db
        .update(servers)
        .set(updates)
        .where(eq(servers.id, serverId))
        .returning({ id: servers.id, name: servers.name, iconUrl: servers.iconUrl })
      const server = updated[0]
      if (!server) throw notFound('server-not-found', 'server not found')

      return reply.code(200).send({ id: server.id, name: server.name, iconUrl: server.iconUrl ?? null })
    },
  )

  // ───── DELETE /api/servers/:serverId ─────
  //
  // Удаление — ТОЛЬКО owner. Каскадно сносит channels / members / invites /
  // emoji / audit_log / messages / reactions / mentions / files (FK с
  // `onDelete: 'cascade'`). На клиенте требуем двойной confirm — здесь не
  // ставим лишней защиты, доверяем UI.
  app.delete(
    '/servers/:serverId',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        response: {
          204: z.null(),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id

      await assertRole(userId, serverId, ['owner'])

      const result = await db.delete(servers).where(eq(servers.id, serverId)).returning({ id: servers.id })
      if (!result[0]) throw notFound('server-not-found', 'server not found')

      // audit_log тоже каскадно удалится — отдельный entry уже не нужен.
      return reply.code(204).send(null)
    },
  )

  // ───── DELETE /api/servers/:serverId/members/me ─────
  //
  // «Покинуть сервер». Owner не может — он должен либо удалить сервер,
  // либо (в будущем) передать владение. Так что если ты owner — 422.
  app.delete(
    '/servers/:serverId/members/me',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        response: {
          204: z.null(),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          422: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id

      const { role } = await assertMember(userId, serverId)
      if (role === 'owner') {
        return reply.code(422).send({
          error: {
            code: 'owner-cannot-leave',
            message: 'хозяин не может покинуть сервер — сначала удалите его',
          },
        })
      }

      await db
        .delete(serverMembers)
        .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)))

      return reply.code(204).send(null)
    },
  )
}
