import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, Player } from '@ruleta/shared'
import { useSocketStore } from './socketStore'

export const useGameStore = defineStore('game', () => {
  const socketStore = useSocketStore()

  const gameState = ref<GameState | null>(null)
  const myPlayerId = ref<string>('')
  const roomCode = ref<string>('')
  // Players shown in the multiplayer lobby before the game starts. Kept in the
  // store (not in LobbyView) because room:joined fires before LobbyView mounts —
  // the store's listeners are registered early enough in createRoom/joinRoom to
  // capture it, the view's would miss it.
  const lobbyPlayers = ref<Player[]>([])
  const bettingTimeLeft = ref(30)
  const lastWinners = ref<Record<string, number>>({})
  const lastBalances = ref<Record<string, number>>({})
  const gameOverData = ref<{ winner: Player | null; leaderboard: Player[] } | null>(null)
  const betConfirmed = ref(false)
  const isListening = ref(false)

  // Outcome of the current spin, held back until the wheel animation finishes so
  // the player can't read win/loss off the UI before the ball settles.
  const pendingBalances = ref<Record<string, number> | null>(null)
  const pendingWinners = ref<Record<string, number> | null>(null)
  const pendingBankrupt = ref<string[]>([])

  let bettingTimer: ReturnType<typeof setInterval> | null = null

  // Registered handler references for teardown
  const registeredHandlers: Array<{ event: string; fn: (...args: unknown[]) => void }> = []

  const myPlayer = computed(() =>
    gameState.value?.players.find(p => p.id === myPlayerId.value) ?? null,
  )

  function setupListeners() {
    if (isListening.value) return
    isListening.value = true

    const s = socketStore.getSocket()
    myPlayerId.value = s.id ?? ''

    function addListener(event: string, fn: (...args: unknown[]) => void) {
      socketStore.on(event, fn)
      registeredHandlers.push({ event, fn })
    }

    // Update myPlayerId once connected
    const onConnect = () => { myPlayerId.value = s.id ?? '' }
    s.on('connect', onConnect)
    registeredHandlers.push({ event: 'connect', fn: onConnect })

    addListener('room:joined', (data: unknown) => {
      const d = data as { code: string; players: Player[]; isSingleplayer: boolean }
      roomCode.value = d.code
      lobbyPlayers.value = d.players
    })

    addListener('room:playerJoined', (data: unknown) => {
      const d = data as { player: Player }
      if (!lobbyPlayers.value.find(p => p.id === d.player.id)) {
        lobbyPlayers.value.push(d.player)
      }
      if (gameState.value) {
        if (!gameState.value.players.find(p => p.id === d.player.id)) {
          gameState.value.players.push(d.player)
        }
      }
    })

    addListener('room:playerLeft', (data: unknown) => {
      const d = data as { playerId: string; players: Player[] }
      lobbyPlayers.value = d.players
      if (gameState.value) gameState.value.players = d.players
    })

    addListener('room:newHost', (data: unknown) => {
      const d = data as { playerId: string }
      lobbyPlayers.value.forEach(p => { p.isHost = p.id === d.playerId })
      if (gameState.value) {
        gameState.value.players.forEach(p => {
          p.isHost = p.id === d.playerId
        })
      }
    })

    addListener('game:started', (data: unknown) => {
      const d = data as { gameState: GameState }
      gameState.value = d.gameState
      gameOverData.value = null
    })

    addListener('game:bettingOpen', (data: unknown) => {
      const d = data as { timeLimit: number }
      if (gameState.value) gameState.value.phase = 'betting'
      betConfirmed.value = false
      bettingTimeLeft.value = d.timeLimit
      if (d.timeLimit > 0) startBettingTimer()
    })

    addListener('game:playerBet', (data: unknown) => {
      const d = data as { playerId: string }
      if (gameState.value) {
        gameState.value.currentBets[d.playerId] = { type: 'even', amount: 0 }
      }
    })

    addListener('game:spinResult', (data: unknown) => {
      const d = data as { number: number; winners: Record<string, number>; newBalances: Record<string, number> }
      if (gameState.value) {
        gameState.value.phase = 'spinning'
        // Only the target number drives the wheel animation — safe to set now.
        gameState.value.lastResult = d.number
      }
      // Defer balances / winners / bankruptcy until the spin animation completes
      // (committed via applySpinOutcome) so the result isn't revealed early.
      pendingBalances.value = d.newBalances
      pendingWinners.value = d.winners
      pendingBankrupt.value = []
      stopBettingTimer()
    })

    addListener('game:roundEnd', (data: unknown) => {
      const d = data as { gameState: GameState }
      gameState.value = d.gameState
    })

    addListener('game:playerBankrupt', (data: unknown) => {
      const d = data as { playerId: string }
      // Hold the bust until the animation finishes — otherwise the dimmed row /
      // "divák" tag would reveal the loss before the ball settles.
      if (!pendingBankrupt.value.includes(d.playerId)) {
        pendingBankrupt.value.push(d.playerId)
      }
    })

    addListener('game:over', (data: unknown) => {
      const d = data as { winner: Player | null; leaderboard: Player[] }
      gameOverData.value = d
      if (gameState.value) gameState.value.phase = 'lobby'
    })
  }

  function teardownListeners() {
    for (const { event, fn } of registeredHandlers) {
      socketStore.off(event, fn)
    }
    registeredHandlers.length = 0
    isListening.value = false
  }

  /**
   * Commit the held-back spin outcome (balances, winners, bankruptcies) to the
   * UI. Called once the wheel animation has finished so win/loss is only ever
   * revealed after the ball settles.
   */
  function applySpinOutcome() {
    if (!pendingBalances.value) return
    if (gameState.value) {
      gameState.value.players.forEach(p => {
        if (pendingBalances.value![p.id] !== undefined) p.balance = pendingBalances.value![p.id]
        if (pendingBankrupt.value.includes(p.id)) p.status = 'spectator'
      })
    }
    lastWinners.value = pendingWinners.value ?? {}
    lastBalances.value = pendingBalances.value
    pendingBalances.value = null
    pendingWinners.value = null
    pendingBankrupt.value = []
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
    lobbyPlayers.value = []
    gameOverData.value = null
    betConfirmed.value = false
    pendingBalances.value = null
    pendingWinners.value = null
    pendingBankrupt.value = []
    stopBettingTimer()
    teardownListeners()
    sessionStorage.removeItem('ruleta_room_code')
    sessionStorage.removeItem('ruleta_old_socket_id')
  }

  return {
    gameState, myPlayerId, roomCode, lobbyPlayers, bettingTimeLeft,
    lastWinners, lastBalances, gameOverData, betConfirmed,
    myPlayer, setupListeners, teardownListeners, reset, applySpinOutcome,
  }
})
