import { ref } from 'vue'

const muted = ref(false)
let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3) {
  if (muted.value) return
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    gain.gain.setValueAtTime(vol, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + dur)
  } catch { /* AudioContext not available */ }
}

let tickInterval: ReturnType<typeof setInterval> | null = null

export function useSound() {
  function startTicking() {
    if (tickInterval) return
    tickInterval = setInterval(() => playTone(800, 0.05, 'square', 0.15), 120)
  }

  function stopTicking() {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
  }

  function slowdownSound() {
    stopTicking()
    ;[0, 200, 500, 900].forEach(d => setTimeout(() => playTone(600, 0.15, 'sine', 0.2), d))
  }

  function playWin() {
    [0, 150, 300].forEach((d, i) => setTimeout(() => playTone(440 + i * 110, 0.3, 'sine', 0.4), d))
  }

  function playLoss() {
    playTone(220, 0.5, 'sawtooth', 0.2)
  }

  function playClick() {
    playTone(1200, 0.05, 'square', 0.1)
  }

  function toggleMute() {
    muted.value = !muted.value
    if (muted.value) stopTicking()
  }

  return { muted, startTicking, stopTicking, slowdownSound, playWin, playLoss, playClick, toggleMute }
}
