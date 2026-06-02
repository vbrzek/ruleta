import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Capture the socket event handlers the store registers, and expose a fake socket.
const { handlers, fakeSocket } = vi.hoisted(() => {
  const handlers: Record<string, (data: unknown) => void> = {}
  const fakeSocket = { id: 'me', on: () => {} }
  return { handlers, fakeSocket }
})

vi.mock('./socketStore', () => ({
  useSocketStore: () => ({
    getSocket: () => fakeSocket,
    on: (event: string, fn: (data: unknown) => void) => { handlers[event] = fn },
    off: () => {},
  }),
}))

import { useGameStore } from './gameStore'

function seedState(store: ReturnType<typeof useGameStore>) {
  store.gameState = {
    code: 'ABCD',
    phase: 'betting',
    players: [
      { id: 'me', nickname: 'A', balance: 1000, status: 'active', isHost: true },
      { id: 'other', nickname: 'B', balance: 1000, status: 'active', isHost: false },
    ],
    round: 0,
    currentBets: {},
    lastResult: undefined,
    isSingleplayer: false,
  } as any
}

describe('gameStore — lobby roster is captured from room:joined', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(handlers)) delete handlers[k]
  })

  it('populates lobbyPlayers on room:joined so the host sees themselves before the game starts', () => {
    const store = useGameStore()
    store.setupListeners()

    handlers['room:joined']({
      code: 'ABCD',
      isSingleplayer: false,
      players: [{ id: 'me', nickname: 'Host', balance: 1000, status: 'active', isHost: true }],
    })

    expect(store.lobbyPlayers).toHaveLength(1)
    expect(store.lobbyPlayers[0]).toMatchObject({ id: 'me', isHost: true })
  })

  it('adds and removes lobby players, and reassigns host', () => {
    const store = useGameStore()
    store.setupListeners()

    handlers['room:joined']({
      code: 'ABCD',
      isSingleplayer: false,
      players: [{ id: 'me', nickname: 'Host', balance: 1000, status: 'active', isHost: true }],
    })
    handlers['room:playerJoined']({
      player: { id: 'other', nickname: 'B', balance: 1000, status: 'active', isHost: false },
    })
    expect(store.lobbyPlayers.map(p => p.id)).toEqual(['me', 'other'])

    handlers['room:newHost']({ playerId: 'other' })
    expect(store.lobbyPlayers.find(p => p.id === 'other')!.isHost).toBe(true)
    expect(store.lobbyPlayers.find(p => p.id === 'me')!.isHost).toBe(false)

    handlers['room:playerLeft']({
      playerId: 'me',
      players: [{ id: 'other', nickname: 'B', balance: 1000, status: 'active', isHost: true }],
    })
    expect(store.lobbyPlayers.map(p => p.id)).toEqual(['other'])
  })
})

describe('gameStore — win/loss visualization must wait for the spin animation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(handlers)) delete handlers[k]
  })

  it('does not reveal new balances on game:spinResult — only after applySpinOutcome', () => {
    const store = useGameStore()
    store.setupListeners()
    seedState(store)

    // Server delivers the result up-front (it also waits for the animation).
    handlers['game:spinResult']({ number: 7, winners: { me: 3500 }, newBalances: { me: 4500 } })

    // The wheel needs the target + spinning phase to animate — those are fine early.
    expect(store.gameState!.phase).toBe('spinning')
    expect(store.gameState!.lastResult).toBe(7)

    // But the outcome must NOT be visible yet: balance unchanged, no flash trigger.
    expect(store.gameState!.players[0].balance).toBe(1000)
    expect(store.lastBalances).toEqual({})

    // Animation finished → commit the outcome.
    store.applySpinOutcome()

    expect(store.gameState!.players[0].balance).toBe(4500)
    expect(store.lastBalances).toEqual({ me: 4500 })
    expect(store.lastWinners).toEqual({ me: 3500 })
  })

  it('does not mark a bankrupt player as spectator until applySpinOutcome', () => {
    const store = useGameStore()
    store.setupListeners()
    seedState(store)

    handlers['game:spinResult']({ number: 0, winners: { me: 0 }, newBalances: { me: 0 } })
    handlers['game:playerBankrupt']({ playerId: 'me' })

    // Still spinning — must not reveal the bust.
    expect(store.gameState!.players[0].status).toBe('active')

    store.applySpinOutcome()

    expect(store.gameState!.players[0].status).toBe('spectator')
    expect(store.gameState!.players[0].balance).toBe(0)
  })
})
