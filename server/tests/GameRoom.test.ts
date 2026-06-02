import { describe, it, expect, beforeEach } from 'vitest'
import { GameRoom } from '../src/GameRoom.js'

let room: GameRoom

beforeEach(() => {
  room = new GameRoom('TEST01', 'host1', 'Alice', false)
})

describe('constructor', () => {
  it('host is added with START_BALANCE $1000', () => {
    const players = room.getPlayers()
    expect(players).toHaveLength(1)
    expect(players[0]).toMatchObject({ id: 'host1', nickname: 'Alice', balance: 1000, isHost: true, status: 'active' })
  })
  it('phase is lobby', () => {
    expect(room.phase).toBe('lobby')
  })
})

describe('addPlayer', () => {
  it('adds up to 8 players total', () => {
    for (let i = 2; i <= 8; i++) room.addPlayer(`p${i}`, `Player${i}`)
    expect(room.getPlayers()).toHaveLength(8)
  })
  it('throws when room is full', () => {
    for (let i = 2; i <= 8; i++) room.addPlayer(`p${i}`, `Player${i}`)
    expect(() => room.addPlayer('p9', 'Extra')).toThrow('Místnost je plná')
  })
  it('throws when game is in progress', () => {
    room.setPhase('betting')
    expect(() => room.addPlayer('p2', 'Bob')).toThrow('Hra již probíhá')
  })
})

describe('removePlayer', () => {
  it('returns shouldClose=true when last player leaves', () => {
    expect(room.removePlayer('host1')).toEqual({ shouldClose: true })
  })
  it('transfers host to next player', () => {
    room.addPlayer('p2', 'Bob')
    const result = room.removePlayer('host1')
    expect(result.newHostId).toBe('p2')
    expect(room.getPlayer('p2')?.isHost).toBe(true)
  })
  it('returns shouldClose=false for non-host', () => {
    room.addPlayer('p2', 'Bob')
    expect(room.removePlayer('p2')).toEqual({ shouldClose: false })
  })
})

describe('placeBet', () => {
  beforeEach(() => room.setPhase('betting'))

  it('accepts valid even bet', () => {
    room.placeBet('host1', { type: 'even', amount: 100 })
    expect(room.allActiveBetsPlaced()).toBe(true)
  })
  it('accepts valid number bet', () => {
    room.placeBet('host1', { type: 'number', amount: 200, number: 17 })
    expect(room.allActiveBetsPlaced()).toBe(true)
  })
  it('throws for amount not multiple of 100', () => {
    expect(() => room.placeBet('host1', { type: 'even', amount: 150 })).toThrow('násobek 100')
  })
  it('throws for amount exceeding balance', () => {
    expect(() => room.placeBet('host1', { type: 'even', amount: 1100 })).toThrow('Neplatná částka')
  })
  it('throws when not in betting phase', () => {
    room.setPhase('spinning')
    expect(() => room.placeBet('host1', { type: 'even', amount: 100 })).toThrow('Sázení není otevřeno')
  })
  it('throws for invalid number (out of 0-36)', () => {
    expect(() => room.placeBet('host1', { type: 'number', amount: 100, number: 37 })).toThrow('Neplatné číslo')
  })
  it('accepts valid dozen and column bets', () => {
    room.placeBet('host1', { type: 'dozen', amount: 100, number: 2 })
    expect(room.allActiveBetsPlaced()).toBe(true)
  })
  it('throws for dozen selection out of 1-3', () => {
    expect(() => room.placeBet('host1', { type: 'dozen', amount: 100, number: 4 })).toThrow('Neplatná skupina')
  })
  it('throws for column selection out of 1-3', () => {
    expect(() => room.placeBet('host1', { type: 'column', amount: 100, number: 0 })).toThrow('Neplatná skupina')
  })
  it('calls onAllBetsPlaced when all active players bet', () => {
    let called = false
    room.onAllBetsPlaced = () => { called = true }
    room.placeBet('host1', { type: 'odd', amount: 100 })
    expect(called).toBe(true)
  })
})

describe('executeRound', () => {
  beforeEach(() => {
    room.setPhase('betting')
    room.placeBet('host1', { type: 'red', amount: 300 })
  })

  it('returns correct result number', () => {
    const { result } = room.executeRound(1) // 1 is red
    expect(result).toBe(1)
  })
  it('pays 1:1 profit for red win', () => {
    const { winners } = room.executeRound(1) // 1 is red → win
    expect(winners['host1']).toBe(300)
  })
  it('balance increases by profit on win', () => {
    room.executeRound(1) // red win
    expect(room.getPlayer('host1')?.balance).toBe(1300)
  })
  it('balance decreases by bet on loss', () => {
    room.executeRound(2) // 2 is black → red bet loses
    expect(room.getPlayer('host1')?.balance).toBe(700)
  })
  it('pays 35:1 for number bet win', () => {
    room.clearBets()
    room.placeBet('host1', { type: 'number', amount: 100, number: 7 })
    const { winners } = room.executeRound(7)
    expect(winners['host1']).toBe(3500)
    expect(room.getPlayer('host1')?.balance).toBe(4500)
  })
  it('sets player to spectator on bankruptcy', () => {
    room.clearBets()
    room.placeBet('host1', { type: 'even', amount: 1000 })
    room.executeRound(1) // 1 is odd → lose all
    expect(room.getPlayer('host1')?.status).toBe('spectator')
    expect(room.getPlayer('host1')?.balance).toBe(0)
  })
  it('increments round counter', () => {
    expect(room.round).toBe(0)
    room.executeRound(0)
    expect(room.round).toBe(1)
  })
})

describe('checkGameOver', () => {
  it('returns null when no player has reached $5000', () => {
    expect(room.checkGameOver()).toBeNull()
  })
  it('returns winner when balance >= 5000', () => {
    room.getPlayer('host1')!.balance = 5000
    expect(room.checkGameOver()?.id).toBe('host1')
  })
})

describe('onlyOneActivePlayer', () => {
  it('returns null with only 1 player total', () => {
    expect(room.onlyOneActivePlayer()).toBeNull()
  })
  it('returns the player when 2 started and 1 went bankrupt', () => {
    room.addPlayer('p2', 'Bob')
    room.getPlayer('p2')!.status = 'spectator'
    expect(room.onlyOneActivePlayer()?.id).toBe('host1')
  })
})

describe('swapPlayerId', () => {
  it('remaps a player from old ID to new ID', () => {
    room.swapPlayerId('host1', 'newSocketId')
    expect(room.getPlayer('host1')).toBeUndefined()
    expect(room.getPlayer('newSocketId')).toBeDefined()
    expect(room.getPlayer('newSocketId')?.id).toBe('newSocketId')
  })
  it('preserves player data after swap', () => {
    room.getPlayer('host1')!.balance = 1500
    room.swapPlayerId('host1', 'newSocketId')
    expect(room.getPlayer('newSocketId')?.balance).toBe(1500)
    expect(room.getPlayer('newSocketId')?.isHost).toBe(true)
  })
  it('swaps associated bet if present', () => {
    room.setPhase('betting')
    room.placeBet('host1', { type: 'even', amount: 100 })
    room.swapPlayerId('host1', 'newSocketId')
    expect(room.allActiveBetsPlaced()).toBe(true)
  })
  it('does nothing for unknown old ID', () => {
    room.swapPlayerId('ghost', 'newSocketId')
    expect(room.getPlayers()).toHaveLength(1)
    expect(room.getPlayer('host1')).toBeDefined()
  })
})
