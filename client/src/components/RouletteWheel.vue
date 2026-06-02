<template>
  <div class="wheel-scene" :class="{ 'is-static': props.static }">
    <div class="wheel-tilt">
      <div class="wheel-rim">

        <!-- ROTOR — spins: mahogany, numbers, frets, bowl, spokes -->
        <div class="wheel-disc" :style="discStyle" @transitionend="onTransitionEnd">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="outerWood" cx="40%" cy="35%" r="70%">
                <stop offset="0%"   stop-color="#6a3c18"/>
                <stop offset="22%"  stop-color="#3a1c08"/>
                <stop offset="52%"  stop-color="#1e0e04"/>
                <stop offset="82%"  stop-color="#100804"/>
                <stop offset="100%" stop-color="#060302"/>
              </radialGradient>

              <radialGradient id="feltBowl" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stop-color="#091a09"/>
                <stop offset="18%"  stop-color="#143814"/>
                <stop offset="45%"  stop-color="#226022"/>
                <stop offset="72%"  stop-color="#2e8432"/>
                <stop offset="88%"  stop-color="#286228"/>
                <stop offset="100%" stop-color="#183818"/>
              </radialGradient>

              <linearGradient id="goldLinearR" gradientUnits="userSpaceOnUse"
                x1="90" y1="80" x2="310" y2="320">
                <stop offset="0%"   stop-color="#fff8c0"/>
                <stop offset="15%"  stop-color="#f5d060"/>
                <stop offset="38%"  stop-color="#c8960c"/>
                <stop offset="60%"  stop-color="#8a6010"/>
                <stop offset="78%"  stop-color="#e8c020"/>
                <stop offset="100%" stop-color="#b88010"/>
              </linearGradient>

              <radialGradient id="pocketDepth" cx="200" cy="200" r="192"
                gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stop-color="rgba(0,0,0,0)"/>
                <stop offset="56%"  stop-color="rgba(0,0,0,0)"/>
                <stop offset="70%"  stop-color="rgba(0,0,0,0.14)"/>
                <stop offset="83%"  stop-color="rgba(0,0,0,0.60)"/>
                <stop offset="91%"  stop-color="rgba(0,0,0,0.80)"/>
                <stop offset="100%" stop-color="rgba(0,0,0,0.72)"/>
              </radialGradient>

              <filter id="txtShadow">
                <feDropShadow dx="0" dy="0.5" stdDeviation="0.8"
                  flood-color="#000" flood-opacity="1"/>
              </filter>
              <filter id="pinGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="0.7" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <!-- Dark mahogany ring -->
            <circle cx="200" cy="200" r="194" fill="url(#outerWood)"/>

            <!-- Outer gold band -->
            <circle cx="200" cy="200" r="172" fill="none"
              stroke="rgba(255,248,120,0.9)" stroke-width="2.5"/>
            <circle cx="200" cy="200" r="169" fill="none" stroke="#c8960c" stroke-width="7"/>
            <circle cx="200" cy="200" r="163" fill="none"
              stroke="rgba(60,30,0,0.6)" stroke-width="3"/>

            <!-- Segments + per-pocket self-shadow -->
            <path v-for="seg in segments" :key="seg.num" :d="seg.path" :fill="seg.color"/>
            <path v-for="seg in segments" :key="'hl'+seg.num"
              :d="seg.path" :fill="`rgba(255,255,255,${seg.highlightOp})`"/>
            <path v-for="seg in segments" :key="'sd'+seg.num"
              :d="seg.path" :fill="`rgba(0,0,0,${seg.shadowOp})`"/>

            <!-- Numbers -->
            <text
              v-for="seg in segments" :key="'t'+seg.num"
              :x="seg.labelX" :y="seg.labelY"
              text-anchor="middle" dominant-baseline="central"
              fill="white" font-size="10" font-weight="bold" font-family="Georgia, serif"
              :transform="`rotate(${seg.labelAngle}, ${seg.labelX}, ${seg.labelY})`"
              filter="url(#txtShadow)"
            >{{ seg.num }}</text>

            <!-- 3D frets -->
            <line v-for="fret in frets" :key="'fs'+fret.i"
              :x1="fret.x1+1.2" :y1="fret.y1+1.2" :x2="fret.x2+1.2" :y2="fret.y2+1.2"
              stroke="rgba(0,0,0,0.78)" stroke-width="4" stroke-linecap="round"/>
            <line v-for="fret in frets" :key="'fb'+fret.i"
              :x1="fret.x1" :y1="fret.y1" :x2="fret.x2" :y2="fret.y2"
              stroke="url(#goldLinearR)" stroke-width="2.2" stroke-linecap="round"/>
            <line v-for="fret in frets" :key="'fh'+fret.i"
              :x1="fret.x1" :y1="fret.y1" :x2="fret.x2" :y2="fret.y2"
              stroke="rgba(255,252,190,0.70)" stroke-width="0.65" stroke-linecap="round"/>

            <!-- Pocket depth + inner edge highlight -->
            <circle cx="200" cy="200" r="194" fill="url(#pocketDepth)"/>
            <circle cx="200" cy="200" r="111" fill="none"
              stroke="rgba(255,255,255,0.16)" stroke-width="5"/>

            <!-- Inner gold band -->
            <circle cx="200" cy="200" r="110" fill="none"
              stroke="rgba(60,30,0,0.5)" stroke-width="3"/>
            <circle cx="200" cy="200" r="107" fill="none" stroke="#c8960c" stroke-width="7"/>
            <circle cx="200" cy="200" r="101" fill="none"
              stroke="rgba(255,248,120,0.85)" stroke-width="2.5"/>

            <!-- Pins -->
            <circle v-for="pin in outerPins" :key="'op'+pin.i"
              :cx="pin.x" :cy="pin.y" r="2.6"
              fill="url(#goldLinearR)" stroke="#50300a" stroke-width="0.4"
              filter="url(#pinGlow)"/>

            <!-- Diamonds -->
            <polygon v-for="(pts, di) in diamonds" :key="'d'+di"
              :points="pts" fill="url(#goldLinearR)"
              stroke="rgba(0,0,0,0.4)" stroke-width="0.5"/>

            <!-- Green concave bowl (dark center = deepest) -->
            <circle cx="200" cy="200" r="100" fill="url(#feltBowl)"/>
            <circle cx="200" cy="200" r="82" fill="none"
              stroke="rgba(0,0,0,0.22)" stroke-width="1.2"/>
            <circle cx="200" cy="200" r="62" fill="none"
              stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
            <circle cx="200" cy="200" r="44" fill="none"
              stroke="rgba(0,0,0,0.15)" stroke-width="0.8"/>
            <circle cx="200" cy="200" r="97" fill="none"
              stroke="rgba(255,255,255,0.10)" stroke-width="6"/>
            <circle cx="200" cy="200" r="100" fill="none"
              stroke="rgba(255,248,120,0.4)" stroke-width="1.5"/>

            <!-- Spokes (rotate with rotor — show motion) -->
            <line v-for="sp in spokes" :key="'ss'+sp.i"
              :x1="sp.x1+1.0" :y1="sp.y1+1.0" :x2="sp.x2+1.0" :y2="sp.y2+1.0"
              stroke="rgba(0,0,0,0.55)" stroke-width="3" stroke-linecap="round"/>
            <line v-for="sp in spokes" :key="'sg'+sp.i"
              :x1="sp.x1" :y1="sp.y1" :x2="sp.x2" :y2="sp.y2"
              stroke="url(#goldLinearR)" stroke-width="1.8" stroke-linecap="round"/>
            <line v-for="sp in spokes" :key="'sk'+sp.i"
              :x1="sp.x1" :y1="sp.y1" :x2="sp.x2" :y2="sp.y2"
              stroke="rgba(255,250,180,0.55)" stroke-width="0.55" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- Ball — spirals inward then settles at top (winning pocket) -->
        <div v-if="!props.static" class="ball-track" :style="ballStyle">
          <div class="ball" :class="{ settling }"/>
        </div>

        <!-- STATIC LAYER — does NOT spin: fixed room light + upright 3D mast -->
        <div class="wheel-static">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldLinearS" gradientUnits="userSpaceOnUse"
                x1="90" y1="80" x2="310" y2="320">
                <stop offset="0%"   stop-color="#fff8c0"/>
                <stop offset="15%"  stop-color="#f5d060"/>
                <stop offset="38%"  stop-color="#c8960c"/>
                <stop offset="60%"  stop-color="#8a6010"/>
                <stop offset="78%"  stop-color="#e8c020"/>
                <stop offset="100%" stop-color="#b88010"/>
              </linearGradient>

              <linearGradient id="shaftLower" gradientUnits="userSpaceOnUse"
                x1="188" y1="0" x2="212" y2="0">
                <stop offset="0%" stop-color="#2a1206"/><stop offset="18%" stop-color="#9a6218"/>
                <stop offset="50%" stop-color="#f5d060"/><stop offset="82%" stop-color="#9a6218"/>
                <stop offset="100%" stop-color="#2a1206"/>
              </linearGradient>
              <linearGradient id="shaftUpper" gradientUnits="userSpaceOnUse"
                x1="193" y1="0" x2="207" y2="0">
                <stop offset="0%" stop-color="#2a1206"/><stop offset="20%" stop-color="#c88820"/>
                <stop offset="50%" stop-color="#fff8c0"/><stop offset="80%" stop-color="#c88820"/>
                <stop offset="100%" stop-color="#2a1206"/>
              </linearGradient>
              <linearGradient id="shaftNarrow" gradientUnits="userSpaceOnUse"
                x1="195" y1="0" x2="205" y2="0">
                <stop offset="0%" stop-color="#1e0e04"/><stop offset="20%" stop-color="#d09020"/>
                <stop offset="50%" stop-color="#fff8c0"/><stop offset="80%" stop-color="#d09020"/>
                <stop offset="100%" stop-color="#1e0e04"/>
              </linearGradient>

              <radialGradient id="flangeBase" cx="38%" cy="34%" r="68%">
                <stop offset="0%" stop-color="#fff8c0"/><stop offset="25%" stop-color="#f0c030"/>
                <stop offset="58%" stop-color="#b88010"/><stop offset="100%" stop-color="#6a4008"/>
              </radialGradient>
              <radialGradient id="flangeMid" cx="36%" cy="32%" r="65%">
                <stop offset="0%" stop-color="#fff0a0"/><stop offset="30%" stop-color="#e8b820"/>
                <stop offset="65%" stop-color="#a87010"/><stop offset="100%" stop-color="#5a3806"/>
              </radialGradient>
              <radialGradient id="ballGrad" cx="32%" cy="28%" r="62%">
                <stop offset="0%" stop-color="#fffce0"/><stop offset="22%" stop-color="#f5d840"/>
                <stop offset="52%" stop-color="#c89008"/><stop offset="78%" stop-color="#7a5004"/>
                <stop offset="100%" stop-color="#3a2402"/>
              </radialGradient>

              <!-- Fixed room light (stays top-left while rotor spins) -->
              <radialGradient id="sphereLight" cx="30%" cy="26%" r="52%" fx="30%" fy="26%">
                <stop offset="0%"   stop-color="white" stop-opacity="0.26"/>
                <stop offset="42%"  stop-color="white" stop-opacity="0.07"/>
                <stop offset="100%" stop-color="white" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
                <stop offset="56%"  stop-color="black" stop-opacity="0"/>
                <stop offset="100%" stop-color="black" stop-opacity="0.72"/>
              </radialGradient>
            </defs>

            <!-- Fixed lighting overlays (over the spinning rotor beneath) -->
            <circle cx="200" cy="200" r="194" fill="url(#sphereLight)"/>
            <circle cx="200" cy="200" r="194" fill="url(#vignette)"/>

            <!-- 3D MAST / stožár — upright, never rotates -->
            <!-- cast shadow on bowl -->
            <ellipse cx="202" cy="204" rx="30" ry="10" fill="rgba(0,0,0,0.35)"/>

            <!-- base flange -->
            <ellipse cx="200" cy="200" rx="34" ry="11" fill="url(#flangeBase)"/>
            <ellipse cx="200" cy="200" rx="34" ry="11" fill="none"
              stroke="rgba(255,248,160,0.7)" stroke-width="1.5"/>
            <ellipse cx="201" cy="201" rx="34" ry="11" fill="none"
              stroke="rgba(0,0,0,0.4)" stroke-width="2"/>

            <!-- lower shaft cylinder (y 200→178) -->
            <polygon points="188,200 188,178 212,178 212,200" fill="#2a1206"/>
            <polygon points="188,200 188,178 212,178 212,200" fill="url(#shaftLower)"/>
            <line x1="188" y1="200" x2="188" y2="178" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>
            <line x1="212" y1="200" x2="212" y2="178" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>
            <line x1="200" y1="200" x2="200" y2="178" stroke="rgba(255,248,180,0.45)" stroke-width="1.2"/>

            <!-- mid flange (y=178) -->
            <ellipse cx="200" cy="178" rx="24" ry="8" fill="url(#flangeMid)"/>
            <ellipse cx="200" cy="178" rx="24" ry="8" fill="none"
              stroke="rgba(255,248,160,0.6)" stroke-width="1.2"/>

            <!-- upper shaft (y 178→160) -->
            <polygon points="193,178 193,160 207,160 207,178" fill="url(#shaftUpper)"/>
            <line x1="193" y1="178" x2="193" y2="160" stroke="rgba(0,0,0,0.45)" stroke-width="1.2"/>
            <line x1="207" y1="178" x2="207" y2="160" stroke="rgba(0,0,0,0.45)" stroke-width="1.2"/>
            <line x1="200" y1="178" x2="200" y2="160" stroke="rgba(255,248,180,0.42)" stroke-width="1"/>

            <!-- upper flange (y=160) -->
            <ellipse cx="200" cy="160" rx="17" ry="5.8" fill="url(#flangeBase)"/>
            <ellipse cx="200" cy="160" rx="17" ry="5.8" fill="none"
              stroke="rgba(255,248,160,0.55)" stroke-width="1"/>

            <!-- narrow shaft (y 160→146) -->
            <polygon points="195,160 195,146 205,146 205,160" fill="url(#shaftNarrow)"/>
            <line x1="195" y1="160" x2="195" y2="146" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
            <line x1="205" y1="160" x2="205" y2="146" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>

            <!-- top collar (y=146) -->
            <ellipse cx="200" cy="146" rx="12" ry="4" fill="url(#flangeMid)"/>
            <ellipse cx="200" cy="146" rx="12" ry="4" fill="none"
              stroke="rgba(255,248,160,0.5)" stroke-width="1"/>

            <!-- ball finial (y=133) -->
            <circle cx="200" cy="133" r="13" fill="url(#ballGrad)"/>
            <circle cx="200" cy="133" r="13" fill="none"
              stroke="rgba(255,248,160,0.4)" stroke-width="1"/>
            <ellipse cx="196" cy="129" rx="5.5" ry="4" fill="rgba(255,255,245,0.9)"/>

            <!-- tip spike -->
            <ellipse cx="200" cy="122" rx="4" ry="1.4" fill="url(#flangeBase)"/>
            <polygon points="196,122 204,122 201,114 199,114" fill="url(#shaftNarrow)"/>
            <circle cx="200" cy="112" r="3.5" fill="url(#ballGrad)"/>
            <ellipse cx="198.8" cy="111" rx="1.8" ry="1.3" fill="rgba(255,255,245,0.85)"/>
          </svg>
        </div>

      </div>
    </div>
    <div v-if="!props.static" class="marker"/>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
]
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const SEG_ANGLE   = 360 / 37
const LIGHT_ANGLE = 315
const SPIN_MS     = 5000
const DISC_TURNS  = 8
const BALL_TURNS  = 12  // integer → ball ends exactly at top (winning pocket)

