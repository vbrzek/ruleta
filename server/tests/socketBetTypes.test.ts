import { describe, it, expect, afterEach } from 'vitest'
import type { AddressInfo } from 'net'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import { createGameServer } from '../src/createGameServer.js'

// Regression: the socket-layer `game:bet` handler keeps its own allowlist of
// valid bet types, separate from GameRoom validation. Newly added outside bets
// (low/high/dozen/column) must pass through it and actually trigger a spin.

function record(socket: ClientSocket, event: string) {
  const queue: unknown[] = []
  const waiters: Array<(p: unknown) => void> = []
  socket.on(event, (payload: unknown) => {
    const w = waiters.shift()
    if (w) w(payload)
    else queue.push(payload)
  })
  return function next(timeoutMs = 2000): Promise<any> {
    if (queue.length) return Promise.resolve(queue.shift())
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs)
      waiters.push(p => { clearTimeout(timer); resolve(p) })
    })
  }
}

describe('socket game:bet accepts the new outside bet types', () => {
  let cleanup: () => Promise<void>
  afterEach(() => cleanup?.())

  it('a column bet triggers a spin (not rejected as invalid type)', async () => {
    // Force result = 3 → column 3 wins (2:1): 1000 → 1200.
    const { httpServer, io } = createGameServer({
      spin: () => 3,
      spinDurationMs: 10,
      resultDurationMs: 10,
    })
    await new Promise<void>(r => httpServer.listen(0, r))
    const port = (httpServer.address() as AddressInfo).port
    const client = ioClient(`http://localhost:${port}`, { transports: ['websocket'] })

    cleanup = async () => {
      client.disconnect()
      io.close()
      await new Promise<void>(r => httpServer.close(() => r()))
    }

    const joined = record(client, 'room:joined')
    const betting = record(client, 'game:bettingOpen')
    const spun = record(client, 'game:spinResult')
    const error = record(client, 'room:error')

    await new Promise<void>(r => client.on('connect', () => r()))

    client.emit('room:create', { nickname: 'Solo', isSingleplayer: true })
    await joined()
    await betting()

    client.emit('game:bet', { type: 'column', amount: 100, number: 3 })
    const result = await spun()
    expect(result.number).toBe(3)
    expect(result.newBalances[client.id!]).toBe(1200)

    // No invalid-type error should have been emitted
    await expect(error(150)).rejects.toThrow(/Timed out/)
  })
})
