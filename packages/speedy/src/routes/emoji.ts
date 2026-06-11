import { Buffer } from 'node:buffer'

import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { eq, sql } from 'drizzle-orm'
import { fileTypeFromBuffer } from 'file-type'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import probe from 'probe-image-size'
import { z } from 'zod'

import {
  CUSTOM_EMOJI_MAX_BYTES,
  CUSTOM_EMOJI_MAX_DIMENSION,
  CreateEmojiRequestSchema,
  CustomEmojiSchema,
  EmojiListResponseSchema,
  ErrorBodySchema,
  type CustomEmoji,
} from '@kakdela/ginzu/api-types'

import { emoji as emojiTable } from '../db/schema.js'
import { audit } from '../lib/audit.js'
import { db } from '../lib/db.js'
import { assertMember, assertRole, notFound } from '../lib/permissions.js'
import { S3_EMOJI_BUCKET, emojiPublicUrl, s3 } from '../lib/s3.js'
import { env } from '../env.js'

function toCustomEmoji(row: {
  id: string
  serverId: string
  name: string
  imageUrl: string
  animated: boolean
  createdAt: Date
}): CustomEmoji {
  return {
    id:        row.id,
    serverId:  row.serverId,
    name:      row.name,
    imageUrl:  row.imageUrl,
    animated:  row.animated,
    createdAt: row.createdAt.toISOString(),
  }
}

async function deleteEmojiObject(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_EMOJI_BUCKET, Key: key }))
  } catch (err) {
    // Best-effort: bucket entry stays orphaned but DB row is gone.
    console.warn('[emoji] failed to delete object', key, err)
  }
}

