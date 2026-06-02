import { describe, it, expect, afterEach } from 'vitest'
import type { AddressInfo } from 'net'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import { createGameServer } from '../src/createGameServer.js'

// Reproduces the reported bug: after finishing a singleplayer game and starting
// a NEW one on the same socket connection, the first bet must actually register
// (and trigger a spin) instead of silently routing to the now-removed old room.

/**
 * Buffers every occurrence of an event so none are missed between awaits
 * (Socket.IO can deliver several events in one frame). `next()` pulls the next
 * occurrence, waiting if necessary.
 */
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

describe('starting a new singleplayer game after game over (same socket)', () => {
  let cleanup: () => Promise<void>

  afterEach(() => cleanup?.())

  it('registers the first bet of the new game and spins', async () => {
    // Force result = 1 (red, odd, number 1). Betting $100 on number 1 pays 35:1
    // → +$3500 each win, so two wins take the player past the $5000 target.
    const { httpServer, io } = createGameServer({
      spin: () => 1,
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

    // Attach buffered recorders up front so no event is ever dropped.
    const joined = record(client, 'room:joined')
    const betting = record(client, 'game:bettingOpen')
    const spun = record(client, 'game:spinResult')
    const over = record(client, 'game:over')

    await new Promise<void>(r => client.on('connect', () => r()))

    // --- Game 1: play to game over ---
    client.emit('room:create', { nickname: 'Solo', isSingleplayer: true })
    await joined()
    await betting()
    client.emit('game:bet', { type: 'number', amount: 100, number: 1 }) // 1000 → 4500
    await spun()
    await betting()
    client.emit('game:bet', { type: 'number', amount: 100, number: 1 }) // 4500 → 8000 ≥ 5000
    await spun()
    await over()

    // --- Game 2: brand new game on the SAME socket connection ---
    client.emit('room:create', { nickname: 'Solo', isSingleplayer: true })
    await joined()
    await betting()

    // The bug: this bet was misrouted to the removed first room and dropped,
    // so no spin ever happened and the player "waited" forever.
    client.emit('game:bet', { type: 'number', amount: 100, number: 1 })
    const result = await spun()
    expect(result.number).toBe(1)
  })
})
