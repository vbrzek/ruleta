import type { BetType } from '@ruleta/shared'

// European roulette wheel order (clockwise from 0)
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
])

export function spin(): number {
  return Math.floor(Math.random() * 37)
}

export function resolveWin(
  type: BetType,
  betNumber: number | undefined,
  result: number,
  amount: number,
): number {
  switch (type) {
    case 'red':    return RED_NUMBERS.has(result) ? amount : 0
    case 'black':  return BLACK_NUMBERS.has(result) ? amount : 0
    case 'even':   return result !== 0 && result % 2 === 0 ? amount : 0
    case 'odd':    return result % 2 === 1 ? amount : 0
    case 'low':    return result >= 1 && result <= 18 ? amount : 0
    case 'high':   return result >= 19 && result <= 36 ? amount : 0
    case 'dozen': {
      if (result === 0 || betNumber === undefined) return 0
      return Math.ceil(result / 12) === betNumber ? amount * 2 : 0
    }
    case 'column': {
      if (result === 0 || betNumber === undefined) return 0
      const col = result % 3 === 0 ? 3 : result % 3
      return col === betNumber ? amount * 2 : 0
    }
    case 'number': return result === betNumber ? amount * 35 : 0
    default: return 0
  }
}
