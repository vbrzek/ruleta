<template>
  <div class="player-list">
    <div
      v-for="player in players"
      :key="player.id"
      class="player-row"
      :class="{
        me: player.id === myId,
        spectator: player.status === 'spectator',
        'has-bet': hasBet(player.id),
      }"
    >
      <div class="player-info">
        <span class="nickname">
          {{ player.nickname }}
          <span v-if="player.isHost">👑</span>
        </span>
        <span v-if="player.status === 'spectator'" class="tag spectator-tag">divák</span>
        <span v-if="hasBet(player.id) && phase === 'betting'" class="tag bet-tag">✓</span>
      </div>
      <div class="balance" :class="{ flash: flashing.has(player.id) }">
        ${{ player.balance.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Player, GamePhase } from '@ruleta/shared'

const props = defineProps<{
  players: Player[]
  myId: string
  bets: Record<string, unknown>
  lastBalances: Record<string, number>
  phase: GamePhase
}>()

const flashing = ref<Set<string>>(new Set())

function hasBet(id: string): boolean {
  return id in props.bets
}

watch(() => props.lastBalances, () => {
  const ids = new Set(Object.keys(props.lastBalances))
  flashing.value = ids
  setTimeout(() => { flashing.value = new Set() }, 1500)
}, { deep: true })
</script>

<style scoped>
.player-list { display: flex; flex-direction: column; gap: 5px; padding: 8px; overflow-y: auto; }

.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 10px;
  border-radius: 6px;
  background: var(--bg);
  border: 1px solid transparent;
  transition: border-color 0.2s;
}
.player-row.me { border-color: var(--accent2); }
.player-row.spectator { opacity: 0.4; }
.player-row.has-bet { border-color: var(--accent); }

.player-info { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; min-width: 0; }
.nickname { font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.tag { font-size: 0.65rem; padding: 1px 5px; border-radius: 3px; white-space: nowrap; }
.spectator-tag { background: #333; color: var(--text-muted); }
.bet-tag { background: var(--accent); color: white; }

.balance { font-weight: 700; color: var(--gold); font-size: 0.95rem; white-space: nowrap; }
.balance.flash { animation: flash 0.6s ease; }

@keyframes flash {
  0%, 100% { color: var(--gold); }
  50% { color: #fff; transform: scale(1.1); }
}
</style>
