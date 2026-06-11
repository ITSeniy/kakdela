import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { sql } from '../lib/db.js'
import { redis } from '../lib/redis.js'

const HealthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['ok', 'fail']),
  redis: z.enum(['ok', 'fail']),
  uptime: z.number(),
})

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/healthz',
    { schema: { response: { 200: HealthSchema, 503: HealthSchema } } },
    async (_req, reply) => {
      let dbStatus: 'ok' | 'fail' = 'ok'
      let redisStatus: 'ok' | 'fail' = 'ok'

      try {
        await sql`SELECT 1`
      } catch {
        dbStatus = 'fail'
      }

      try {
        await redis.ping()
      } catch {
        redisStatus = 'fail'
      }

      const healthy = dbStatus === 'ok' && redisStatus === 'ok'
      return reply.code(healthy ? 200 : 503).send({
        status: healthy ? 'ok' : 'degraded',
        db: dbStatus,
        redis: redisStatus,
        uptime: process.uptime(),
      })
    },
  )
}
