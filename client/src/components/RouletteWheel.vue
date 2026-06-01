<template>
  <div class="wheel-scene" :class="{ 'is-static': props.static }">
    <div class="wheel-tilt">
      <div class="wheel-rim">
        <div
          class="wheel-disc"
          :style="discStyle"
          @transitionend="onTransitionEnd"
        >
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <g v-for="seg in segments" :key="seg.num">
              <path :d="seg.path" :fill="seg.color" stroke="#1a0a40" stroke-width="1.5" />
              <text
                :x="seg.labelX"
                :y="seg.labelY"
                text-anchor="middle"
                dominant-baseline="central"
                fill="white"
                font-size="11"
                font-weight="bold"
                :transform="`rotate(${seg.labelAngle}, ${seg.labelX}, ${seg.labelY})`"
              >{{ seg.num }}</text>
            </g>
            <!-- Center hub -->
            <circle cx="200" cy="200" r="32" fill="#3a2570" stroke="#6b4fc4" stroke-width="3" />
            <circle cx="200" cy="200" r="20" fill="#5a3a90" stroke="#8b6fd4" stroke-width="2" />
            <!-- Spokes -->
            <line v-for="a in [0, 60, 120, 180, 240, 300]" :key="a"
              :x1="200 + 20 * Math.cos((a - 90) * Math.PI / 180)"
              :y1="200 + 20 * Math.sin((a - 90) * Math.PI / 180)"
              :x2="200 + 30 * Math.cos((a - 90) * Math.PI / 180)"
              :y2="200 + 30 * Math.sin((a - 90) * Math.PI / 180)"
              stroke="#8b6fd4" stroke-width="2"
            />
          </svg>
        </div>
        <!-- Ball track (counter-rotates) -->
        <div
          v-if="!props.static"
          class="ball-track"
          :style="ballStyle"
        >
          <div class="ball" />
        </div>
      </div>
    </div>
    <!-- Top marker -->
    <div v-if="!props.static" class="marker" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
]
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const SEG_ANGLE = 360 / 37

const props = defineProps<{
  spinning?: boolean
  targetNumber?: number
  static?: boolean
}>()

const emit = defineEmits<{ 'spin-complete': [] }>()

function getColor(n: number): string {
  if (n === 0) return '#27ae60'
  return RED_NUMBERS.has(n) ? '#c0392b' : '#1a1a2e'
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function segPath(i: number): string {
  const cx = 200, cy = 200, r = 192
  const s = polarToCartesian(cx, cy, r, i * SEG_ANGLE)
  const e = polarToCartesian(cx, cy, r, (i + 1) * SEG_ANGLE)
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 0,1 ${e.x},${e.y} Z`
}

const segments = computed(() =>
  WHEEL_ORDER.map((num, i) => {
    const midAngle = (i + 0.5) * SEG_ANGLE
    const { x, y } = polarToCartesian(200, 200, 158, midAngle)
    return {
      num,
      color: getColor(num),
      path: segPath(i),
      labelX: x,
      labelY: y,
      labelAngle: midAngle,
    }
  }),
)

const currentRotation = ref(0)
const isAnimating = ref(false)
const discStyle = ref<Record<string, string>>({})
const ballStyle = ref<Record<string, string>>({})

watch(() => props.spinning, (spinning) => {
  if (!spinning || props.targetNumber === undefined || isAnimating.value) return
  isAnimating.value = true

  const targetIdx = WHEEL_ORDER.indexOf(props.targetNumber)
  const targetCenter = (targetIdx + 0.5) * SEG_ANGLE
  // Spin 8 full rotations + land target at top (0°)
  const additionalRotation = ((360 - targetCenter) % 360) + 360 * 8
  const finalRotation = currentRotation.value + additionalRotation

  discStyle.value = {
    transform: `rotate(${finalRotation}deg)`,
    transition: 'transform 5s cubic-bezier(0.2, 0.8, 0.3, 1)',
  }
  ballStyle.value = {
    transform: `rotate(${-finalRotation * 1.35}deg)`,
    transition: 'transform 5s cubic-bezier(0.5, 0, 0.6, 1)',
  }

  currentRotation.value = finalRotation % 360
})

function onTransitionEnd() {
  if (!isAnimating.value) return
  isAnimating.value = false
  discStyle.value = { transform: `rotate(${currentRotation.value}deg)` }
  ballStyle.value = {}
  emit('spin-complete')
}
</script>

<style scoped>
.wheel-scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wheel-tilt {
  width: min(50vw, 90vh);
  aspect-ratio: 1;
  perspective: 800px;
}

.wheel-rim {
  width: 100%;
  height: 100%;
  transform: rotateX(52deg);
  transform-style: preserve-3d;
  border-radius: 50%;
  background: radial-gradient(ellipse at 30% 30%, #6a4aaa, #2a1060);
  box-shadow:
    0 0 0 8px #3a2078,
    0 0 0 14px #2a1060,
    0 20px 60px rgba(0,0,0,0.8);
  position: relative;
  overflow: visible;
}

.wheel-disc {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  will-change: transform;
}

.wheel-disc svg {
  width: 100%;
  height: 100%;
  display: block;
}

.ball-track {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  transform-origin: center;
  will-change: transform;
  pointer-events: none;
}

.ball {
  position: absolute;
  top: -6px;
  left: calc(50% - 7px);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff8c0, #d4a020);
  box-shadow: 0 2px 6px rgba(0,0,0,0.6);
}

.marker {
  position: absolute;
  top: 3%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 16px solid #f0c060;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  z-index: 10;
}

.is-static .ball-track,
.is-static .marker { display: none; }
</style>