export const emojiRoutes: FastifyPluginAsyncZod = async (app) => {
  // ───── GET /api/servers/:serverId/emoji ─────
  //
  // Список emoji сервера для members. Один запрос на сервер — клиент держит
  // результат в TanStack Query и резолвит `:name:` через эту карту.
  app.get(
    '/servers/:serverId/emoji',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        response: {
          200: EmojiListResponseSchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id
      await assertMember(userId, serverId)

      const rows = await db
        .select({
          id:        emojiTable.id,
          serverId:  emojiTable.serverId,
          name:      emojiTable.name,
          imageUrl:  emojiTable.imageUrl,
          animated:  emojiTable.animated,
          createdAt: emojiTable.createdAt,
        })
        .from(emojiTable)
        .where(eq(emojiTable.serverId, serverId))
        .orderBy(emojiTable.name)

      return reply.code(200).send({ emoji: rows.map(toCustomEmoji) })
    },
  )

  // ───── POST /api/servers/:serverId/emoji ─────
  //
  // Загрузка нового emoji (только admin/owner). Файл приходит как base64 в
  // JSON-body: при 256 KB лимите это даёт ~340 KB чистого base64, что в
  // десятки раз меньше дефолтного 1 MB body-limit Fastify — поэтому смысла
  // в presigned-upload (как у обычных attachments) тут нет.
  //
  // Server валидирует:
  //   1. лимит количества emoji per server (EMOJI_PER_SERVER)
  //   2. размер raw bytes ≤ 256 KB
  //   3. magic bytes (image/png или image/gif), не доверяя contentType
  //   4. dimensions ≤ 128×128 (probe-image-size)
  //   5. уникальность имени в рамках сервера (DB unique index)
  app.post(
    '/servers/:serverId/emoji',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ serverId: z.string().uuid() }),
        body: CreateEmojiRequestSchema,
        response: {
          201: CustomEmojiSchema,
          400: ErrorBodySchema,
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          409: ErrorBodySchema,
          422: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { serverId } = req.params
      const userId = req.authUser!.id
      const { name, contentType, dataBase64 } = req.body

      await assertRole(userId, serverId, ['owner', 'admin'])

      const existingRows = await db
        .select({ c: sql<number>`COUNT(*)::int` })
        .from(emojiTable)
        .where(eq(emojiTable.serverId, serverId))
      const existing = existingRows[0]?.c ?? 0
      if (existing >= env.EMOJI_PER_SERVER) {
        return reply.code(422).send({
          error: {
            code: 'emoji-limit-reached',
            message: `на сервере уже ${existing} emoji — это максимум`,
          },
        })
      }

      // Drop optional `data:image/...;base64,` prefix if the client included it.
      const stripped = dataBase64.includes(',')
        ? dataBase64.slice(dataBase64.indexOf(',') + 1)
        : dataBase64
      let buf: Buffer
      try {
        buf = Buffer.from(stripped, 'base64')
      } catch {
        return reply.code(400).send({
          error: { code: 'invalid-base64', message: 'data is not valid base64' },
        })
      }

      if (buf.length === 0) {
        return reply.code(400).send({
          error: { code: 'invalid-base64', message: 'data decoded to zero bytes' },
        })
      }
      if (buf.length > CUSTOM_EMOJI_MAX_BYTES) {
        return reply.code(422).send({
          error: { code: 'too-large', message: `файл больше ${CUSTOM_EMOJI_MAX_BYTES / 1024} КБ` },
        })
      }

      const detected = await fileTypeFromBuffer(buf)
      if (!detected || (detected.mime !== 'image/png' && detected.mime !== 'image/gif')) {
        return reply.code(422).send({
          error: {
            code: 'magic-bytes-mismatch',
            message: 'поддерживаются только PNG и GIF',
          },
        })
      }
      if (detected.mime !== contentType) {
        return reply.code(422).send({
          error: {
            code: 'magic-bytes-mismatch',
            message: `заявленный ${contentType} не совпадает с реальным ${detected.mime}`,
          },
        })
      }

      let width = 0
      let height = 0
      try {
        const dims = probe.sync(buf)
        if (dims) { width = dims.width; height = dims.height }
      } catch {
        // fall through — нулевые dims вызовут rejection ниже
      }
      if (width <= 0 || height <= 0) {
        return reply.code(422).send({
          error: { code: 'invalid-image', message: 'не удалось определить размеры' },
        })
      }
      if (width > CUSTOM_EMOJI_MAX_DIMENSION || height > CUSTOM_EMOJI_MAX_DIMENSION) {
        return reply.code(422).send({
          error: {
            code: 'too-large',
            message: `максимум ${CUSTOM_EMOJI_MAX_DIMENSION}×${CUSTOM_EMOJI_MAX_DIMENSION}, у вас ${width}×${height}`,
          },
        })
      }

      const ext = detected.mime === 'image/gif' ? 'gif' : 'png'
      const animated = detected.mime === 'image/gif'

      // Сначала пишем в S3, потом в БД: если упадёт INSERT (например, на
      // unique-индексе по имени) — у нас будет одинокий объект в bucket'е, но
      // не «фантомная» запись в БД, ссылающаяся на 404.
      const insertRows = await db
        .insert(emojiTable)
        .values({
          serverId,
          name,
          imageUrl:   '',
          storageKey: '',
          animated,
          uploadedBy: userId,
        })
        .onConflictDoNothing({ target: [emojiTable.serverId, emojiTable.name] })
        .returning({ id: emojiTable.id })
      const inserted = insertRows[0]
      if (!inserted) {
        return reply.code(409).send({
          error: { code: 'emoji-name-taken', message: `emoji :${name}: уже существует` },
        })
      }

      const key = `${serverId}/${inserted.id}.${ext}`
      const url = emojiPublicUrl(key)
      try {
        await s3.send(new PutObjectCommand({
          Bucket: S3_EMOJI_BUCKET,
          Key: key,
          Body: buf,
          ContentType: detected.mime,
          // Public bucket + immutable URL → safe to cache aggressively.
          CacheControl: 'public, max-age=31536000, immutable',
        }))
      } catch (err) {
        await db.delete(emojiTable).where(eq(emojiTable.id, inserted.id))
        req.log.error({ err, serverId, name }, '[emoji] upload to S3 failed')
        return reply.code(422).send({
          error: { code: 'upload-failed', message: 'не удалось загрузить файл в хранилище' },
        })
      }

      const updated = await db
        .update(emojiTable)
        .set({ imageUrl: url, storageKey: key })
        .where(eq(emojiTable.id, inserted.id))
        .returning({
          id:        emojiTable.id,
          serverId:  emojiTable.serverId,
          name:      emojiTable.name,
          imageUrl:  emojiTable.imageUrl,
          animated:  emojiTable.animated,
          createdAt: emojiTable.createdAt,
        })
      const fresh = updated[0]
      if (!fresh) throw new Error('update emoji returned no rows')

      audit.log({
        serverId,
        actorId:    userId,
        action:     'emoji.create',
        targetType: 'emoji',
        targetId:   fresh.id,
        metadata: { name: fresh.name, animated: fresh.animated },
      })

      return reply.code(201).send(toCustomEmoji(fresh))
    },
  )

  // ───── DELETE /api/emoji/:id ─────
  //
  // Удаление — только admin/owner соответствующего сервера. Объект из bucket'а
  // удаляется best-effort: уже отправленные сообщения с этим emoji продолжат
  // рендериться (CDN/браузер закешировали URL), но в picker'е его не будет.
  app.delete(
    '/emoji/:id',
    {
      preHandler: app.authenticate,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          204: z.null(),
          401: ErrorBodySchema,
          403: ErrorBodySchema,
          404: ErrorBodySchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params
      const userId = req.authUser!.id

      const rows = await db
        .select({
          id:         emojiTable.id,
          serverId:   emojiTable.serverId,
          name:       emojiTable.name,
          storageKey: emojiTable.storageKey,
        })
        .from(emojiTable)
        .where(eq(emojiTable.id, id))
        .limit(1)
      const row = rows[0]
      if (!row) throw notFound('emoji-not-found', 'emoji not found')

      await assertRole(userId, row.serverId, ['owner', 'admin'])

      await db.delete(emojiTable).where(eq(emojiTable.id, id))
      if (row.storageKey) await deleteEmojiObject(row.storageKey)

      audit.log({
        serverId:   row.serverId,
        actorId:    userId,
        action:     'emoji.delete',
        targetType: 'emoji',
        targetId:   null,
        metadata: { name: row.name },
      })

      return reply.code(204).send(null)
    },
  )
}