const props = defineProps<{
  spinning?: boolean
  targetNumber?: number
  static?: boolean
}>()

const emit = defineEmits<{ 'spin-complete': [] }>()

function getColor(n: number): string {
  if (n === 0) return '#1b5e20'
  return RED_NUMBERS.has(n) ? '#c0241a' : '#111111'
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function segPath(i: number): string {
  const cx = 200, cy = 200, outerR = 168, innerR = 108
  const s0 = i * SEG_ANGLE, s1 = (i + 1) * SEG_ANGLE
  const os  = polarToCartesian(cx, cy, outerR, s0)
  const oe  = polarToCartesian(cx, cy, outerR, s1)
  const ie  = polarToCartesian(cx, cy, innerR, s1)
  const is2 = polarToCartesian(cx, cy, innerR, s0)
  return `M${os.x},${os.y} A${outerR},${outerR} 0 0,1 ${oe.x},${oe.y} L${ie.x},${ie.y} A${innerR},${innerR} 0 0,0 ${is2.x},${is2.y} Z`
}

const segments = computed(() =>
  WHEEL_ORDER.map((num, i) => {
    const midAngle = (i + 0.5) * SEG_ANGLE
    const { x, y } = polarToCartesian(200, 200, 138, midAngle)
    const cosVal = Math.cos((midAngle - LIGHT_ANGLE) * Math.PI / 180)
    return {
      num, color: getColor(num), path: segPath(i),
      labelX: x, labelY: y, labelAngle: midAngle,
      highlightOp: cosVal > 0 ? (cosVal * 0.14).toFixed(3) : '0',
      shadowOp:    cosVal < 0 ? (-cosVal * 0.26).toFixed(3) : '0',
    }
  }),
)

const frets = computed(() =>
  Array.from({ length: 37 }, (_, i) => {
    const angle = i * SEG_ANGLE
    const inner = polarToCartesian(200, 200, 108, angle)
    const outer = polarToCartesian(200, 200, 168, angle)
    return { i, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
  }),
)

const outerPins = computed(() =>
  Array.from({ length: 37 }, (_, i) => {
    const { x, y } = polarToCartesian(200, 200, 170, i * SEG_ANGLE)
    return { i, x, y }
  }),
)

const diamonds = computed(() =>
  Array.from({ length: 8 }, (_, i) => {
    const angleDeg = i * 45
    const r = 186
    const rad = (angleDeg - 90) * Math.PI / 180
    const perpRad = rad + Math.PI / 2
    const cx = 200 + r * Math.cos(rad), cy = 200 + r * Math.sin(rad)
    const h = 5.5, w = 3.5
    const top = { x: cx + h * Math.cos(rad),     y: cy + h * Math.sin(rad) }
    const bot = { x: cx - h * Math.cos(rad),     y: cy - h * Math.sin(rad) }
    const lft = { x: cx - w * Math.cos(perpRad), y: cy - w * Math.sin(perpRad) }
    const rgt = { x: cx + w * Math.cos(perpRad), y: cy + w * Math.sin(perpRad) }
    return `${top.x},${top.y} ${rgt.x},${rgt.y} ${bot.x},${bot.y} ${lft.x},${lft.y}`
  }),
)

const spokes = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30
    const rad = (angle - 90) * Math.PI / 180
    return {
      i,
      x1: 200 + 36 * Math.cos(rad), y1: 200 + 36 * Math.sin(rad),
      x2: 200 + 98 * Math.cos(rad), y2: 200 + 98 * Math.sin(rad),
    }
  }),
)

