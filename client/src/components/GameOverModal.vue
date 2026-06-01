<template>
  <Transition name="fade">
    <div v-if="props.data" class="modal-backdrop">
      <div class="modal">
        <div v-if="props.data.winner" class="header winner">
          🏆 {{ props.data.winner.nickname }} vyhrál!
        </div>
        <div v-else class="header bankrupt">💸 Bankrot!</div>

        <div class="leaderboard">
          <div
            v-for="(p, i) in props.data.leaderboard"
            :key="p.id"
            class="lb-row"
            :class="{ me: p.id === myId }"
          >
            <span class="rank">#{{ i + 1 }}</span>
            <span class="name">{{ p.nickname }}</span>
            <span class="balance">${{ p.balance.toLocaleString() }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-primary" @click="emit('play-again')">Hrát znovu</button>
          <button class="btn-secondary" @click="emit('home')">Domů</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { Player } from '@ruleta/shared'

const props = defineProps<{
  data: { winner: Player | null; leaderboard: Player[] } | null
  myId: string
}>()

const emit = defineEmits<{
  'play-again': []
  'home': []
}>()
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(3, 2, 12, 0.92);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 16px;
  padding: 2rem;
  width: min(420px, 90vw);
  display: flex; flex-direction: column; gap: 1.25rem;
}

.header { font-size: 1.5rem; font-weight: 900; text-align: center; }
.winner { color: var(--gold); }
.bankrupt { color: #ff6060; }

.leaderboard { display: flex; flex-direction: column; gap: 5px; }

.lb-row {
  display: flex; gap: 10px; align-items: center;
  padding: 8px 12px; border-radius: 6px; background: var(--bg);
}
.lb-row.me { border: 1px solid var(--accent2); }

.rank { color: var(--text-muted); width: 28px; font-weight: 600; }
.name { flex: 1; font-weight: 600; }
.balance { color: var(--gold); font-weight: 700; }

.modal-actions { display: flex; gap: 10px; }
.modal-actions button { flex: 1; padding: 12px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
