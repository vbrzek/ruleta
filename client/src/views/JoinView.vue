<template>
  <div class="join-page">
    <div class="join-card">
      <h2>Připojit se ke hře</h2>
      <p class="code-display">{{ code }}</p>
      <input
        v-model="nickname"
        type="text"
        placeholder="Vaše přezdívka"
        maxlength="20"
        @keyup.enter="doJoin"
        autofocus
      />
      <button class="btn-primary" :disabled="!nickname.trim()" @click="doJoin">Vstoupit</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '../composables/useGame'
import { useSocketStore } from '../stores/socketStore'

const route = useRoute()
const router = useRouter()
const { joinRoom } = useGame()
const socketStore = useSocketStore()

const code = route.params.code as string
const nickname = ref('')
const error = ref('')

function doJoin() {
  if (!nickname.value.trim()) return
  joinRoom(code, nickname.value.trim())
  const s = socketStore.getSocket()
  s.once('room:joined', (data: unknown) => {
    const d = data as { code: string }
    router.push(`/lobby/${d.code}`)
  })
  s.once('room:error', (data: unknown) => {
    const d = data as { message: string }
    error.value = d.message
  })
}
</script>

<style scoped>
.join-page {
  width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg);
}
.join-card {
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 16px;
  padding: 2rem;
  width: min(360px, 90vw);
  display: flex; flex-direction: column; gap: 1rem;
}
h2 { text-align: center; }
.code-display { font-size: 2rem; font-weight: 900; color: var(--gold); letter-spacing: 0.3em; text-align: center; }
button { padding: 12px; font-size: 1rem; }
.error { color: #ff6060; font-size: 0.9rem; }
</style>
