import { describe, it, expect, beforeEach } from 'vitest'
import { RoomManager } from '../src/RoomManager.js'

let manager: RoomManager

beforeEach(() => { manager = new RoomManager() })

describe('create', () => {
  it('returns a room with a 6-character code', () => {
    const room = manager.create('p1', 'Alice', false)
    expect(room.code).toHaveLength(6)
    expect(room.code).toMatch(/^[A-Z0-9]+$/)
  })
  it('codes are unique across 50 rooms', () => {
    const codes = new Set(Array.from({ length: 50 }, (_, i) => manager.create(`p${i}`, 'X', false).code))
    expect(codes.size).toBe(50)
  })
  it('creates room retrievable by get()', () => {
    const room = manager.create('p1', 'Alice', false)
    expect(manager.get(room.code)).toBe(room)
  })
})

describe('get', () => {
  it('returns undefined for unknown code', () => {
    expect(manager.get('XXXXXX')).toBeUndefined()
  })
  it('is case-insensitive', () => {
    const room = manager.create('p1', 'Alice', false)
    expect(manager.get(room.code.toLowerCase())).toBe(room)
  })
})

describe('join', () => {
  it('adds a player to an existing room', () => {
    const room = manager.create('p1', 'Alice', false)
    const joined = manager.join(room.code, 'p2', 'Bob')
    expect(joined).toBe(room)
    expect(room.getPlayers()).toHaveLength(2)
  })
  it('throws for unknown code', () => {
    expect(() => manager.join('XXXXXX', 'p2', 'Bob')).toThrow('Místnost neexistuje')
  })
})

describe('remove', () => {
  it('removes a room', () => {
    const room = manager.create('p1', 'Alice', false)
    manager.remove(room.code)
    expect(manager.get(room.code)).toBeUndefined()
  })
})
