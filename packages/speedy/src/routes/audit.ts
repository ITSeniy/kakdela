import { and, desc, eq, lt } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  AuditEntriesResponseSchema,
  ErrorBodySchema,
  type AuditAction,
  type AuditEntry,
  type AuditTargetType,
} from '@kakdela/ginzu/api-types'

import { auditLog, users } from '../db/schema.js'
import { db } from '../lib/db.js'
import { assertPermission } from '../lib/permissions.js'

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

export const auditRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/servers/:serverId/audit ─────
  //
  // Лента действий админов сервера. Только owner/admin видят её — для рядового
  // member'а это 403. Курсор `before` — ISO-timestamp; берём страницы по
  // убыванию `createdAt`, отдаём `nextCursor` равным `createdAt` последнего
  // элемента (или null если страниц больше нет).
  app.get(
    '/servers/:serverId/audit',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        querystring: z.object({
          limit:  z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
          before: z.string().datetime().optional(),
        }),
        response: {
          200: AuditEntriesResponseSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const { limit, before } = req.query
      const userId = req.authUser!.id

      await assertPermission(userId, serverId, 'VIEW_AUDIT_LOG')

      const beforeDate = before ? new Date(before) : null

      const whereExpr = beforeDate
        ? and(eq(auditLog.serverId, serverId), lt(auditLog.createdAt, beforeDate))
        : eq(auditLog.serverId, serverId)

      // Берём limit+1 чтобы понять, есть ли следующая страница.
      const rows = await db
        .select({
          id:           auditLog.id,
          serverId:     auditLog.serverId,
          actorId:      auditLog.actorId,
          action:       auditLog.action,
          targetType:   auditLog.targetType,
          targetId:     auditLog.targetId,
          metadata:     auditLog.metadata,
          createdAt:    auditLog.createdAt,
          actorName:    users.displayName,
          actorAvatar:  users.avatarUrl,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))
        .where(whereExpr)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit + 1)

      const hasNext = rows.length > limit
      const visible = hasNext ? rows.slice(0, limit) : rows

      const entries: AuditEntry[] = visible.map((r) => ({
        id:         r.id,
        serverId:   r.serverId,
        action:     r.action as AuditAction,
        targetType: r.targetType as AuditTargetType,
        targetId:   r.targetId,
        metadata:   (r.metadata ?? null) as Record<string, unknown> | null,
        createdAt:  r.createdAt.toISOString(),
        actor: r.actorId && r.actorName
          ? { id: r.actorId, displayName: r.actorName, avatarUrl: r.actorAvatar ?? null }
          : null,
      }))

      const lastVisible = visible[visible.length - 1]
      const nextCursor = hasNext && lastVisible ? lastVisible.createdAt.toISOString() : null

      return reply.code(200).send({ entries, nextCursor })
    },
  )
}
