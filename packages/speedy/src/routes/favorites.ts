// Избранное пользователя (гифки/стикеры/эмодзи) — единая таблица favorites.
// kind фильтрует выборку, refKey даёт идемпотентность и дедуп.

import { and, desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  AddFavoriteRequestSchema,
  ErrorBodySchema,
  FavoriteKindSchema,
  FavoriteSchema,
  FavoritesResponseSchema,
  type FavoritePayload,
} from '@kakdela/ginzu/api-types'

import { favorites } from '../db/schema.js'
import { db } from '../lib/db.js'

const FAV_COLS = {
  id:        favorites.id,
  kind:      favorites.kind,
  refKey:    favorites.refKey,
  payload:   favorites.payload,
  createdAt: favorites.createdAt,
}

interface FavRow {
  id: string
  kind: 'gif' | 'sticker' | 'emoji'
  refKey: string
  payload: unknown
  createdAt: Date
}

function serialize(r: FavRow) {
  return {
    id:        r.id,
    kind:      r.kind,
    refKey:    r.refKey,
    payload:   r.payload as FavoritePayload,
    createdAt: r.createdAt.toISOString(),
  }
}

export const favoritesRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/favorites?kind=gif|sticker|emoji ─────
  app.get(
    '/favorites',
    {
      preHandler: app.authenticate,
      schema: {
        querystring: z.object({ kind: FavoriteKindSchema.optional() }),
        response: { 200: FavoritesResponseSchema, 401: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      const userId = req.authUser!.id
      const { kind } = req.query
      const where = kind
        ? and(eq(favorites.userId, userId), eq(favorites.kind, kind))
        : eq(favorites.userId, userId)
      const rows = await db
        .select(FAV_COLS)
        .from(favorites)
        .where(where)
        .orderBy(desc(favorites.createdAt))
        .limit(300)
      return reply.code(200).send({ favorites: rows.map(serialize) })
    },
  )

  // ───── POST /api/favorites ─────
  // Идемпотентно по (user, kind, ref_key): повтор возвращает существующую.
  app.post(
    '/favorites',
    {
      preHandler: app.authenticate,
      schema: {
        body: AddFavoriteRequestSchema,
        response: { 201: FavoriteSchema, 200: FavoriteSchema, 401: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      const userId = req.authUser!.id
      const { kind, refKey, payload } = req.body
      const inserted = await db
        .insert(favorites)
        .values({ userId, kind, refKey, payload })
        .onConflictDoNothing()
        .returning(FAV_COLS)

      if (inserted[0]) return reply.code(201).send(serialize(inserted[0]))

      const existing = await db
        .select(FAV_COLS)
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.kind, kind), eq(favorites.refKey, refKey)))
        .limit(1)
      return reply.code(200).send(serialize(existing[0]!))
    },
  )

  // ───── DELETE /api/favorites/:id ─────
  app.delete(
    '/favorites/:id',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.null(), 401: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      await db
        .delete(favorites)
        .where(and(eq(favorites.id, req.params.id), eq(favorites.userId, req.authUser!.id)))
      return reply.code(204).send(null)
    },
  )
}
