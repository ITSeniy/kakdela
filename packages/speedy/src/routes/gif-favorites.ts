// Избранные гифки пользователя. Хранятся на бэкенде (per-user), чтобы
// синхронизироваться между десктопом и будущим мобильным клиентом. В избранное
// попадают как GIPHY-гифки из пикера, так и любые загруженные .gif-вложения.

import { and, desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  AddGifFavoriteRequestSchema,
  ErrorBodySchema,
  GifFavoriteSchema,
  GifFavoritesResponseSchema,
} from '@kakdela/ginzu/api-types'

import { gifFavorites } from '../db/schema.js'
import { db } from '../lib/db.js'

const FAV_COLS = {
  id:         gifFavorites.id,
  gifUrl:     gifFavorites.gifUrl,
  mp4Url:     gifFavorites.mp4Url,
  previewUrl: gifFavorites.previewUrl,
  width:      gifFavorites.width,
  height:     gifFavorites.height,
  title:      gifFavorites.title,
  createdAt:  gifFavorites.createdAt,
}

interface FavRow {
  id: string
  gifUrl: string
  mp4Url: string | null
  previewUrl: string
  width: number
  height: number
  title: string
  createdAt: Date
}

function serialize(r: FavRow) {
  return {
    id:         r.id,
    gifUrl:     r.gifUrl,
    mp4Url:     r.mp4Url,
    previewUrl: r.previewUrl,
    width:      r.width,
    height:     r.height,
    title:      r.title,
    createdAt:  r.createdAt.toISOString(),
  }
}

export const gifFavoritesRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/gif-favorites ─────
  app.get(
    '/gif-favorites',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: GifFavoritesResponseSchema, 401: ErrorBodySchema } },
    },
    async (req, reply) => {
      const rows = await db
        .select(FAV_COLS)
        .from(gifFavorites)
        .where(eq(gifFavorites.userId, req.authUser!.id))
        .orderBy(desc(gifFavorites.createdAt))
        .limit(200)
      return reply.code(200).send({ favorites: rows.map(serialize) })
    },
  )

  // ───── POST /api/gif-favorites ─────
  // Идемпотентно: повторное добавление той же gifUrl возвращает существующую
  // запись (uniqueIndex по user_id+gif_url, ON CONFLICT DO NOTHING).
  app.post(
    '/gif-favorites',
    {
      preHandler: app.authenticate,
      schema: {
        body: AddGifFavoriteRequestSchema,
        response: { 201: GifFavoriteSchema, 200: GifFavoriteSchema, 401: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      const userId = req.authUser!.id
      const b = req.body
      const inserted = await db
        .insert(gifFavorites)
        .values({
          userId,
          gifUrl:     b.gifUrl,
          mp4Url:     b.mp4Url ?? null,
          previewUrl: b.previewUrl,
          width:      b.width,
          height:     b.height,
          title:      b.title ?? '',
        })
        .onConflictDoNothing()
        .returning(FAV_COLS)

      if (inserted[0]) return reply.code(201).send(serialize(inserted[0]))

      // Уже в избранном — отдаём существующую.
      const existing = await db
        .select(FAV_COLS)
        .from(gifFavorites)
        .where(and(eq(gifFavorites.userId, userId), eq(gifFavorites.gifUrl, b.gifUrl)))
        .limit(1)
      return reply.code(200).send(serialize(existing[0]!))
    },
  )

  // ───── DELETE /api/gif-favorites/:id ─────
  app.delete(
    '/gif-favorites/:id',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.null(), 401: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      await db
        .delete(gifFavorites)
        .where(and(eq(gifFavorites.id, req.params.id), eq(gifFavorites.userId, req.authUser!.id)))
      return reply.code(204).send(null)
    },
  )
}
