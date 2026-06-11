// Дев-only роут, нужный только чтобы прогнать `livekit-cli load-test --token ...`
// и убедиться, что guido выдаёт валидный токен. Подключаемся в index.ts
// только если NODE_ENV === 'development'.
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { issueToken } from '../media/guido.js'

const DebugTokenSchema = z.object({
  token: z.string(),
  url: z.string(),
  room: z.string(),
})

const DEFAULT_CHANNEL_ID = '00000000-0000-0000-0000-000000000000'
const DEFAULT_USER_ID = 'debug-user'

export const voiceDebugRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/internal/livekit-debug',
    {
      schema: {
        querystring: z.object({
          channelId: z.string().default(DEFAULT_CHANNEL_ID),
          userId: z.string().default(DEFAULT_USER_ID),
          displayName: z.string().default('Debug User'),
        }),
        response: { 200: DebugTokenSchema },
      },
    },
    async (req) => {
      const { channelId, userId, displayName } = req.query
      return issueToken({ userId, channelId, displayName })
    },
  )
}
