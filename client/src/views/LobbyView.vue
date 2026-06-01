<template>
  <div class="lobby">
    <div class="lobby-card">
      <h2>Herní místnost</h2>

      <div class="room-code-section">
        <span class="code-label">Kód hry</span>
        <div class="code-display" @click="copyCode" :title="copied ? 'Zkopírováno!' : 'Klikněte pro kopírování'">
          {{ code }}
          <span class="copy-hint">{{ copied ? '✓' : '📋' }}</span>
        </div>
      </div>

      <div class="qr-section">
        <img v-if="qrUrl" :src="qrUrl" alt="QR kód" class="qr-img" />
      </div>

      <div class="players-section">
        <h3>Hráči ({{ players.length }}/8)</h3>
        <ul class="player-list">
          <li v-for="p in players" :key="p.id" class="player-item">
            <span class="player-name">{{ p.nickname }}</span>
            <span v-if="p.isHost" class="host-badge">Hostitel</span>
            <span v-if="p.id === myId" class="me-badge">Vy</span>
          </li>
        </ul>
      </div>

      <button
        v-if="isHost"
        class="btn-primary start-btn"
        @click="doStart"
      >
        Spustit hru
      </button>
      <p v-else class="waiting-text">Čekáme až hostitel spustí hru...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import type { Player } from '@ruleta/shared'
import { useSocketStore } from '../stores/socketStore'
import { useGame } from '../composables/useGame'

const route = useRoute()
const router = useRouter()
const socketStore = useSocketStore()
const { startGame } = useGame()

const code = route.params.code as string
const players = ref<Player[]>([])
const qrUrl = ref('')
const copied = ref(false)
const myId = ref('')

const isHost = computed(() => {
  const me = players.value.find(p => p.id === myId.value)
  return me?.isHost ?? false
})

function onRoomJoined(data: unknown) {
  const d = data as { players: Player[] }
  players.value = d.players
  myId.value = socketStore.getSocket().id ?? ''
}

function onPlayerJoined(data: unknown) {
  const d = data as { player: Player }
  if (!players.value.find(p => p.id === d.player.id)) {
    players.value.push(d.player)
  }
}

function onPlayerLeft(data: unknown) {
  const d = data as { players: Player[] }
  players.value = d.players
}

function onGameStarted() {
  router.push(`/game/${code}`)
}

onMounted(async () => {
  myId.value = socketStore.getSocket().id ?? ''

  const s = socketStore.getSocket()
  s.on('room:joined', onRoomJoined)
  s.on('room:playerJoined', onPlayerJoined)
  s.on('room:playerLeft', onPlayerLeft)
  s.on('game:started', onGameStarted)

  // Generate QR code for the join URL
  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${code}`
  try {
    qrUrl.value = await QRCode.toDataURL(joinUrl, { width: 140, margin: 1, color: { dark: '#000', light: '#fff' } })
  } catch { /* QR optional */ }
})

onUnmounted(() => {
  const s = socketStore.getSocket()
  s.off('room:joined', onRoomJoined)
  s.off('room:playerJoined', onPlayerJoined)
  s.off('room:playerLeft', onPlayerLeft)
  s.off('game:started', onGameStarted)
})

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* clipboard not available */ }
}

function doStart() {
  startGame(code)
}
</script>

<style scoped>
.lobby {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.lobby-card {
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 16px;
  padding: 2rem;
  width: min(500px, 90vw);
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h2 { font-size: 1.5rem; text-align: center; }
h3 { font-size: 0.9rem; color: var(--text-muted); }

.code-label { display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }

.code-display {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 0.3em;
  color: var(--gold);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  user-select: all;
}
.copy-hint { font-size: 1.2rem; }

.qr-section { display: flex; justify-content: center; }
.qr-img { border-radius: 8px; background: white; padding: 6px; }

.player-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }

.player-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: 6px;
}

.player-name { flex: 1; font-weight: 600; }
.host-badge { font-size: 0.7rem; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; }
.me-badge { font-size: 0.7rem; background: var(--accent2); color: #0d0b1e; padding: 2px 6px; border-radius: 4px; font-weight: bold; }

.start-btn { width: 100%; padding: 14px; font-size: 1.1rem; }
.waiting-text { text-align: center; color: var(--text-muted); font-size: 0.9rem; }
</style>
