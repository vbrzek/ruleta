<template>
  <div class="game-view">
    <!-- Left: wheel -->
    <div class="wheel-section">
      <RouletteWheel
        :spinning="gameState?.phase === 'spinning'"
        :target-number="gameState?.lastResult"
        @spin-complete="onSpinComplete"
      />

      <GameResult
        :visible="showResult"
        :result-number="gameState?.lastResult"
        :my-win="myWin"
      />
    </div>

    <!-- Right: sidebar -->
    <div class="sidebar">
      <!-- Always-visible home button -->
      <div class="sidebar-header">
        <button class="home-btn btn-secondary" @click="goHome">← Domů</button>
        <span v-if="gameState" class="round-label">Kolo {{ gameState.round + 1 }}<span v-if="gameState.phase === 'betting' && bettingTimeLeft > 0" class="timer"> · {{ bettingTimeLeft }}s</span></span>
      </div>

      <div class="players-section">
        <div v-if="!gameState" class="connecting-notice">
          <div class="spinner">⟳</div>
          <p>Připojování...</p>
          <button class="btn-secondary" style="margin-top:12px" @click="goHome">Zpět domů</button>
        </div>
        <PlayerList
          v-else
          :players="gameState.players"
          :my-id="myPlayerId"
          :bets="gameState.currentBets"
          :last-balances="lastBalances"
          :phase="gameState.phase"
        />
      </div>

      <div class="betting-section">
        <BettingPanel
          v-if="myPlayer && gameState?.phase === 'betting' && myPlayer.status === 'active'"
          :balance="myPlayer.balance"
          :disabled="betConfirmed"
          @confirm-bet="onBet"
        />

        <div v-else-if="myPlayer?.status === 'spectator'" class="spectator-notice">
          Sledujete hru jako divák
        </div>

        <div v-else-if="gameState?.phase === 'spinning'" class="phase-notice spinning">
          🎰 Točíme...
        </div>

        <div v-else-if="gameState?.phase === 'result'" class="phase-notice">
          Výsledky...
        </div>
      </div>
    </div>

    <GameOverModal
      :data="gameOverData"
      :my-id="myPlayerId"
      @play-again="goHome"
      @home="goHome"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/gameStore'
import { useGame } from '../composables/useGame'
import { useSound } from '../composables/useSound'
import RouletteWheel from '../components/RouletteWheel.vue'
import BettingPanel from '../components/BettingPanel.vue'
import PlayerList from '../components/PlayerList.vue'
import GameResult from '../components/GameResult.vue'
import GameOverModal from '../components/GameOverModal.vue'
import type { BetType } from '@ruleta/shared'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { placeBet, startGame } = useGame()
const { startTicking, stopTicking, slowdownSound, playWin, playLoss } = useSound()

const {
  gameState, myPlayerId, bettingTimeLeft,
  lastWinners, lastBalances, gameOverData, betConfirmed,
  myPlayer,
} = storeToRefs(gameStore)

const code = route.params.code as string
const showResult = ref(false)
const myWin = ref(0)

onMounted(() => {
  // If singleplayer: we arrived here from HomeView which created the room
  // game:started is handled by gameStore; if gameState is null, start the game
  if (!gameState.value) {
    // Singleplayer: room was created in HomeView, we are the host — start immediately
    startGame(code)
  }
})

onUnmounted(() => {
  stopTicking()
})

watch(() => gameState.value?.phase, (phase) => {
  if (phase === 'spinning') {
    startTicking()
    setTimeout(slowdownSound, 3000)
  } else {
    stopTicking()
  }
})

function onBet({ type, amount, number }: { type: BetType; amount: number; number?: number }) {
  placeBet(type, amount, number)
}

function onSpinComplete() {
  stopTicking()
  // Reveal the outcome only now that the ball has settled: commit balances,
  // flash and bankruptcies, then read the (now populated) winnings.
  gameStore.applySpinOutcome()
  showResult.value = true
  myWin.value = lastWinners.value[myPlayerId.value] ?? 0
  if (myWin.value > 0) playWin()
  else playLoss()
  setTimeout(() => { showResult.value = false }, 3000)
}

function goHome() {
  gameStore.reset()
  router.push('/')
}
</script>

<style scoped>
.game-view {
  display: flex;
  width: min(100vw, 1280px);
  height: min(100vh, 720px);
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
}

.wheel-section {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.round-badge {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: var(--text-muted);
  background: rgba(10,5,30,0.8);
  padding: 3px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.timer { color: var(--accent2); font-weight: bold; }

.sidebar {
  width: min(300px, 40%);
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(200, 150, 12, 0.25);
  background: rgba(6, 4, 16, 0.94);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--rim);
  flex-shrink: 0;
}

.home-btn {
  font-size: 0.75rem;
  padding: 4px 10px;
  white-space: nowrap;
}

.round-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.players-section {
  flex: 1;
  overflow-y: auto;
  border-bottom: 1px solid var(--rim);
}

.connecting-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 0.9rem;
  gap: 8px;
}

.spinner {
  font-size: 2rem;
  animation: spin 1.5s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.betting-section {
  flex-shrink: 0;
  min-height: 220px;
}

.spectator-notice, .phase-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 1rem;
  text-align: center;
}

.phase-notice.spinning { color: var(--accent2); font-size: 1.1rem; }
</style>
