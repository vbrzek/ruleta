export type GamePhase = 'lobby' | 'betting' | 'spinning' | 'result'
export type PlayerStatus = 'active' | 'spectator'
export type BetType = 'red' | 'black' | 'even' | 'odd' | 'number'

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
