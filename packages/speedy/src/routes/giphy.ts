// GIF-пикер через GIPHY-прокси. Ключ GIPHY живёт только на сервере (в клиент
// не отдаём). Beta-ключ ограничен 100 запросами/час, поэтому ВСЕ ответы
// кэшируются в Redis: тренды (общие для всех) — 10 минут, поисковые запросы —
// час. На 15-20 друзей это сводит реальные обращения к GIPHY к минимуму.

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  ErrorBodySchema,
  GiphyConfigSchema,
  GiphyResponseSchema,
  type GiphyGif,
  type GiphyResponse,
} from '@kakdela/ginzu/api-types'

import { env } from '../env.js'
import { redis } from '../lib/redis.js'

const TRENDING_TTL_S = 600    // 10 минут — тренды меняются медленно
const SEARCH_TTL_S = 3_600    // 1 час — один и тот же запрос не жжёт лимит

interface GiphyRendition { url?: string; width?: string; height?: string }
interface GiphyImages { [key: string]: GiphyRendition | undefined }
interface GiphyItem { id: string; title?: string; images: GiphyImages }

function pickRendition(images: GiphyImages, keys: string[]): GiphyRendition | undefined {
  for (const k of keys) {
    const r = images[k]
    if (r?.url) return r
  }
  return images.original
}

function normalize(items: GiphyItem[]): GiphyGif[] {
  const out: GiphyGif[] = []
  for (const g of items) {
    const preview = pickRendition(g.images, ['fixed_width_downsampled', 'fixed_width', 'fixed_height'])
    const full = pickRendition(g.images, ['downsized_medium', 'downsized', 'fixed_width', 'original'])
    if (!preview?.url || !full?.url) continue
    out.push({
      id:         g.id,
      url:        full.url,
      previewUrl: preview.url,
      width:      Number(preview.width) || 200,
      height:     Number(preview.height) || 200,
      title:      g.title ?? '',
    })
  }
  return out
}

/** Запрос к GIPHY с нормализацией + пагинацией. */
async function callGiphy(
  endpoint: 'trending' | 'search',
  params: Record<string, string>,
): Promise<GiphyResponse> {
  const url = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`)
  url.searchParams.set('api_key', env.GIPHY_API_KEY!)
  url.searchParams.set('rating', env.GIPHY_RATING)
  url.searchParams.set('bundle', 'messaging_non_clips')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (res.status === 429) {
    const e = new Error('giphy rate limit') as Error & { statusCode: number; code: string }
    e.statusCode = 429; e.code = 'giphy-rate-limited'
    throw e
  }
  if (!res.ok) {
    const e = new Error(`giphy ${res.status}`) as Error & { statusCode: number; code: string }
    e.statusCode = 502; e.code = 'giphy-upstream'
    throw e
  }
  const body = await res.json() as {
    data: GiphyItem[]
    pagination?: { offset: number; count: number; total_count: number }
  }
  const gifs = normalize(body.data ?? [])
  const p = body.pagination
  const nextOffset = p && p.offset + p.count < p.total_count ? p.offset + p.count : null
  return { gifs, nextOffset }
}

/** Кэш-обёртка: сначала Redis, при промахе — GIPHY + запись в кэш. */
async function cached(key: string, ttl: number, build: () => Promise<GiphyResponse>): Promise<GiphyResponse> {
  try {
    const hit = await redis.get(key)
    if (hit) return JSON.parse(hit) as GiphyResponse
  } catch { /* redis недоступен — просто идём в GIPHY */ }
  const fresh = await build()
  try {
    await redis.set(key, JSON.stringify(fresh), 'EX', ttl)
  } catch { /* запись в кэш не критична */ }
  return fresh
}

export const giphyRoutes: FastifyPluginAsyncZod = async (app) => {
  // Клиент спрашивает один раз: показывать ли кнопку GIF.
  app.get(
    '/giphy/config',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: GiphyConfigSchema, 401: ErrorBodySchema } },
    },
    async (_req, reply) => reply.code(200).send({ enabled: Boolean(env.GIPHY_API_KEY) }),
  )

  // Гард: без ключа GIF-эндпоинты возвращают 503 (клиент прячет кнопку и так).
  function ensureEnabled(reply: { code(n: number): { send(b: unknown): unknown } }): boolean {
    if (!env.GIPHY_API_KEY) {
      reply.code(503).send({ error: { code: 'giphy-disabled', message: 'GIF-поиск не настроен' } })
      return false
    }
    return true
  }

  app.get(
    '/giphy/trending',
    {
      preHandler: app.authenticate,
      schema: {
        querystring: z.object({
          offset: z.coerce.number().int().min(0).max(500).default(0),
          limit:  z.coerce.number().int().min(1).max(50).default(24),
        }),
        response: { 200: GiphyResponseSchema, 401: ErrorBodySchema, 502: ErrorBodySchema, 503: ErrorBodySchema, 429: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      if (!ensureEnabled(reply)) return reply
      const { offset, limit } = req.query
      const key = `giphy:trending:${env.GIPHY_RATING}:${offset}:${limit}`
      const data = await cached(key, TRENDING_TTL_S, () =>
        callGiphy('trending', { offset: String(offset), limit: String(limit) }),
      )
      return reply.code(200).send(data)
    },
  )

  app.get(
    '/giphy/search',
    {
      preHandler: app.authenticate,
      schema: {
        querystring: z.object({
          q:      z.string().trim().min(1).max(100),
          offset: z.coerce.number().int().min(0).max(500).default(0),
          limit:  z.coerce.number().int().min(1).max(50).default(24),
        }),
        response: { 200: GiphyResponseSchema, 401: ErrorBodySchema, 502: ErrorBodySchema, 503: ErrorBodySchema, 429: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      if (!ensureEnabled(reply)) return reply
      const { q, offset, limit } = req.query
      const key = `giphy:search:${env.GIPHY_RATING}:${q.toLowerCase()}:${offset}:${limit}`
      const data = await cached(key, SEARCH_TTL_S, () =>
        callGiphy('search', { q, offset: String(offset), limit: String(limit), lang: 'ru' }),
      )
      return reply.code(200).send(data)
    },
  )
}
