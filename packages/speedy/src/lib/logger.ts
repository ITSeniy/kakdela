import type { FastifyServerOptions } from 'fastify'
import { env } from '../env.js'

export function makeLoggerOptions(): FastifyServerOptions['logger'] {
  return env.NODE_ENV === 'development'
    ? { level: env.SPEEDY_LOG_LEVEL, transport: { target: 'pino-pretty' } }
    : { level: env.SPEEDY_LOG_LEVEL }
}
