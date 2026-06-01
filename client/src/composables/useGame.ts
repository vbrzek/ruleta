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
    // Save room code once we know it (listen for room:joined)
    socketStore.getSocket().once('room:joined', (data: unknown) => {
      const d = data as { code: string }
      sessionStorage.setItem('ruleta_room_code', d.code)
    })
  }

  function joinRoom(code: string, nickname: string) {
    socketStore.connect()
    gameStore.setupListeners()
    socketStore.emit('room:join', { code, nickname })
    sessionStorage.setItem('ruleta_room_code', code.toUpperCase())
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