const currentRotation = ref(0)
const isAnimating = ref(false)
const settling    = ref(false)
const discStyle   = ref<Record<string, string>>({})
const ballStyle   = ref<Record<string, string>>({})

const BALL_END = -360 * BALL_TURNS

watch(() => props.spinning, (spinning) => {
  if (!spinning || props.targetNumber === undefined || isAnimating.value) return
  isAnimating.value = true
  settling.value = false

  const targetIdx    = WHEEL_ORDER.indexOf(props.targetNumber)
  const targetCenter = (targetIdx + 0.5) * SEG_ANGLE
  // rotor: spin DISC_TURNS, land winning pocket under the top marker
  const additionalRotation = ((360 - targetCenter) % 360) + 360 * DISC_TURNS
  const startRotation = currentRotation.value
  const finalRotation = startRotation + additionalRotation

  // Start frame (no transition) so the rotor has a state to animate FROM even
  // when the wheel was just revealed from display:none (v-show).
  discStyle.value = { transform: `rotate(${startRotation}deg)`, transition: 'none' }
  // Ball — step 1: jump onto the OUTER track (inset 6%), no transition
  ballStyle.value = { inset: '6%', transform: 'rotate(0deg)', transition: 'none' }

  // Next frame: kick off both transitions to their final resting state.
  nextTick().then(() => requestAnimationFrame(() => {
    discStyle.value = {
      transform: `rotate(${finalRotation}deg)`,
      transition: `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.78, 0.22, 1)`,
    }
    // Ball — step 2: spin opposite + spiral INWARD to the pocket ring (inset 16%)
    ballStyle.value = {
      inset: '16%',
      transform: `rotate(${BALL_END}deg)`,
      // rotation decelerates; inset (radial drop) holds out then falls in late
      transition:
        `transform ${SPIN_MS}ms cubic-bezier(0.16, 0.72, 0.24, 1), ` +
        `inset ${SPIN_MS}ms cubic-bezier(0.55, 0.02, 0.85, 0.92)`,
    }
  }))

  currentRotation.value = finalRotation % 360
})

