<template>
  <Transition name="fade">
    <div v-if="visible" class="result-overlay">
      <div class="result-number" :class="numberColor">{{ resultNumber }}</div>
      <div class="color-name" :class="numberColor">{{ colorName }}</div>
      <div class="my-result" :class="myWin > 0 ? 'win' : 'loss'">
        <span v-if="myWin > 0">+${{ myWin.toLocaleString() }} 🎉</span>
        <span v-else>Prohra</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

const props = defineProps<{
  visible: boolean
  resultNumber?: number
  myWin: number
}>()

const numberColor = computed(() => {
  if (props.resultNumber === undefined) return ''
  if (props.resultNumber === 0) return 'color-green'
  return RED.has(props.resultNumber) ? 'color-red' : 'color-black'
})

const colorName = computed(() => {
  if (props.resultNumber === undefined) return ''
  if (props.resultNumber === 0) return 'Nula'
  return RED.has(props.resultNumber!) ? 'Červená' : 'Černá'
})
</script>

<style scoped>
.result-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5, 3, 20, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 20;
}

.result-number {
  font-size: 6rem;
  font-weight: 900;
  line-height: 1;
  padding: 0.1em 0.3em;
  border-radius: 12px;
}

.color-name {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 4px 20px;
  border-radius: 20px;
}

.color-red { background: var(--red); color: white; }
.color-black { background: #1a1a2e; color: white; border: 1px solid #555; }
.color-green { background: var(--green-zero); color: white; }

.my-result { font-size: 1.6rem; font-weight: 800; margin-top: 0.5rem; }
.win { color: var(--gold); }
.loss { color: #ff6060; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
