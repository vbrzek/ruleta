import type { Player, GameState, GamePhase, Bet } from '@ruleta/shared'
import { resolveWin } from './roulette.js'

const START_BALANCE = 1000
const WIN_TARGET = 5000

export class GameRoom {
  private players = new Map<string, Player>()
  private _phase: GamePhase = 'lobby'
  public round = 0
  public lastResult?: number
  public isSingleplayer: boolean
  private bets = new Map<string, Bet>()
  public onAllBetsPlaced?: () => void

  constructor(
    public readonly code: string,
    hostId: string,
    hostNickname: string,
    isSingleplayer: boolean,
  ) {
    this.isSingleplayer = isSingleplayer
    this.players.set(hostId, {
      id: hostId,
      nickname: hostNickname,
      balance: START_BALANCE,
      status: 'active',
      isHost: true,
    })
  }

  getPlayers(): Player[] {
    return [...this.players.values()]
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id)
  }

  get phase(): GamePhase { return this._phase }
  setPhase(p: GamePhase): void { this._phase = p }

  addPlayer(id: string, nickname: string): Player {
    if (this.players.size >= 8) throw new Error('Místnost je plná')
    if (this._phase !== 'lobby') throw new Error('Hra již probíhá')
    const player: Player = { id, nickname, balance: START_BALANCE, status: 'active', isHost: false }
    this.players.set(id, player)
    return player
  }

  removePlayer(id: string): { newHostId?: string; shouldClose: boolean } {
    const player = this.players.get(id)
    if (!player) return { shouldClose: false }
    this.players.delete(id)
    this.bets.delete(id)
    if (this.players.size === 0) return { shouldClose: true }
    if (player.isHost) {
      const next = this.players.values().next().value!
      next.isHost = true
      return { newHostId: next.id, shouldClose: false }
    }
    return { shouldClose: false }
  }

  swapPlayerId(oldId: string, newId: string): void {
    const player = this.players.get(oldId)
    if (!player) return
    player.id = newId
    this.players.delete(oldId)
    this.players.set(newId, player)
    // Also swap bet if any
    const bet = this.bets.get(oldId)
    if (bet) {
      this.bets.delete(oldId)
      this.bets.set(newId, bet)
    }
  }

  clearBets(): void { this.bets.clear() }

  placeBet(playerId: string, bet: Bet): void {
    const player = this.players.get(playerId)
    if (!player || player.status !== 'active') throw new Error('Hráč nenalezen nebo není aktivní')
    if (this._phase !== 'betting') throw new Error('Sázení není otevřeno')
    if (bet.amount < 100 || bet.amount > player.balance) throw new Error('Neplatná částka')
    if (bet.amount % 100 !== 0 && bet.amount !== player.balance) throw new Error('Částka musí být násobek 100')
    if (bet.type === 'number' && (bet.number === undefined || bet.number < 0 || bet.number > 36)) {
      throw new Error('Neplatné číslo')
    }
    this.bets.set(playerId, bet)
    if (this.allActiveBetsPlaced()) this.onAllBetsPlaced?.()
  }

  allActiveBetsPlaced(): boolean {
    return this.getPlayers()
      .filter(p => p.status === 'active')
      .every(p => this.bets.has(p.id))
  }

  executeRound(spinResult: number): {
    result: number
    winners: Record<string, number>
    newBalances: Record<string, number>
  } {
    this._phase = 'spinning'
    this.lastResult = spinResult
    const winners: Record<string, number> = {}
    const newBalances: Record<string, number> = {}

    for (const [id, player] of this.players) {
      if (player.status !== 'active') continue
      const bet = this.bets.get(id)
      if (bet) {
        const profit = resolveWin(bet.type, bet.number, spinResult, bet.amount)
        player.balance += profit > 0 ? profit : -bet.amount
        winners[id] = profit
      }
      if (player.balance <= 0) {
        player.balance = 0
        player.status = 'spectator'
      }
      newBalances[id] = player.balance
    }
    this._phase = 'result'
    this.round++
    return { result: spinResult, winners, newBalances }
  }

  checkGameOver(): Player | null {
    return this.getPlayers().find(p => p.balance >= WIN_TARGET) ?? null
  }

  onlyOneActivePlayer(): Player | null {
    if (this.players.size < 2) return null
    const active = this.getPlayers().filter(p => p.status === 'active')
    return active.length === 1 ? active[0] : null
  }

  getLeaderboard(): Player[] {
    return [...this.players.values()].sort((a, b) => b.balance - a.balance)
  }

  getState(): GameState {
    return {
      code: this.code,
      phase: this._phase,
      players: this.getPlayers(),
      round: this.round,
      currentBets: Object.fromEntries(this.bets),
      lastResult: this.lastResult,
      isSingleplayer: this.isSingleplayer,
    }
  }
}
