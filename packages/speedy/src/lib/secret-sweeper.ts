// Retention секретных конвертов (T-102). Недоставленные (оффлайн-адресат так и
// не сходил в inbox) висят в очереди — чистим их старше 30 дней. Доставленные
// удаляются по ack сразу, до sweeper'а обычно не доживают.
//
// Запускается из index.ts после listen. Лёгкий: один DELETE.

import { lt } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'

import { secretEnvelopes } from '../db/schema.js'
import { db } from './db.js'

const RETENTION_DAYS = 30
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000   // раз в 6 часов
const FIRST_SWEEP_DELAY_MS = 5 * 60 * 1000

async function sweepOnce(log: FastifyBaseLogger): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const deleted = await db
    .delete(secretEnvelopes)
    .where(lt(secretEnvelopes.createdAt, cutoff))
    .returning({ id: secretEnvelopes.id })
  if (deleted.length > 0) {
    log.info({ count: deleted.length }, 'secret-envelope retention sweep')
  }
}

/** Запускает периодический retention-sweeper. Возвращает функцию остановки. */
export function startSecretEnvelopeSweeper(log: FastifyBaseLogger): () => void {
  const run = () => {
    sweepOnce(log).catch((err) => log.error({ err }, 'secret-envelope sweep failed'))
  }
  const interval = setInterval(run, SWEEP_INTERVAL_MS)
  const first = setTimeout(run, FIRST_SWEEP_DELAY_MS)
  return () => { clearInterval(interval); clearTimeout(first) }
}
