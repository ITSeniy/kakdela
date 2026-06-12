// Валидация переменных окружения. Падаем сразу с понятным сообщением,
// если что-то не задано.
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SPEEDY_PORT: z.coerce.number().default(3001),
  SPEEDY_HOST: z.string().default('0.0.0.0'),
  SPEEDY_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1, 'нужен DATABASE_URL'),
  REDIS_URL: z.string().min(1, 'нужен REDIS_URL'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET — минимум 32 символа'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET — минимум 32 символа'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  LIVEKIT_URL: z.string().default('ws://localhost:7880'),
  LIVEKIT_API_KEY: z.string().default('devkey'),
  LIVEKIT_API_SECRET: z.string(),

  S3_ENDPOINT: z.string(),
  // Endpoint, который видят КЛИЕНТЫ (presigned PUT, public GET). На VPS speedy
  // ходит в MinIO по docker-сети (http://minio:9000), а браузеру/Tauri нужен
  // публичный https-адрес (https://s3.<домен>). Не задан → равен S3_ENDPOINT.
  S3_PUBLIC_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('kakdela'),
  S3_EMOJI_BUCKET: z.string().default('kakdela-emoji'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),

  EMOJI_PER_SERVER: z.coerce.number().int().positive().default(50),

  PUBLIC_ORIGIN: z.string().url().default('http://localhost:1420'),
})

export type Env = z.infer<typeof EnvSchema>

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('[env] invalid config:\n' + JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
  process.exit(1)
}

export const env: Env = parsed.data
