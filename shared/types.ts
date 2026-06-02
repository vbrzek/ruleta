export type GamePhase = 'lobby' | 'betting' | 'spinning' | 'result'
export type PlayerStatus = 'active' | 'spectator'
export type BetType =
  | 'red' | 'black'      // colour, 1:1
  | 'even' | 'odd'       // parity, 1:1
  | 'low' | 'high'       // 1-18 / 19-36, 1:1
  | 'dozen'              // 1st/2nd/3rd 12, 2:1 (which one in Bet.number: 1|2|3)
  | 'column'             // left "2 to 1" columns, 2:1 (which one in Bet.number: 1|2|3)
  | 'number'             // single number, 35:1 (the number in Bet.number)

export interface Player {
  id: string
  nickname: string
  balance: number
  status: PlayerStatus
  isHost: boolean
}

export interface Bet {
  type: BetType
  amount: number
  // For 'number': the chosen 0-36. For 'dozen'/'column': the group index 1|2|3.
  number?: number
}

export interface GameState {
  code: string
  phase: GamePhase
  players: Player[]
  round: number
  currentBets: Record<string, Bet>
  lastResult?: number
  isSingleplayer: boolean
}
