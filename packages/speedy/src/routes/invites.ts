import { randomBytes } from 'node:crypto'

import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  CreateInviteResponseSchema,
  ErrorBodySchema,
  InvitePublicSchema,
  InvitesListResponseSchema,
} from '@kakdela/ginzu/api-types'

import { invites, serverMembers, servers } from '../db/schema.js'
import { env } from '../env.js'
import { audit } from '../lib/audit.js'
import { db } from '../lib/db.js'

const BASE32 = 'abcdefghjkmnpqrstuvwxyz23456789'

function generateCode(): string {
  const bytes = randomBytes(5)
  let num = 0n
  for (const byte of bytes) {
    num = (num << 8n) | BigInt(byte)
  }
  let code = ''
  for (let i = 7; i >= 0; i--) {
    code += BASE32.charAt(Number((num >> BigInt(i * 5)) & 0x1fn))
  }
  return code
}

function normalizeCode(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export const invitesRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── POST /api/servers/:serverId/invites ─────
  app.post(
    '/servers/:serverId/invites',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        body: z.object({
          expiresInDays: z.number().int().positive().optional(),
          maxUses: z.number().int().positive().optional(),
        }),
        response: {
          200: CreateInviteResponseSchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      // preHandler: app.authenticate guarantees authUser is set
      const userId = req.authUser!.id

      const memberRows = await db
        .select({ role: serverMembers.role })
        .from(serverMembers)
        .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)))
        .limit(1)
      const member = memberRows[0]
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'admin or owner required' } })
      }

      const serverRows = await db
        .select({ id: servers.id })
        .from(servers)
        .where(eq(servers.id, serverId))
        .limit(1)
      if (!serverRows[0]) {
        return reply.code(404).send({ error: { code: 'server-not-found', message: 'server not found' } })
      }

      const expiresAt = req.body.expiresInDays != null
        ? new Date(Date.now() + req.body.expiresInDays * 86_400_000)
        : null

      let code: string | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = generateCode()
        const existing = await db
          .select({ code: invites.code })
          .from(invites)
          .where(eq(invites.code, candidate))
          .limit(1)
        if (!existing[0]) {
          code = candidate
          break
        }
      }
      if (!code) {
        throw new Error('failed to generate unique invite code after 3 attempts')
      }

      await db.insert(invites).values({
        code,
        serverId,
        createdBy: userId,
        expiresAt,
        maxUses: req.body.maxUses ?? null,
      })

      audit.log({
        serverId,
        actorId:    userId,
        action:     'invite.create',
        targetType: 'invite',
        // invite.code — natural primary key, не uuid; кладём в metadata.
        targetId:   null,
        metadata: {
          code,
          expiresAt: expiresAt?.toISOString() ?? null,
          maxUses:   req.body.maxUses ?? null,
        },
      })

      return reply.code(200).send({ code, url: `${env.PUBLIC_ORIGIN}/invite/${code}` })
    },
  )

  // ───── GET /api/servers/:serverId/invites ─────
  //
  // Список активных и недавних инвайтов для админ-UI. Возвращаем без
  // фильтрации по revoked/expired — UI решает, как показать «отозванные».
  app.get(
    '/servers/:serverId/invites',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        response: {
          200: InvitesListResponseSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id

      const memberRows = await db
        .select({ role: serverMembers.role })
        .from(serverMembers)
        .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)))
        .limit(1)
      const member = memberRows[0]
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'admin or owner required' } })
      }

      const rows = await db
        .select({
          code:      invites.code,
          createdBy: invites.createdBy,
          expiresAt: invites.expiresAt,
          maxUses:   invites.maxUses,
          useCount:  invites.useCount,
          revoked:   invites.revoked,
          createdAt: invites.createdAt,
        })
        .from(invites)
        .where(eq(invites.serverId, serverId))
        .orderBy(sql`${invites.createdAt} DESC`)

      const items = rows.map((r) => ({
        code:      r.code,
        url:       `${env.PUBLIC_ORIGIN}/?invite=${r.code}`,
        createdBy: r.createdBy,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        maxUses:   r.maxUses,
        useCount:  r.useCount,
        revoked:   r.revoked,
        createdAt: r.createdAt.toISOString(),
      }))

      return reply.code(200).send({ invites: items })
    },
  )

  // ───── GET /api/invites/:code ─────
  app.get(
    '/invites/:code',
    {
      schema: {
        params: z.object({ code: z.string() }),
        response: {
          200: InvitePublicSchema,
          404: ErrorBodySchema,
          410: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const code = normalizeCode(req.params.code)

      const rows = await db
        .select({
          revoked:    invites.revoked,
          expiresAt:  invites.expiresAt,
          maxUses:    invites.maxUses,
          useCount:   invites.useCount,
          serverName: servers.name,
          serverIcon: servers.iconUrl,
        })
        .from(invites)
        .innerJoin(servers, eq(invites.serverId, servers.id))
        .where(eq(invites.code, code))
        .limit(1)

      const invite = rows[0]
      if (!invite) {
        return reply.code(404).send({ error: { code: 'invite-not-found', message: 'invite not found' } })
      }
      if (invite.revoked || (invite.expiresAt !== null && invite.expiresAt < new Date())) {
        return reply.code(410).send({ error: { code: 'invite-expired', message: 'invite has expired or been revoked' } })
      }
      if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
        return reply.code(410).send({ error: { code: 'invite-exhausted', message: 'invite has reached its maximum uses' } })
      }

      return reply.code(200).send({
        serverName: invite.serverName,
        serverIcon: invite.serverIcon ?? null,
        expiresAt:  invite.expiresAt?.toISOString() ?? null,
      })
    },
  )

  // ───── POST /api/invites/:code/accept ─────
  app.post(
    '/invites/:code/accept',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ code: z.string() }),
        response: {
          200: z.object({ serverId: z.string().uuid() }),
          404: ErrorBodySchema,
          410: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const code = normalizeCode(req.params.code)
      // preHandler: app.authenticate guarantees authUser is set
      const userId = req.authUser!.id

      // Atomically increment use_count only when the invite is still valid.
      // If two concurrent requests race with maxUses: 1, only one UPDATE wins.
      const updated = await db
        .update(invites)
        .set({ useCount: sql`${invites.useCount} + 1` })
        .where(
          and(
            eq(invites.code, code),
            eq(invites.revoked, false),
            or(isNull(invites.expiresAt), gt(invites.expiresAt, sql`NOW()`)),
            or(isNull(invites.maxUses), lt(invites.useCount, invites.maxUses)),
          ),
        )
        .returning({ serverId: invites.serverId })

      const row = updated[0]
      if (!row) {
        const exists = await db
          .select({ code: invites.code })
          .from(invites)
          .where(eq(invites.code, code))
          .limit(1)
        if (!exists[0]) {
          return reply.code(404).send({ error: { code: 'invite-not-found', message: 'invite not found' } })
        }
        return reply.code(410).send({ error: { code: 'invite-expired', message: 'invite is expired, revoked, or exhausted' } })
      }

      await db.insert(serverMembers).values({ serverId: row.serverId, userId }).onConflictDoNothing()

      return reply.code(200).send({ serverId: row.serverId })
    },
  )

  // ───── DELETE /api/invites/:code ─────
  app.delete(
    '/invites/:code',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ code: z.string() }),
        response: {
          204: z.null(),
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const code = normalizeCode(req.params.code)
      // preHandler: app.authenticate guarantees authUser is set
      const userId = req.authUser!.id

      const inviteRows = await db
        .select({ serverId: invites.serverId })
        .from(invites)
        .where(eq(invites.code, code))
        .limit(1)
      const invite = inviteRows[0]
      if (!invite) {
        return reply.code(404).send({ error: { code: 'invite-not-found', message: 'invite not found' } })
      }

      const memberRows = await db
        .select({ role: serverMembers.role })
        .from(serverMembers)
        .where(and(eq(serverMembers.serverId, invite.serverId), eq(serverMembers.userId, userId)))
        .limit(1)
      const member = memberRows[0]
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'admin or owner required' } })
      }

      await db.update(invites).set({ revoked: true }).where(eq(invites.code, code))

      audit.log({
        serverId:   invite.serverId,
        actorId:    userId,
        action:     'invite.revoke',
        targetType: 'invite',
        targetId:   null,
        metadata: { code },
      })

      return reply.code(204).send(null)
    },
  )
}
