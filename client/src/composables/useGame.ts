import { useSocketStore } from '../stores/socketStore'
import { useGameStore } from '../stores/gameStore'
import type { BetType } from '@ruleta/shared'

export function useGame() {
  const socketStore = useSocketStore()
  const gameStore = useGameStore()

  function createRoom(nickname: string, isSingleplayer = false) {
    socketStore.connect()
    gameStore.setupListeners()
    socketStore.emit('room:create', { nickname, isSingleplayer })
  }

  function joinRoom(code: string, nickname: string) {
    socketStore.connect()
    gameStore.setupListeners()
    socketStore.emit('room:join', { code, nickname })
  }

  function startGame(code: string) {
    socketStore.emit('room:start', { code })
  }

  function placeBet(type: BetType, amount: number, number?: number) {
    socketStore.emit('game:bet', { type, amount, number })
    useGameStore().betConfirmed = true
  }

  return { createRoom, joinRoom, startGame, placeBet }
}
