import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, Player } from '@ruleta/shared'
import { useSocketStore } from './socketStore'

export const useGameStore = defineStore('game', () => {
  const socketStore = useSocketStore()

  const gameState = ref<GameState | null>(null)
  const myPlayerId = ref<string>('')
  const roomCode = ref<string>('')
  const bettingTimeLeft = ref(30)
  const lastWinners = ref<Record<string, number>>({})
  const lastBalances = ref<Record<string, number>>({})
  const gameOverData = ref<{ winner: Player | null; leaderboard: Player[] } | null>(null)
  const betConfirmed = ref(false)
  const isListening = ref(false)

  let bettingTimer: ReturnType<typeof setInterval> | null = null

  const myPlayer = computed(() =>
    gameState.value?.players.find(p => p.id === myPlayerId.value) ?? null,
  )

  function setupListeners() {
    if (isListening.value) return
    isListening.value = true

    const s = socketStore.getSocket()
    myPlayerId.value = s.id ?? ''

    // Update myPlayerId once connected
    s.on('connect', () => { myPlayerId.value = s.id ?? '' })

    socketStore.on('room:joined', (data: unknown) => {
      const d = data as { code: string; players: Player[]; isSingleplayer: boolean }
      roomCode.value = d.code
    })

    socketStore.on('room:playerJoined', (data: unknown) => {
      const d = data as { player: Player }
      if (gameState.value) {
        if (!gameState.value.players.find(p => p.id === d.player.id)) {
          gameState.value.players.push(d.player)
        }
      }
    })

    socketStore.on('room:playerLeft', (data: unknown) => {
      const d = data as { playerId: string; players: Player[] }
      if (gameState.value) gameState.value.players = d.players
    })

    socketStore.on('room:newHost', (data: unknown) => {
      const d = data as { playerId: string }
      if (gameState.value) {
        gameState.value.players.forEach(p => {
          p.isHost = p.id === d.playerId
        })
      }
    })

    socketStore.on('game:started', (data: unknown) => {
      const d = data as { gameState: GameState }
      gameState.value = d.gameState
      gameOverData.value = null
    })

    socketStore.on('game:bettingOpen', (data: unknown) => {
      const d = data as { timeLimit: number }
      if (gameState.value) gameState.value.phase = 'betting'
      betConfirmed.value = false
      bettingTimeLeft.value = d.timeLimit
      startBettingTimer()
    })

    socketStore.on('game:playerBet', (data: unknown) => {
      const d = data as { playerId: string }
      if (gameState.value) {
        gameState.value.currentBets[d.playerId] = { type: 'even', amount: 0 }
      }
    })

    socketStore.on('game:spinResult', (data: unknown) => {
      const d = data as { number: number; winners: Record<string, number>; newBalances: Record<string, number> }
      if (gameState.value) {
        gameState.value.phase = 'spinning'
        gameState.value.lastResult = d.number
        // Update balances in player list
        gameState.value.players.forEach(p => {
          if (d.newBalances[p.id] !== undefined) p.balance = d.newBalances[p.id]
        })
      }
      lastWinners.value = d.winners
      lastBalances.value = d.newBalances
      stopBettingTimer()
    })

    socketStore.on('game:roundEnd', (data: unknown) => {
      const d = data as { gameState: GameState }
      gameState.value = d.gameState
    })

    socketStore.on('game:playerBankrupt', (data: unknown) => {
      const d = data as { playerId: string }
      const p = gameState.value?.players.find(pl => pl.id === d.playerId)
      if (p) p.status = 'spectator'
    })

    socketStore.on('game:over', (data: unknown) => {
      const d = data as { winner: Player | null; leaderboard: Player[] }
      gameOverData.value = d
      if (gameState.value) gameState.value.phase = 'lobby'
    })
  }

  function startBettingTimer() {
    stopBettingTimer()
    bettingTimer = setInterval(() => {
      bettingTimeLeft.value = Math.max(0, bettingTimeLeft.value - 1)
      if (bettingTimeLeft.value === 0) stopBettingTimer()
    }, 1000)
  }

  function stopBettingTimer() {
    if (bettingTimer) { clearInterval(bettingTimer); bettingTimer = null }
  }

  function reset() {
    gameState.value = null
    roomCode.value = ''
    gameOverData.value = null
    betConfirmed.value = false
    isListening.value = false
    stopBettingTimer()
  }

  return {
    gameState, myPlayerId, roomCode, bettingTimeLeft,
    lastWinners, lastBalances, gameOverData, betConfirmed,
    myPlayer, setupListeners, reset,
  }
})