function onTransitionEnd(e: Event) {
  // only react to the rotor's transform finishing
  if (!isAnimating.value || (e as TransitionEvent).propertyName !== 'transform') return
  isAnimating.value = false
  discStyle.value = { transform: `rotate(${currentRotation.value}deg)` }
  // freeze ball at landing spot, play a small settle bounce
  ballStyle.value = { inset: '16%', transform: `rotate(${BALL_END}deg)` }
  settling.value = true
  setTimeout(() => { settling.value = false }, 650)
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
  width: min(85%, 70vh, 520px);
  aspect-ratio: 1;
  perspective: 600px;
  position: relative;
}

.wheel-rim {
  width: 100%;
  height: 100%;
  transform: rotateX(52deg);
  transform-style: preserve-3d;
  border-radius: 50%;
  background: radial-gradient(ellipse at 40% 35%,
    #5a3010 0%, #2a1408 30%, #120804 60%, #060302 100%);
  box-shadow:
    inset 0 0 25px rgba(0,0,0,0.85),
    0 0 0 3px rgba(255,248,140,0.85),
    0 0 0 7px #c8960c,
    0 0 0 11px #5a3808,
    0 0 0 17px #f0c840,
    0 0 0 21px #7a5010,
    0 0 0 25px rgba(0,0,0,0.35),
    0 17px 0 25px #2a1408,
    0 24px 0 25px #c8960c,
    0 32px 0 23px #0e0602,
    0 39px 0 20px #d4a018,
    0 46px 0 17px #080402,
    0 52px 0 13px #c09010,
    0 80px 30px rgba(0,0,0,0.98),
    0 115px 65px rgba(0,0,0,0.55);
  position: relative;
  overflow: visible;
}

.wheel-disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  will-change: transform;
}

