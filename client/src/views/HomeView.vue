<template>
  <div class="home">
    <!-- Credits (i) -->
    <button class="info-btn" aria-label="O hře" @click="showCredits = true">i</button>

    <!-- Install / Add to home screen -->
    <button
      v-if="showInstallButton"
      class="install-btn"
      @click="promptInstall"
    >
      📲 Přidat na plochu
    </button>

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

    <!-- Credits modal -->
    <Transition name="fade">
      <div v-if="showCredits" class="modal-backdrop" @click.self="showCredits = false">
        <div class="modal credits">
          <h2 class="credits-title">O hře</h2>

          <p class="credits-line">
            Autor: <strong>Martin Ryml</strong><br />
            s využitím <strong>Claude Code</strong>
          </p>

          <div class="stack">
            <span class="stack-label">Technologie</span>
            <ul>
              <li>Vue 3 (Composition API) + Pinia + Vue Router</li>
              <li>Vite</li>
              <li>Node.js + TypeScript + Express</li>
              <li>Socket.IO (real-time multiplayer)</li>
              <li>CSS 3D transforms + SVG (kolo)</li>
              <li>Web Audio API (zvuky)</li>
            </ul>
          </div>

          <p class="credits-school">
            Hra vznikla jako závěrečná práce pro<br />
            <strong>ZŠ Kaplického, Liberec</strong>
          </p>

          <button class="btn-primary" @click="showCredits = false">Zavřít</button>
        </div>
      </div>
    </Transition>

    <!-- iOS install hint modal -->
    <Transition name="fade">
      <div v-if="showIosHint" class="modal-backdrop" @click.self="showIosHint = false">
        <div class="modal credits">
          <h2 class="credits-title">Přidat na plochu</h2>
          <p class="credits-line">
            1. Klepni na tlačítko <strong>Sdílet</strong> (ikona čtverce se šipkou) ve spodní liště.
          </p>
          <p class="credits-line">
            2. Vyber <strong>Přidat na plochu</strong>.
          </p>
          <p class="credits-line">
            3. Potvrď <strong>Přidat</strong> — Ruleta se objeví jako aplikace.
          </p>
          <button class="btn-secondary menu-btn" @click="showIosHint = false">Zavřít</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import RouletteWheel from '../components/RouletteWheel.vue'
import { useGame } from '../composables/useGame'
import { useSocketStore } from '../stores/socketStore'
import { useInstallPrompt } from '../composables/useInstallPrompt'

const router = useRouter()
const { createRoom, joinRoom } = useGame()
const socketStore = useSocketStore()

const showJoin = ref(false)
const showCredits = ref(false)
const joinCode = ref('')
const error = ref('')

const { showInstallButton, showIosHint, promptInstall } = useInstallPrompt()

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
  position: relative;
  display: flex;
  width: min(100vw, 1280px);
  height: min(100vh, 720px);
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
}

.info-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(200, 150, 12, 0.5);
  background: rgba(6, 4, 16, 0.6);
  color: var(--accent2);
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.info-btn:hover { background: rgba(200, 150, 12, 0.2); transform: scale(1.08); }

.install-btn {
  position: absolute;
  top: 56px;
  left: 14px;
  z-index: 10;
  padding: 7px 14px;
  border-radius: 18px;
  border: 1px solid rgba(200, 150, 12, 0.5);
  background: rgba(6, 4, 16, 0.6);
  color: var(--accent2);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.install-btn:hover { background: rgba(200, 150, 12, 0.2); transform: scale(1.04); }

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

/* Credits modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(3, 2, 12, 0.92);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}

.modal.credits {
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 16px;
  padding: 2rem;
  width: min(420px, 90vw);
  max-height: 90vh;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 1.1rem;
  text-align: center;
}

.credits-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--gold);
}

.credits-line { color: var(--text); line-height: 1.5; }
.credits-line strong { color: var(--accent2); }

.stack { text-align: left; }
.stack-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}
.stack ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stack li {
  font-size: 0.85rem;
  color: var(--text);
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--bg);
}

.credits-school {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}
.credits-school strong { color: var(--text); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
