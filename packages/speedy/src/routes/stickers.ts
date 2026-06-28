// Стикеры сервера. Близнец routes/emoji.ts: server-scoped, base64-upload в
// JSON-body, magic-bytes валидация, объект в S3 (тот же emoji-bucket, префикс
// `stickers/`). Отличия: крупнее (≤512 КБ, ≤320×320), формат +webp, хранится
// width/height (для рендера снимка StickerRef), управление под MANAGE_EMOJI.

import { Buffer } from 'node:buffer'

import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { eq, sql } from 'drizzle-orm'
import { fileTypeFromBuffer } from 'file-type'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import probe from 'probe-image-size'
import { z } from 'zod'

import {
  CreateStickerRequestSchema,
  ErrorBodySchema,
  STICKER_MAX_BYTES,
  STICKER_MAX_DIMENSION,
  StickerListResponseSchema,
  StickerSchema,
  type Sticker,
} from '@kakdela/ginzu/api-types'

import { stickers as stickersTable } from '../db/schema.js'
import { db } from '../lib/db.js'
import { assertMember, assertPermission, notFound } from '../lib/permissions.js'
import { S3_EMOJI_BUCKET, emojiPublicUrl, s3 } from '../lib/s3.js'

const STICKERS_PER_SERVER = 100

type StickerRow = {
  id: string
  serverId: string
  name: string
  imageUrl: string
  animated: boolean
  width: number
  height: number
  createdAt: Date
}

const STICKER_COLS = {
  id:        stickersTable.id,
  serverId:  stickersTable.serverId,
  name:      stickersTable.name,
  imageUrl:  stickersTable.imageUrl,
  animated:  stickersTable.animated,
  width:     stickersTable.width,
  height:    stickersTable.height,
  createdAt: stickersTable.createdAt,
}

function toSticker(row: StickerRow): Sticker {
  return {
    id:        row.id,
    serverId:  row.serverId,
    name:      row.name,
    imageUrl:  row.imageUrl,
    animated:  row.animated,
    width:     row.width,
    height:    row.height,
    createdAt: row.createdAt.toISOString(),
  }
}

async function deleteStickerObject(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_EMOJI_BUCKET, Key: key }))
  } catch (err) {
    console.warn('[sticker] failed to delete object', key, err)
  }
}