/* Static overlay — fixed light + upright mast, never rotates */
.wheel-static {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.wheel-disc svg,
.wheel-static svg { width: 100%; height: 100%; display: block; }

.ball-track {
  position: absolute;
  inset: 14%;
  border-radius: 50%;
  transform-origin: center;
  will-change: transform;
  pointer-events: none;
  z-index: 5;
}

/* 3D ivory casino ball */
.ball {
  position: absolute;
  top: -8px;
  left: calc(50% - 8px);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 26%,
      rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.72) 10%, transparent 32%),
    radial-gradient(circle at 72% 75%,
      rgba(180,220,180,0.20) 0%, transparent 40%),
    radial-gradient(circle at 45% 42%,
      #f0ede0 0%, #c8c4b5 32%, #888075 62%, #404038 88%, #1a1810 100%);
  box-shadow:
    0 4px 12px rgba(0,0,0,0.95),
    0 1px 3px  rgba(0,0,0,0.85),
    inset 0 -3px 5px rgba(0,0,0,0.60),
    inset 0 1px 2px rgba(255,255,255,0.30);
}

/* settle bounce when the ball drops into its pocket */
.ball.settling { animation: ballSettle 0.65s cubic-bezier(0.3, 0.6, 0.4, 1); }
@keyframes ballSettle {
  0%   { transform: translateY(-7px) scale(1.04); }
  35%  { transform: translateY(2px)  scale(0.98); }
  60%  { transform: translateY(-3px) scale(1.01); }
  80%  { transform: translateY(1px)  scale(0.995); }
  100% { transform: translateY(0)    scale(1); }
}

.marker {
  position: absolute;
  top: 3%;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 16px solid #f0c060;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  z-index: 10;
}

.is-static .ball-track,
.is-static .marker { display: none; }
</style>
