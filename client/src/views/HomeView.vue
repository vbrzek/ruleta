<template>
  <div class="home">
    <!-- Left: static wheel (clipped at ~50%) -->
    <div class="wheel-half">
      <RouletteWheel :static="true" />
    </div>

    <!-- Right: menu -->
    <div class="menu-half">
      <div class="menu-content">
        <h1 class="title">Ruleta</h1>
        <p class="subtitle">Evropská ruleta</p>

        <div class="menu-buttons">
          <button class="btn-primary menu-btn" @click="startSingleplayer">
            🎯 Singleplayer
          </button>

          <button class="btn-secondary menu-btn" @click="showJoin = !showJoin">
            🔗 Připojit se ke hře
          </button>

          <Transition name="slide">
            <div v-if="showJoin" class="join-form">
              <input
                v-model="joinCode"
                type="text"
                placeholder="Kód hry (6 znaků)"
                maxlength="6"
                @input="joinCode = joinCode.toUpperCase()"
                @keyup.enter="doJoin"
              />
              <button class="btn-primary" :disabled="joinCode.length < 6" @click="doJoin">
                Vstoupit
              </button>
            </div>
          </Transition>

          <button class="btn-secondary menu-btn" @click="createMultiplayer">
            ➕ Založit hru
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import RouletteWheel from '../components/RouletteWheel.vue'
import { useGame } from '../composables/useGame'
import { useSocketStore } from '../stores/socketStore'

const router = useRouter()
const { createRoom, joinRoom } = useGame()
const socketStore = useSocketStore()

const showJoin = ref(false)
const joinCode = ref('')
const error = ref('')

function waitForRoom(): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = socketStore.getSocket()
    const onJoined = (data: unknown) => {
      const d = data as { code: string }
      s.off('room:joined', onJoined)
      s.off('room:error', onError)
      resolve(d.code)
    }
    const onError = (data: unknown) => {
      const d = data as { message: string }
      s.off('room:joined', onJoined)
      s.off('room:error', onError)
      error.value = d.message
      reject(d.message)
    }
    s.once('room:joined', onJoined)
    s.once('room:error', onError)
  })
}

async function startSingleplayer() {
  error.value = ''
  createRoom('Hráč', true)
  try {
    const code = await waitForRoom()
    await router.push(`/game/${code}`)
  } catch { /* error shown in template */ }
}

async function createMultiplayer() {
  error.value = ''
  const nick = prompt('Vaše přezdívka:') || 'Hráč'
  createRoom(nick, false)
  try {
    const code = await waitForRoom()
    await router.push(`/lobby/${code}`)
  } catch { /* error shown in template */ }
}

async function doJoin() {
  if (joinCode.value.length < 6) return
  error.value = ''
  const nick = prompt('Vaše přezdívka:') || 'Hráč'
  joinRoom(joinCode.value, nick)
  try {
    const code = await waitForRoom()
    await router.push(`/lobby/${code}`)
  } catch { /* error shown in template */ }
}
</script>

<style scoped>
.home {
  display: flex;
  width: min(100vw, 1280px);
  height: min(100vh, 720px);
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
}

.wheel-half {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.menu-half {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(6, 4, 16, 0.92);
  border-left: 1px solid rgba(200, 150, 12, 0.25);
}

.menu-content {
  width: 100%;
  max-width: 360px;
}

.title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  background: linear-gradient(135deg, #fff, var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-btn {
  width: 100%;
  padding: 14px;
  font-size: 1rem;
}

.join-form {
  display: flex;
  gap: 8px;
}

.join-form input {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 1.1rem;
}

.error {
  color: #ff6060;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
