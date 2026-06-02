<template>
  <div class="betting-panel" :class="{ disabled: props.disabled }">
    <!-- Classic European roulette layout (tapis) -->
    <div class="tapis">
      <!-- 0 — pointed cell down the left, spans the three number rows -->
      <button
        class="cell zero"
        :class="{ sel: isSel('number', 0) }"
        :style="gpos(1, '1 / span 3')"
        :disabled="props.disabled"
        @click="pick('number', 0)"
      >0</button>

      <!-- Numbers 1–36 -->
      <button
        v-for="n in 36"
        :key="n"
        class="cell num"
        :class="[numColor(n), { sel: isSel('number', n) }]"
        :style="gpos(Math.ceil(n / 3) + 1, numRow(n))"
        :disabled="props.disabled"
        @click="pick('number', n)"
      >{{ n }}</button>

      <!-- Column bets "2 to 1" (right edge) -->
      <button
        v-for="c in COLUMNS"
        :key="'col' + c.col"
        class="cell felt col2to1"
        :class="{ sel: isSel('column', c.col) }"
        :style="gpos(14, c.row)"
        :disabled="props.disabled"
        @click="pick('column', c.col)"
      >2 to 1</button>

      <!-- Dozens -->
      <button
        v-for="d in DOZENS"
        :key="'doz' + d.n"
        class="cell felt dozen"
        :class="{ sel: isSel('dozen', d.n) }"
        :style="gpos(`${d.colStart} / span 4`, 4)"
        :disabled="props.disabled"
        @click="pick('dozen', d.n)"
      >{{ d.label }}</button>

      <!-- Outside bets (bottom row) -->
      <button
        v-for="o in OUTSIDE"
        :key="o.key"
        class="cell felt"
        :class="{ sel: isSel(o.type, undefined) }"
        :style="gpos(`${o.colStart} / span 2`, 5)"
        :disabled="props.disabled"
        @click="pick(o.type, undefined)"
      >
        <span v-if="o.diamond" class="diamond" :class="o.diamond" />
        <template v-else>{{ o.label }}</template>
      </button>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="sel-label">{{ selectionLabel }}</div>
      <div class="amount">
        <button class="amt-btn" :disabled="props.disabled || betAmount <= 100" @click="adjust(-100)">−</button>
        <span class="amt-val">${{ betAmount.toLocaleString() }}</span>
        <button class="amt-btn" :disabled="props.disabled || betAmount >= props.balance" @click="adjust(100)">+</button>
        <button class="all-in" :disabled="props.disabled" @click="betAmount = props.balance">Vše</button>
      </div>
      <button
        class="confirm btn-primary"
        :disabled="props.disabled || !canBet || confirmed"
        @click="confirmBet"
      >{{ confirmed ? 'Čekáme na ostatní…' : 'Vsadit' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { BetType } from '@ruleta/shared'

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

// "2 to 1" column cells: top row = column 3 (multiples of 3), middle = 2, bottom = 1
const COLUMNS = [
  { col: 3, row: 1 },
  { col: 2, row: 2 },
  { col: 1, row: 3 },
]
const DOZENS = [
  { n: 1, label: '1st 12', colStart: 2 },
  { n: 2, label: '2nd 12', colStart: 6 },
  { n: 3, label: '3rd 12', colStart: 10 },
]
const OUTSIDE: { key: string; type: BetType; label?: string; diamond?: 'red' | 'black'; colStart: number }[] = [
  { key: 'low',   type: 'low',   label: '1 to 18',  colStart: 2 },
  { key: 'even',  type: 'even',  label: 'EVEN',     colStart: 4 },
  { key: 'red',   type: 'red',   diamond: 'red',    colStart: 6 },
  { key: 'black', type: 'black', diamond: 'black',  colStart: 8 },
  { key: 'odd',   type: 'odd',   label: 'ODD',      colStart: 10 },
  { key: 'high',  type: 'high',  label: '19 to 36', colStart: 12 },
]

const ODDS: Record<BetType, string> = {
  red: '1:1', black: '1:1', even: '1:1', odd: '1:1', low: '1:1', high: '1:1',
  dozen: '2:1', column: '2:1', number: '35:1',
}

const props = defineProps<{
  balance: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'confirm-bet': [{ type: BetType; amount: number; number?: number }]
}>()

const selected = ref<{ type: BetType; number?: number }>({ type: 'red' })
const betAmount = ref<number>(100)
const confirmed = ref(false)

function numColor(n: number): string {
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}
// Row inside the number grid: top = 3,6,9… / middle = 2,5,8… / bottom = 1,4,7…
function numRow(n: number): number {
  return n % 3 === 0 ? 1 : n % 3 === 2 ? 2 : 3
}
function gpos(col: number | string, row: number | string) {
  return { gridColumn: String(col), gridRow: String(row) }
}

function pick(type: BetType, number?: number) {
  selected.value = number === undefined ? { type } : { type, number }
}
function isSel(type: BetType, number?: number): boolean {
  return selected.value.type === type && selected.value.number === number
}

function adjust(delta: number) {
  const next = betAmount.value + delta
  if (next >= 100 && next <= props.balance) betAmount.value = next
}

const selectionLabel = computed(() => {
  const s = selected.value
  const odds = ` · ${ODDS[s.type]}`
  switch (s.type) {
    case 'number': return `Číslo ${s.number}${odds}`
    case 'red':    return `Červená${odds}`
    case 'black':  return `Černá${odds}`
    case 'even':   return `Sudá${odds}`
    case 'odd':    return `Lichá${odds}`
    case 'low':    return `1–18${odds}`
    case 'high':   return `19–36${odds}`
    case 'dozen':  return `Tucet ${['1–12', '13–24', '25–36'][(s.number ?? 1) - 1]}${odds}`
    case 'column': return `Sloupec${odds}`
    default:       return ''
  }
})

const canBet = computed(() => {
  if (betAmount.value < 100 || betAmount.value > props.balance) return false
  if (betAmount.value % 100 !== 0 && betAmount.value !== props.balance) return false
  return true
})

function confirmBet() {
  if (!canBet.value) return
  confirmed.value = true
  const s = selected.value
  emit('confirm-bet', {
    type: s.type,
    amount: betAmount.value,
    ...(s.number !== undefined ? { number: s.number } : {}),
  })
}

// Reset confirmation when a new betting round opens
watch(() => props.disabled, (d) => {
  if (!d) confirmed.value = false
})
</script>

<style scoped>
.betting-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  width: 100%;
}
.betting-panel.disabled { opacity: 0.55; pointer-events: none; }

/* ---- Tapis ---- */
.tapis {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.3fr repeat(12, 1fr) 1fr;
  grid-template-rows: 1.1fr 1.1fr 1.1fr 0.78fr 0.85fr;
  gap: 3px;
  padding: 5px;
  border: 2px solid #d9b441;
  border-radius: 6px;
  background: #0a3d20;
  box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.45);
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: clamp(0.5rem, 1.25vw, 1rem);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 2px;
  padding: 2px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.6);
  transition: box-shadow 0.12s, transform 0.08s;
}
.cell:active { transform: scale(0.95); }

