// Фоновый sweeper автоудаления сообщений. Каналы с channels.auto_delete_sec
// гасят сообщения старше указанного срока: soft-delete (deletedAt + пустой
// content) + WS msg.delete, чтобы у открытых клиентов сообщение пропало.
//
// Запускается из index.ts после listen. Интервал — раз в 30 минут, плюс один
// прогон через минуту после старта. Лёгкий: один UPDATE на канал.

import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'

import { channels, messages } from '../db/schema.js'
import { db } from './db.js'
import { broadcastToChannel } from '../ws/broadcast.js'

const SWEEP_INTERVAL_MS = 30 * 60 * 1000
const FIRST_SWEEP_DELAY_MS = 60 * 1000
// Защита от лавины broadcast'ов, если накопился большой бэклог: за один прогон
// канала гасим не больше N сообщений (остаток добьётся в следующий проход).
const MAX_PER_CHANNEL = 1000

async function sweepOnce(log: FastifyBaseLogger): Promise<void> {
  const chs = await db
    .select({ id: channels.id, sec: channels.autoDeleteSec })
    .from(channels)
    .where(isNotNull(channels.autoDeleteSec))

  for (const ch of chs) {
    if (!ch.sec || ch.sec <= 0) continue
    const cutoff = new Date(Date.now() - ch.sec * 1000)
    const deleted = await db
      .update(messages)
      .set({ deletedAt: new Date(), content: '' })
      .where(and(
        eq(messages.channelId, ch.id),
        isNull(messages.deletedAt),
        lt(messages.createdAt, cutoff),
      ))
      .returning({ id: messages.id })

    const ids = deleted.slice(0, MAX_PER_CHANNEL)
    for (const d of ids) {
      void broadcastToChannel(ch.id, { t: 'msg.delete', channelId: ch.id, messageId: d.id })
    }
    if (deleted.length > 0) {
      log.info({ channelId: ch.id, count: deleted.length }, 'auto-delete swept channel')
    }
  }
}

/** Запускает периодический sweeper. Возвращает функцию остановки. */
export function startAutoDeleteSweeper(log: FastifyBaseLogger): () => void {
  const run = () => {
    sweepOnce(log).catch((err) => log.error({ err }, 'auto-delete sweep failed'))
  }
  const interval = setInterval(run, SWEEP_INTERVAL_MS)
  const first = setTimeout(run, FIRST_SWEEP_DELAY_MS)
  return () => { clearInterval(interval); clearTimeout(first) }
}
