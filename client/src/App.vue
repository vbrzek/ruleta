<template>
  <div class="app">
    <router-view />
    <button class="mute-btn" @click="sound.toggleMute()">
      {{ sound.muted.value ? '🔇' : '🔊' }}
    </button>
    <div v-if="isPortrait" class="portrait-overlay">
      <div class="portrait-message">
        <div class="rotate-icon">↻</div>
        <p>Otočte zařízení na šířku</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSound } from './composables/useSound'

const sound = useSound()
const isPortrait = ref(false)

function checkOrientation() {
  isPortrait.value = window.innerHeight > window.innerWidth
}

onMounted(() => {
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
})
onUnmounted(() => window.removeEventListener('resize', checkOrientation))
</script>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Casino felt — dark green with overhead spotlight and woven texture */
  background:
    repeating-linear-gradient( 45deg, rgba(255,255,255,0.009) 0px, rgba(255,255,255,0.009) 1px, transparent 1px, transparent 6px),
    repeating-linear-gradient(-45deg, rgba(255,255,255,0.009) 0px, rgba(255,255,255,0.009) 1px, transparent 1px, transparent 6px),
    radial-gradient(ellipse at 50% 38%, #0e3d20 0%, #071a0e 45%, #030c06 100%);
}

.mute-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 50;
  background: rgba(20,10,50,0.8);
  border: 1px solid var(--rim);
  color: white;
  font-size: 1.2rem;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.portrait-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.portrait-message { text-align: center; color: var(--text-muted); }
.rotate-icon {
  font-size: 4rem;
  animation: rotate 2s linear infinite;
  display: block;
  margin-bottom: 1rem;
}
@keyframes rotate { to { transform: rotate(360deg); } }
</style>