.cell.red { background: var(--red); }
.cell.black { background: #1a1a2e; }

/* Felt-coloured cells (outside bets / dozens / columns) */
.cell.felt {
  background: rgba(255, 255, 255, 0.05);
  font-size: clamp(0.45rem, 1.05vw, 0.85rem);
  letter-spacing: 0.02em;
}
.cell.col2to1 { writing-mode: vertical-rl; transform: rotate(180deg); }

/* 0 — green, pointed on the left like the felt */
.cell.zero {
  background: var(--green-zero);
  font-size: clamp(0.7rem, 1.8vw, 1.3rem);
  clip-path: polygon(32% 0, 100% 0, 100% 100%, 32% 100%, 0 50%);
}

/* Red / black diamonds */
.diamond {
  width: 46%;
  aspect-ratio: 1;
  transform: rotate(45deg);
  border: 1px solid rgba(255, 255, 255, 0.65);
}
.diamond.red { background: var(--red); }
.diamond.black { background: #1a1a2e; }

.cell.sel {
  box-shadow: inset 0 0 0 2px var(--gold), 0 0 10px rgba(240, 192, 96, 0.85);
  z-index: 2;
}

/* ---- Controls ---- */
.controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sel-label {
  flex: 1;
  min-width: 90px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--gold);
  white-space: nowrap;
}
.amount {
  display: flex;
  align-items: center;
  gap: 6px;
}
.amt-btn {
  width: 32px;
  height: 32px;
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
.amt-val {
  min-width: 84px;
  text-align: center;
  font-size: 1.05rem;
  font-weight: bold;
  color: var(--gold);
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 6px;
  padding: 5px 6px;
}
.all-in {
  background: #3a1a00;
  border: 1px solid #c05000;
  color: #ff8830;
  font-weight: bold;
  font-size: 0.75rem;
  padding: 6px 10px;
  border-radius: 6px;
}
.confirm {
  padding: 9px 18px;
  font-size: 0.95rem;
}
</style>