export const stickersRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/servers/:serverId/stickers ─────
  app.get(
    '/servers/:serverId/stickers',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        response: { 200: StickerListResponseSchema, 401: ErrorBodySchema, 403: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      await assertMember(req.authUser!.id, serverId)
      const rows = await db
        .select(STICKER_COLS)
        .from(stickersTable)
        .where(eq(stickersTable.serverId, serverId))
        .orderBy(stickersTable.createdAt)
      return reply.code(200).send({ stickers: rows.map(toSticker) })
    },
  )

  // ───── POST /api/servers/:serverId/stickers ─────
  app.post(
    '/servers/:serverId/stickers',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        body: CreateStickerRequestSchema,
        response: {
          201: StickerSchema,
          400: ErrorBodySchema, 401: ErrorBodySchema, 403: ErrorBodySchema, 422: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id
      const { name, contentType, dataBase64 } = req.body

      await assertPermission(userId, serverId, 'MANAGE_EMOJI')

      const countRows = await db
        .select({ c: sql<number>`COUNT(*)::int` })
        .from(stickersTable)
        .where(eq(stickersTable.serverId, serverId))
      const existing = countRows[0]?.c ?? 0
      if (existing >= STICKERS_PER_SERVER) {
        return reply.code(422).send({
          error: { code: 'sticker-limit-reached', message: `на сервере уже ${existing} стикеров — это максимум` },
        })
      }

      const stripped = dataBase64.includes(',') ? dataBase64.slice(dataBase64.indexOf(',') + 1) : dataBase64
      let buf: Buffer
      try {
        buf = Buffer.from(stripped, 'base64')
      } catch {
        return reply.code(400).send({ error: { code: 'invalid-base64', message: 'data is not valid base64' } })
      }
      if (buf.length === 0) {
        return reply.code(400).send({ error: { code: 'invalid-base64', message: 'data decoded to zero bytes' } })
      }
      if (buf.length > STICKER_MAX_BYTES) {
        return reply.code(422).send({ error: { code: 'too-large', message: `файл больше ${STICKER_MAX_BYTES / 1024} КБ` } })
      }

      const detected = await fileTypeFromBuffer(buf)
      const allowed = ['image/png', 'image/gif', 'image/webp']
      if (!detected || !allowed.includes(detected.mime)) {
        return reply.code(422).send({ error: { code: 'magic-bytes-mismatch', message: 'поддерживаются только PNG, GIF и WebP' } })
      }
      if (detected.mime !== contentType) {
        return reply.code(422).send({
          error: { code: 'magic-bytes-mismatch', message: `заявленный ${contentType} не совпадает с реальным ${detected.mime}` },
        })
      }

      let width = 0
      let height = 0
      try {
        const dims = probe.sync(buf)
        if (dims) { width = dims.width; height = dims.height }
      } catch { /* нулевые dims → reject ниже */ }
      if (width <= 0 || height <= 0) {
        return reply.code(422).send({ error: { code: 'invalid-image', message: 'не удалось определить размеры' } })
      }
      if (width > STICKER_MAX_DIMENSION || height > STICKER_MAX_DIMENSION) {
        return reply.code(422).send({
          error: { code: 'too-large', message: `максимум ${STICKER_MAX_DIMENSION}×${STICKER_MAX_DIMENSION}, у вас ${width}×${height}` },
        })
      }

      const ext = detected.mime === 'image/gif' ? 'gif' : detected.mime === 'image/webp' ? 'webp' : 'png'
      const animated = detected.mime !== 'image/png'

      // Сначала строка в БД (получаем id для ключа), потом объект в S3, потом
      // апдейт url/key — как у эмодзи: при сбое S3 откатываем строку.
      const insertRows = await db
        .insert(stickersTable)
        .values({ serverId, name, imageUrl: '', storageKey: '', animated, width, height, uploadedBy: userId })
        .returning({ id: stickersTable.id })
      const inserted = insertRows[0]
      if (!inserted) throw new Error('insert sticker returned no rows')

      const key = `stickers/${serverId}/${inserted.id}.${ext}`
      const url = emojiPublicUrl(key)
      try {
        await s3.send(new PutObjectCommand({
          Bucket: S3_EMOJI_BUCKET,
          Key: key,
          Body: buf,
          ContentType: detected.mime,
          CacheControl: 'public, max-age=31536000, immutable',
        }))
      } catch (err) {
        await db.delete(stickersTable).where(eq(stickersTable.id, inserted.id))
        req.log.error({ err, serverId, name }, '[sticker] upload to S3 failed')
        return reply.code(422).send({ error: { code: 'upload-failed', message: 'не удалось загрузить файл в хранилище' } })
      }

      const updated = await db
        .update(stickersTable)
        .set({ imageUrl: url, storageKey: key })
        .where(eq(stickersTable.id, inserted.id))
        .returning(STICKER_COLS)
      const fresh = updated[0]
      if (!fresh) throw new Error('update sticker returned no rows')

      return reply.code(201).send(toSticker(fresh))
    },
  )

  // ───── DELETE /api/stickers/:id ─────
  app.delete(
    '/stickers/:id',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.null(), 401: ErrorBodySchema, 403: ErrorBodySchema, 404: ErrorBodySchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params
      const rows = await db
        .select({ id: stickersTable.id, serverId: stickersTable.serverId, storageKey: stickersTable.storageKey })
        .from(stickersTable)
        .where(eq(stickersTable.id, id))
        .limit(1)
      const row = rows[0]
      if (!row) throw notFound('sticker-not-found', 'sticker not found')

      await assertPermission(req.authUser!.id, row.serverId, 'MANAGE_EMOJI')

      await db.delete(stickersTable).where(eq(stickersTable.id, id))
      if (row.storageKey) await deleteStickerObject(row.storageKey)

      return reply.code(204).send(null)
    },
  )
}
