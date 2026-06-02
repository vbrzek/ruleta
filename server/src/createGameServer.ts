// server/src/createGameServer.ts
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { RoomManager } from './RoomManager.js'
import { spin as defaultSpin } from './roulette.js'

export interface GameServerOptions {
  /** Spin function — injectable so tests can force deterministic results. */
  spin?: () => number
  /** Wait for client spin animation + result overlay. */
  spinDurationMs?: number
  /** Wait for result overlay before next betting round. */
  resultDurationMs?: number
}

export function createGameServer(opts: GameServerOptions = {}) {
  const spin = opts.spin ?? defaultSpin
  const SPIN_DURATION_MS = opts.spinDurationMs ?? 5500
  const RESULT_DURATION_MS = opts.resultDurationMs ?? 3000

  const app = express()
  app.use(cors())
  app.get('/health', (_req, res) => res.json({ ok: true }))

  const httpServer = createServer(app)
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  const rooms = new RoomManager()

  // Holds disconnected player state for reconnection window
  const disconnectedPlayers = new Map<string, { code: string; timeout: ReturnType<typeof setTimeout> }>()

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** Remove a finished room and detach all its sockets from the Socket.IO room. */
  function closeRoom(code: string): void {
    // Detach sockets BEFORE removing the room so a player who immediately
    // starts a new game on the same connection isn't left holding stale
    // Socket.IO room membership (which would misroute their next bet).
    io.in(code).socketsLeave(code)
    rooms.remove(code)
  }

  async function runGameLoop(code: string): Promise<void> {
    const room = rooms.get(code)
    if (!room) return

    while (true) {
      // Guard: if all players went bankrupt (e.g. singleplayer), end game immediately
      const activePlayers = room.getPlayers().filter(p => p.status === 'active')
      if (activePlayers.length === 0) {
        io.to(code).emit('game:over', { winner: null, leaderboard: room.getLeaderboard() })
        closeRoom(code)
        return
      }

      room.setPhase('betting')
      room.clearBets()

      if (room.isSingleplayer) {
        // Singleplayer: no countdown — spin immediately when player bets.
        // Safety timeout of 10 min handles browser close without disconnect.
        io.to(code).emit('game:bettingOpen', { timeLimit: 0 })
        await new Promise<void>(resolve => {
          const safety = setTimeout(resolve, 600_000)
          room.onAllBetsPlaced = () => { clearTimeout(safety); resolve() }
        })
      } else {
        // Multiplayer: 30-second shared betting window.
        io.to(code).emit('game:bettingOpen', { timeLimit: 30 })
        await new Promise<void>(resolve => {
          const timer = setTimeout(resolve, 30_000)
          room.onAllBetsPlaced = () => { clearTimeout(timer); resolve() }
        })
      }

      // Check room still exists (all players may have disconnected)
      if (!rooms.get(code)) return

      const result = spin()
      const { winners, newBalances } = room.executeRound(result)

      io.to(code).emit('game:spinResult', { number: result, winners, newBalances })

      // Notify bankruptcies
      for (const player of room.getPlayers()) {
        if (player.status === 'spectator' && newBalances[player.id] === 0) {
          io.to(code).emit('game:playerBankrupt', { playerId: player.id })
        }
      }

      // Wait for spin animation + result overlay on client
      await delay(SPIN_DURATION_MS)

      // Check end conditions
      const winner = room.checkGameOver()
      const soloWinner = !winner && room.getPlayers().length > 1
        ? room.onlyOneActivePlayer()
        : null

      if (winner || soloWinner) {
        io.to(code).emit('game:over', {
          winner: winner ?? soloWinner,
          leaderboard: room.getLeaderboard(),
        })
        closeRoom(code)
        return
      }

      io.to(code).emit('game:roundEnd', { gameState: room.getState() })
      await delay(RESULT_DURATION_MS)
    }
  }

  io.on('connection', socket => {
    console.log('connected:', socket.id)

    socket.on('room:create', ({ nickname, isSingleplayer = false }: { nickname: string; isSingleplayer?: boolean }) => {
      try {
        const room = rooms.create(socket.id, nickname, isSingleplayer)
        socket.join(room.code)
        socket.emit('room:joined', { code: room.code, players: room.getPlayers(), isSingleplayer })

        if (isSingleplayer) {
          // Auto-start: no lobby, no room:start handshake needed
          room.setPhase('betting')
          socket.emit('game:started', { gameState: room.getState() })
          runGameLoop(room.code)
        }
      } catch (e: unknown) {
        socket.emit('room:error', { message: (e as Error).message })
      }
    })

    socket.on('room:join', ({ code, nickname }: { code: string; nickname: string }) => {
      try {
        const room = rooms.join(code, socket.id, nickname)
        socket.join(room.code)
        socket.emit('room:joined', {
          code: room.code,
          players: room.getPlayers(),
          isSingleplayer: room.isSingleplayer,
        })
        socket.to(room.code).emit('room:playerJoined', { player: room.getPlayer(socket.id) })
      } catch (e: unknown) {
        socket.emit('room:error', { message: (e as Error).message })
      }
    })

    socket.on('room:start', ({ code }: { code: string }) => {
      const room = rooms.get(code)
      if (!room) return
      const player = room.getPlayer(socket.id)
      if (!player?.isHost) return
      if (room.phase !== 'lobby') return  // Already started
      room.setPhase('betting')
      io.to(code).emit('game:started', { gameState: room.getState() })
      runGameLoop(code)
    })

    socket.on('game:bet', ({ type, amount, number }: { type: string; amount: number; number?: number }) => {
      const code = [...socket.rooms].find(r => r !== socket.id)
      if (!code) return
      const room = rooms.get(code)
      if (!room) return
      const VALID_TYPES = new Set(['red', 'black', 'even', 'odd', 'number'])
      if (!VALID_TYPES.has(type)) {
        socket.emit('room:error', { message: 'Neplatný typ sázky' })
        return
      }
      try {
        room.placeBet(socket.id, { type: type as any, amount, number })
        socket.to(code).emit('game:playerBet', { playerId: socket.id })
      } catch (e: unknown) {
        socket.emit('room:error', { message: (e as Error).message })
      }
    })

    socket.on('disconnecting', () => {
      for (const code of socket.rooms) {
        if (code === socket.id) continue
        const room = rooms.get(code)
        if (!room) continue
        const player = room.getPlayer(socket.id)
        if (!player) continue

        // Hold the player's state for 60 s to allow reconnection
        const timeout = setTimeout(() => {
          disconnectedPlayers.delete(socket.id)
          const { newHostId, shouldClose } = room.removePlayer(socket.id)
          if (shouldClose) {
            rooms.remove(code)
          } else {
            if (newHostId) io.to(code).emit('room:newHost', { playerId: newHostId })
            io.to(code).emit('room:playerLeft', { playerId: socket.id, players: room.getPlayers() })
            if (room.phase === 'betting' && room.allActiveBetsPlaced()) {
              room.onAllBetsPlaced?.()
            }
          }
        }, 60_000)

        disconnectedPlayers.set(socket.id, { code, timeout })
      }
    })

    socket.on('room:rejoin', ({ code, oldId }: { code: string; oldId: string }) => {
      const held = disconnectedPlayers.get(oldId)
      if (!held || held.code !== code.toUpperCase()) {
        socket.emit('room:error', { message: 'Relace vypršela, připojte se znovu' })
        return
      }
      clearTimeout(held.timeout)
      disconnectedPlayers.delete(oldId)
      socket.join(code.toUpperCase())
      const room = rooms.get(code)
      if (room) {
        room.swapPlayerId(oldId, socket.id)
        socket.emit('room:joined', { code, players: room.getPlayers(), isSingleplayer: room.isSingleplayer })
        if (room.phase !== 'lobby') {
          socket.emit('game:started', { gameState: room.getState() })
        }
      }
    })
  })

  return { app, httpServer, io, rooms }
}
