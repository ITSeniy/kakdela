import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { verifyAccessToken } from './tokens.js'

export interface AuthUser {
  id: string
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    authUser?: AuthUser
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return reply.code(401).send({ error: { code: 'unauthorized', message: 'missing bearer token' } })
    }
    const token = header.slice('Bearer '.length).trim()
    const result = await verifyAccessToken(token)
    if (!result.ok) {
      return reply.code(401).send({ error: { code: result.reason, message: result.reason } })
    }
    req.authUser = { id: result.payload.sub }
  })
}

export const authPlugin = fp(plugin, { name: 'kakdela-auth' })
