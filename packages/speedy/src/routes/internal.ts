import { WebhookReceiver } from 'livekit-server-sdk'
import type { FastifyPluginAsync } from 'fastify'

import { env } from '../env.js'
import { alreadyProcessed, handleWebhookEvent } from '../media/webhook.js'

// Внутренние эндпоинты — вызываются другими сервисами (сейчас только LiveKit),
// не пользовательскими клиентами. Прячем за `/api/internal/*` и не выставляем
// в Caddy наружу в проде.
export const internalRoutes: FastifyPluginAsync = async (app) => {
  // LiveKit подписывает webhook'и JWT-токеном, в `sha256`-клейме которого
  // лежит хэш ровно того body, что прилетел. Чтобы валидация сработала,
  // нам нужен оригинальный текст тела — не parsed JSON. Парсер
  // переопределён только для этого плагина (encapsulation Fastify).
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body)
    },
  )

  const receiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET)

  app.post('/internal/livekit-webhook', async (req, reply) => {
    const body = req.body
    if (typeof body !== 'string') {
      return reply.code(400).send({
        error: { code: 'bad-body', message: 'expected raw json body' },
      })
    }

    // Разные версии LiveKit использовали "Authorization" и "Authorize" —
    // Node lowercas'ит заголовки, проверяем оба.
    const authHeader =
      (req.headers['authorization'] as string | undefined) ??
      (req.headers['authorize'] as string | undefined)
    if (!authHeader) {
      return reply.code(401).send({
        error: { code: 'missing-auth', message: 'webhook auth header missing' },
      })
    }

    let event
    try {
      event = await receiver.receive(body, authHeader)
    } catch (err) {
      app.log.warn({ err }, 'livekit-webhook: invalid signature')
      return reply.code(401).send({
        error: { code: 'invalid-signature', message: 'webhook signature invalid' },
      })
    }

    if (await alreadyProcessed(event.id)) {
      return reply.code(200).send({ ok: true, dedup: true })
    }

    try {
      await handleWebhookEvent(event, app.log)
    } catch (err) {
      app.log.error(
        { err, eventId: event.id, type: event.event },
        'livekit-webhook: handler failed',
      )
      // Возвращаем 200, чтобы LiveKit не ретраил вечно: вебхуки — best-effort
      // presence, ничего необратимого тут не происходит, всё пересчитается
      // следующим событием или GET /participants.
      return reply.code(200).send({ ok: false })
    }

    return reply.code(200).send({ ok: true })
  })
}
