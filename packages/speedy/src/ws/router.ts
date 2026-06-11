import type { ClientEvent } from '@kakdela/ginzu/ws-events'

import { presence } from '../presence/store.js'
import { broadcastToChannel, broadcastToServer } from './broadcast.js'
import type { Connection } from './connection.js'

export function dispatchClientEvent(conn: Connection, event: ClientEvent): void {
  switch (event.t) {
    case 'hello':
      // Already handled at handshake time — ignore re-hellos.
      return

    case 'pong':
      conn.handlePong()
      return

    case 'ping':
      conn.send({ t: 'pong' })
      return

    case 'typing': {
      // Silently ignore typing for channels we don't watch — could be a
      // legitimate race when the channel was just deleted, no need to drop
      // the socket.
      if (!conn.subscribedChannels.has(event.channelId)) return
      void broadcastToChannel(event.channelId, {
        t: 'typing',
        channelId: event.channelId,
        userId: conn.userId,
      })
      return
    }

    case 'presence': {
      void (async () => {
        await presence.setStatus(conn.userId, event.status)
        for (const sid of conn.subscribedServers) {
          await broadcastToServer(sid, {
            t: 'presence',
            userId: conn.userId,
            status: event.status,
          })
        }
      })()
      return
    }
  }
}
