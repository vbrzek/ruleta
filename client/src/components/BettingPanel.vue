<template>
  <div class="betting-panel" :class="{ disabled: props.disabled }">
    <!-- Bet type selection -->
    <div class="bet-types">
      <button
        v-for="bt in BET_TYPES"
        :key="bt.value"
        class="bet-type-btn"
        :class="[`type-${bt.value}`, { active: selectedType === bt.value }]"
        :disabled="props.disabled"
        @click="selectType(bt.value)"
      >
        {{ bt.label }}
        <span class="odds">{{ bt.odds }}</span>
      </button>
    </div>

    <!-- Number grid (shown when type === 'number') -->
    <div v-if="selectedType === 'number'" class="number-grid">
      <button
        v-for="n in 37"
        :key="n - 1"
        class="num-btn"
        :class="getNumberClass(n - 1)"
        :disabled="props.disabled"
        :aria-pressed="selectedNumber === n - 1"
        @click="selectedNumber = n - 1"
      >
        {{ n - 1 }}
      </button>
    </div>

    <!-- Amount controls -->
    <div class="amount-controls">
      <button class="amount-btn" :disabled="props.disabled || betAmount <= 100" @click="adjustAmount(-100)">−</button>
      <div class="amount-display">${{ betAmount.toLocaleString() }}</div>
      <button class="amount-btn" :disabled="props.disabled || betAmount >= props.balance" @click="adjustAmount(100)">+</button>
      <button class="all-in-btn" :disabled="props.disabled" @click="betAmount = props.balance">Vše</button>
    </div>

    <!-- Confirm button -->
    <button
      class="confirm-btn btn-primary"
      :disabled="props.disabled || !isValid || confirmed"
      @click="confirmBet"
    >
      {{ confirmed ? 'Čekáme na ostatní...' : 'Vsadit' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { BetType } from '@ruleta/shared'

const BET_TYPES: { value: BetType; label: string; odds: string }[] = [
  { value: 'red',    label: 'Červená', odds: '1:1' },
  { value: 'black',  label: 'Černá',   odds: '1:1' },
  { value: 'even',   label: 'Sudá',    odds: '1:1' },
  { value: 'odd',    label: 'Lichá',   odds: '1:1' },
  { value: 'number', label: 'Číslo',   odds: '35:1' },
]

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

const props = defineProps<{
  balance: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'confirm-bet': [{ type: BetType; amount: number; number?: number }]
}>()

const selectedType = ref<BetType>('red')
const selectedNumber = ref<number>(0)
const betAmount = ref<number>(100)
const confirmed = ref(false)

function selectType(type: BetType) {
  selectedType.value = type
}

function adjustAmount(delta: number) {
  const next = betAmount.value + delta
  if (next >= 100 && next <= props.balance) betAmount.value = next
}

function getNumberClass(n: number): string {
  if (n === 0) return 'zero'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

const isValid = computed(() => {
  if (betAmount.value < 100 || betAmount.value > props.balance) return false
  if (betAmount.value % 100 !== 0 && betAmount.value !== props.balance) return false
  if (selectedType.value === 'number' && selectedNumber.value === undefined) return false
  return true
})

function confirmBet() {
  if (!isValid.value) return
  confirmed.value = true
  emit('confirm-bet', {
    type: selectedType.value,
    amount: betAmount.value,
    ...(selectedType.value === 'number' ? { number: selectedNumber.value } : {}),
  })
}

// Reset when new betting round starts (disabled goes false)
watch(() => props.disabled, (d) => {
  if (!d) confirmed.value = false
})
</script>

<style scoped>
.betting-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  height: 100%;
}
.betting-panel.disabled { opacity: 0.5; pointer-events: none; }

.bet-types {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 5px;
}

.bet-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 7px 4px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--bg2);
  border: 2px solid transparent;
  color: var(--text);
  transition: border-color 0.15s;
}
.bet-type-btn.type-red { background: #2a0808; }
.bet-type-btn.type-black { background: #0a0a1a; border-color: #333; }
.bet-type-btn.type-even,
.bet-type-btn.type-odd,
.bet-type-btn.type-number { background: #1a1040; }
.bet-type-btn.active { border-color: var(--accent2) !important; }

.odds { font-size: 0.6rem; color: var(--gold); margin-top: 2px; }

.number-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 2px;
  max-height: 76px;
  overflow-y: auto;
}

.num-btn {
  font-size: 0.6rem;
  padding: 3px 1px;
  border-radius: 3px;
  font-weight: 700;
  border: none;
}
.num-btn.red { background: var(--red); color: white; }
.num-btn.black { background: #222; color: white; border: 1px solid #555; }
.num-btn.zero { background: var(--green-zero); color: white; }
.num-btn[aria-pressed="true"] { outline: 2px solid var(--gold); }

.amount-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.amount-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg2);
  border: 1px solid var(--rim);
  color: var(--gold);
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.amount-display {
  flex: 1;
  text-align: center;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--gold);
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 6px;
  padding: 5px;
}

.all-in-btn {
  background: #3a1a00;
  border: 1px solid #c05000;
  color: #ff8830;
  font-weight: bold;
  font-size: 0.75rem;
  padding: 5px 8px;
  border-radius: 6px;
}

.confirm-btn {
  width: 100%;
  padding: 10px;
  font-size: 0.95rem;
}
</style>
