import type { WebSocket } from '@fastify/websocket'

import type { ServerEvent } from '@kakdela/ginzu/ws-events'

const PING_INTERVAL_MS = 25_000
const MAX_PENDING_PINGS = 2

export class Connection {
  readonly subscribedChannels = new Set<string>()
  readonly subscribedServers = new Set<string>()

  private pendingPings = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    readonly userId: string,
    readonly ws: WebSocket,
  ) {}

  subscribeTo(serverIds: readonly string[], channelIds: readonly string[]): void {
    for (const id of serverIds) this.subscribedServers.add(id)
    for (const id of channelIds) this.subscribedChannels.add(id)
  }

  send(event: ServerEvent): void {
    if (this.ws.readyState !== this.ws.OPEN) return
    try {
      this.ws.send(JSON.stringify(event))
    } catch { /* socket already gone */ }
  }

  close(code: number, reason: string): void {
    try { this.ws.close(code, reason) } catch { /* already closed */ }
  }

  startHeartbeat(): void {
    if (this.pingTimer) return
    this.pingTimer = setInterval(() => {
      this.pendingPings += 1
      if (this.pendingPings > MAX_PENDING_PINGS) {
        this.close(4408, 'heartbeat-timeout')
        return
      }
      this.send({ t: 'ping' })
    }, PING_INTERVAL_MS)
  }

  handlePong(): void {
    this.pendingPings = 0
  }

  cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}
