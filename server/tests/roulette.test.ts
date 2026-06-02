import { describe, it, expect } from 'vitest'
import { spin, resolveWin, RED_NUMBERS, BLACK_NUMBERS, WHEEL_ORDER } from '../src/roulette'

describe('WHEEL_ORDER', () => {
  it('contains exactly 37 unique numbers 0-36', () => {
    expect(WHEEL_ORDER).toHaveLength(37)
    expect(new Set(WHEEL_ORDER).size).toBe(37)
    expect(Math.min(...WHEEL_ORDER)).toBe(0)
    expect(Math.max(...WHEEL_ORDER)).toBe(36)
  })
  it('starts with 0', () => {
    expect(WHEEL_ORDER[0]).toBe(0)
  })
})

describe('RED_NUMBERS + BLACK_NUMBERS', () => {
  it('each has 18 numbers', () => {
    expect(RED_NUMBERS.size).toBe(18)
    expect(BLACK_NUMBERS.size).toBe(18)
  })
  it('no overlap between red and black', () => {
    for (const n of RED_NUMBERS) expect(BLACK_NUMBERS.has(n)).toBe(false)
  })
  it('together with 0 cover all 37 numbers', () => {
    const all = new Set([0, ...RED_NUMBERS, ...BLACK_NUMBERS])
    expect(all.size).toBe(37)
  })
})

describe('spin', () => {
  it('returns integer 0-36', () => {
    for (let i = 0; i < 200; i++) {
      const n = spin()
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(36)
    }
  })
})

describe('resolveWin', () => {
  it('red bet on red number pays 1:1', () => {
    expect(resolveWin('red', undefined, 1, 100)).toBe(100)
    expect(resolveWin('red', undefined, 32, 200)).toBe(200)
  })
  it('red bet on black number pays 0', () => {
    expect(resolveWin('red', undefined, 2, 100)).toBe(0)
  })
  it('red bet on 0 pays 0', () => {
    expect(resolveWin('red', undefined, 0, 100)).toBe(0)
  })
  it('black bet on black number pays 1:1', () => {
    expect(resolveWin('black', undefined, 2, 100)).toBe(100)
  })
  it('black bet on red number pays 0', () => {
    expect(resolveWin('black', undefined, 1, 100)).toBe(0)
  })
  it('even bet on even number pays 1:1', () => {
    expect(resolveWin('even', undefined, 4, 100)).toBe(100)
  })
  it('even bet on 0 pays 0', () => {
    expect(resolveWin('even', undefined, 0, 100)).toBe(0)
  })
  it('even bet on odd number pays 0', () => {
    expect(resolveWin('even', undefined, 3, 100)).toBe(0)
  })
  it('odd bet on odd number pays 1:1', () => {
    expect(resolveWin('odd', undefined, 3, 100)).toBe(100)
  })
  it('odd bet on 0 pays 0', () => {
    expect(resolveWin('odd', undefined, 0, 100)).toBe(0)
  })
  it('number bet on exact match pays 35:1', () => {
    expect(resolveWin('number', 7, 7, 100)).toBe(3500)
  })
  it('number bet on wrong number pays 0', () => {
    expect(resolveWin('number', 7, 8, 100)).toBe(0)
  })
  it('number bet on 0 pays 35:1', () => {
    expect(resolveWin('number', 0, 0, 100)).toBe(3500)
  })

  // Low (1-18) / High (19-36) — 1:1
  it('low bet on 1-18 pays 1:1', () => {
    expect(resolveWin('low', undefined, 1, 100)).toBe(100)
    expect(resolveWin('low', undefined, 18, 100)).toBe(100)
  })
  it('low bet on 19-36 pays 0', () => {
    expect(resolveWin('low', undefined, 19, 100)).toBe(0)
  })
  it('low bet on 0 pays 0', () => {
    expect(resolveWin('low', undefined, 0, 100)).toBe(0)
  })
  it('high bet on 19-36 pays 1:1', () => {
    expect(resolveWin('high', undefined, 19, 100)).toBe(100)
    expect(resolveWin('high', undefined, 36, 100)).toBe(100)
  })
  it('high bet on 1-18 pays 0', () => {
    expect(resolveWin('high', undefined, 18, 100)).toBe(0)
  })
  it('high bet on 0 pays 0', () => {
    expect(resolveWin('high', undefined, 0, 100)).toBe(0)
  })

  // Dozen — 2:1. Selection 1 = 1-12, 2 = 13-24, 3 = 25-36
  it('dozen bet on matching dozen pays 2:1', () => {
    expect(resolveWin('dozen', 1, 5, 100)).toBe(200)
    expect(resolveWin('dozen', 2, 13, 100)).toBe(200)
    expect(resolveWin('dozen', 2, 24, 100)).toBe(200)
    expect(resolveWin('dozen', 3, 36, 100)).toBe(200)
  })
  it('dozen bet on wrong dozen pays 0', () => {
    expect(resolveWin('dozen', 1, 13, 100)).toBe(0)
    expect(resolveWin('dozen', 3, 24, 100)).toBe(0)
  })
  it('dozen bet on 0 pays 0', () => {
    expect(resolveWin('dozen', 1, 0, 100)).toBe(0)
  })

  // Column — 2:1. Selection 1 = {1,4,...,34}, 2 = {2,5,...,35}, 3 = {3,6,...,36}
  it('column bet on matching column pays 2:1', () => {
    expect(resolveWin('column', 1, 1, 100)).toBe(200)
    expect(resolveWin('column', 1, 34, 100)).toBe(200)
    expect(resolveWin('column', 2, 35, 100)).toBe(200)
    expect(resolveWin('column', 3, 36, 100)).toBe(200)
  })
  it('column bet on wrong column pays 0', () => {
    expect(resolveWin('column', 1, 2, 100)).toBe(0)
    expect(resolveWin('column', 3, 35, 100)).toBe(0)
  })
  it('column bet on 0 pays 0', () => {
    expect(resolveWin('column', 1, 0, 100)).toBe(0)
  })
})
