# PWA — Add to Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Ruleta web app an installable PWA with a "📲 Přidat na plochu" button on the home screen.

**Architecture:** Configure `vite-plugin-pwa` to emit a web manifest + service worker (precache, offline). Add generated app icons. A `useInstallPrompt` composable encapsulates `beforeinstallprompt` capture, standalone/iOS detection, and the install trigger. HomeView shows the button (smart visibility) and an iOS instructions modal.

**Tech Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Vite 5, `vite-plugin-pwa`, Vitest. Icons generated via `npx @resvg/resvg-js-cli` (SVG→PNG) + `sips` (resize) on macOS.

---

## File Structure

- `client/package.json` — add `vite-plugin-pwa` dev dependency.
- `client/vite.config.ts` — register `VitePWA` plugin with manifest + workbox config.
- `client/index.html` — add `theme-color` meta + `apple-touch-icon` link.
- `client/icon-source/icon.svg` — source SVG for standard icon (committed for regeneration).
- `client/icon-source/icon-maskable.svg` — source SVG for maskable icon (padded).
- `client/public/pwa-192x192.png`, `pwa-512x512.png`, `pwa-512x512-maskable.png`, `apple-touch-icon-180x180.png` — generated icons.
- `client/src/composables/useInstallPrompt.ts` — install logic (create).
- `client/src/composables/useInstallPrompt.test.ts` — unit tests (create).
- `client/src/views/HomeView.vue` — add button + iOS hint modal (modify).

> **Note (project memory):** stale `.vue.js`/`.js` artifacts in `client/src` can shadow edited `.ts`/`.vue`. After editing, if a change has no effect, delete the matching compiled artifact. `useInstallPrompt.ts` is new so no shadow exists, but `HomeView.vue.js` already exists — see Task 6.

---

## Task 1: Install vite-plugin-pwa

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Add the dependency**

Run from `client/`:

```bash
cd client && npm install -D vite-plugin-pwa
```

Expected: `vite-plugin-pwa` appears under `devDependencies` in `client/package.json`, `npm install` exits 0.

- [ ] **Step 2: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore: add vite-plugin-pwa dependency"
```

---

## Task 2: Generate app icons

The icon is a stylized roulette wheel / chip in the game's palette (background `#0d0b1e`, gold accent `#f0c060`, purple `#7b4fc4`, red `#c0392b`).

**Files:**
- Create: `client/icon-source/icon.svg`
- Create: `client/icon-source/icon-maskable.svg`
- Create: `client/public/pwa-512x512.png`
- Create: `client/public/pwa-192x192.png`
- Create: `client/public/apple-touch-icon-180x180.png`
- Create: `client/public/pwa-512x512-maskable.png`

- [ ] **Step 1: Write the standard icon SVG**

Create `client/icon-source/icon.svg` (512×512, art fills most of the canvas):

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0d0b1e"/>
  <circle cx="256" cy="256" r="190" fill="none" stroke="#7b4fc4" stroke-width="14"/>
  <circle cx="256" cy="256" r="172" fill="#1a1a2e"/>
  <!-- 8 alternating red/black pockets via dashed ring -->
  <circle cx="256" cy="256" r="150" fill="none" stroke="#c0392b" stroke-width="40"
          stroke-dasharray="58.9 58.9"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#1a1a2e" stroke-width="40"
          stroke-dasharray="58.9 58.9" stroke-dashoffset="58.9"/>
  <circle cx="256" cy="256" r="96" fill="#0d0b1e" stroke="#f0c060" stroke-width="8"/>
  <!-- crossbars / spokes -->
  <g stroke="#f0c060" stroke-width="10" stroke-linecap="round">
    <line x1="256" y1="120" x2="256" y2="392"/>
    <line x1="120" y1="256" x2="392" y2="256"/>
  </g>
  <circle cx="256" cy="256" r="26" fill="#f0c060"/>
</svg>
```

- [ ] **Step 2: Write the maskable icon SVG**

Create `client/icon-source/icon-maskable.svg` — same art but scaled to ~80% inside a full-bleed background (safe zone for Android masking). Full `#0d0b1e` background to the edges, no rounded corners:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0d0b1e"/>
  <g transform="translate(256 256) scale(0.78) translate(-256 -256)">
    <circle cx="256" cy="256" r="190" fill="none" stroke="#7b4fc4" stroke-width="14"/>
    <circle cx="256" cy="256" r="172" fill="#1a1a2e"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="#c0392b" stroke-width="40"
            stroke-dasharray="58.9 58.9"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="#1a1a2e" stroke-width="40"
            stroke-dasharray="58.9 58.9" stroke-dashoffset="58.9"/>
    <circle cx="256" cy="256" r="96" fill="#0d0b1e" stroke="#f0c060" stroke-width="8"/>
    <g stroke="#f0c060" stroke-width="10" stroke-linecap="round">
      <line x1="256" y1="120" x2="256" y2="392"/>
      <line x1="120" y1="256" x2="392" y2="256"/>
    </g>
    <circle cx="256" cy="256" r="26" fill="#f0c060"/>
  </g>
</svg>
```

- [ ] **Step 3: Rasterize and resize**

Run from `client/`:

```bash
cd client && mkdir -p public
npx --yes @resvg/resvg-js-cli icon-source/icon.svg public/pwa-512x512.png
npx --yes @resvg/resvg-js-cli icon-source/icon-maskable.svg public/pwa-512x512-maskable.png
cp public/pwa-512x512.png public/pwa-192x192.png && sips -z 192 192 public/pwa-192x192.png
cp public/pwa-512x512.png public/apple-touch-icon-180x180.png && sips -z 180 180 public/apple-touch-icon-180x180.png
```

- [ ] **Step 4: Verify dimensions**

```bash
cd client && for f in pwa-512x512 pwa-512x512-maskable pwa-192x192 apple-touch-icon-180x180; do sips -g pixelWidth -g pixelHeight public/$f.png; done
```

Expected: 512×512, 512×512, 192×192, 180×180 respectively. All four PNG files exist.

- [ ] **Step 5: Commit**

```bash
git add client/icon-source client/public/*.png
git commit -m "feat: add PWA app icons"
```

---

## Task 3: Configure VitePWA in vite.config.ts

**Files:**
- Modify: `client/vite.config.ts`

- [ ] **Step 1: Add the plugin import and registration**

Replace the full contents of `client/vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Ruleta',
        short_name: 'Ruleta',
        description: 'Webová hra evropské rulety — singleplayer i multiplayer.',
        lang: 'cs',
        start_url: '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#0d0b1e',
        theme_color: '#0d0b1e',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@ruleta/shared': resolve(__dirname, '../shared/types.ts'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 2: Verify the build emits manifest + service worker**

```bash
cd client && npm run build && ls dist/manifest.webmanifest dist/sw.js dist/pwa-512x512.png
```

Expected: `npm run build` exits 0 (vue-tsc passes), and `dist/manifest.webmanifest`, `dist/sw.js`, `dist/pwa-512x512.png` all exist.

- [ ] **Step 3: Commit**

```bash
git add client/vite.config.ts
git commit -m "feat: configure vite-plugin-pwa manifest and service worker"
```

---

## Task 4: Add iOS meta tags to index.html

**Files:**
- Modify: `client/index.html`

- [ ] **Step 1: Add theme-color and apple-touch-icon to `<head>`**

In `client/index.html`, replace the `<head>` block:

```html
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0d0b1e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Ruleta" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <title>Ruleta</title>
  </head>
```

- [ ] **Step 2: Verify build still passes**

```bash
cd client && npm run build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add client/index.html
git commit -m "feat: add iOS PWA meta tags and apple-touch-icon"
```

---

## Task 5: Create useInstallPrompt composable (TDD)

**Files:**
- Create: `client/src/composables/useInstallPrompt.ts`
- Create: `client/src/composables/useInstallPrompt.test.ts`

The composable is a factory function (called inside `setup`). It owns refs and registers/cleans up window listeners via `onMounted`/`onUnmounted`. Because tests run outside a component, the test mounts a tiny component to exercise lifecycle hooks.

- [ ] **Step 1: Write the failing tests**

Create `client/src/composables/useInstallPrompt.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useInstallPrompt } from './useInstallPrompt'

// Helper: mount a component that exposes the composable's return value.
function mountComposable() {
  let api: ReturnType<typeof useInstallPrompt> | undefined
  const Cmp = defineComponent({
    setup() {
      api = useInstallPrompt()
      return () => h('div')
    },
  })
  const wrapper = mount(Cmp)
  return { wrapper, api: api! }
}

function fakeBeforeInstallPromptEvent() {
  const userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' })
  return {
    type: 'beforeinstallprompt',
    preventDefault: vi.fn(),
    prompt: vi.fn(() => Promise.resolve()),
    userChoice,
  }
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    // Default: not standalone, not iOS.
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64)',
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('captures beforeinstallprompt and sets canInstall', async () => {
    const { api } = mountComposable()
    expect(api.canInstall.value).toBe(false)
    const evt = fakeBeforeInstallPromptEvent()
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), evt))
    await nextTick()
    expect(evt.preventDefault).toHaveBeenCalled()
    expect(api.canInstall.value).toBe(true)
  })

  it('promptInstall calls prompt() when a deferred event exists', async () => {
    const { api } = mountComposable()
    const evt = fakeBeforeInstallPromptEvent()
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), evt))
    await nextTick()
    await api.promptInstall()
    expect(evt.prompt).toHaveBeenCalled()
    expect(api.canInstall.value).toBe(false) // cleared after use
  })

  it('promptInstall shows iOS hint when no deferred event', async () => {
    const { api } = mountComposable()
    expect(api.showIosHint.value).toBe(false)
    await api.promptInstall()
    expect(api.showIosHint.value).toBe(true)
  })

  it('detects standalone via matchMedia', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { api } = mountComposable()
    expect(api.isStandalone.value).toBe(true)
  })

  it('detects iOS from userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })
    const { api } = mountComposable()
    expect(api.isIOS.value).toBe(true)
  })

  it('showInstallButton: hidden when standalone', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { api } = mountComposable()
    expect(api.showInstallButton.value).toBe(false)
  })

  it('showInstallButton: visible on iOS when not standalone', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })
    const { api } = mountComposable()
    expect(api.showInstallButton.value).toBe(true)
  })
})
```

- [ ] **Step 2: Add the test dependency if missing**

`@vue/test-utils` is used above. Check and install if absent:

```bash
cd client && npm ls @vue/test-utils 2>/dev/null || npm install -D @vue/test-utils
```

Expected: `@vue/test-utils` present in devDependencies.

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd client && npx vitest run src/composables/useInstallPrompt.test.ts
```

Expected: FAIL — `useInstallPrompt` not found / module has no such export.

- [ ] **Step 4: Implement the composable**

Create `client/src/composables/useInstallPrompt.ts`:

```ts
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function useInstallPrompt() {
  const deferred = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const showIosHint = ref(false)

  const isStandalone = ref(
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(display-mode: standalone)').matches) ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
  )

  const isIOS = ref(
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone.value,
  )

  const showInstallButton = computed(
    () => !isStandalone.value && (canInstall.value || isIOS.value),
  )

  function onBeforeInstallPrompt(e: Event) {
    e.preventDefault()
    deferred.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  function onInstalled() {
    deferred.value = null
    canInstall.value = false
  }

  async function promptInstall() {
    if (deferred.value) {
      await deferred.value.prompt()
      try {
        await deferred.value.userChoice
      } finally {
        deferred.value = null
        canInstall.value = false
      }
    } else {
      showIosHint.value = true
    }
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  })

  return {
    canInstall,
    isStandalone,
    isIOS,
    showIosHint,
    showInstallButton,
    promptInstall,
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd client && npx vitest run src/composables/useInstallPrompt.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add client/src/composables/useInstallPrompt.ts client/src/composables/useInstallPrompt.test.ts client/package.json client/package-lock.json
git commit -m "feat: add useInstallPrompt composable with tests"
```

---

## Task 6: Wire button + iOS hint modal into HomeView

**Files:**
- Modify: `client/src/views/HomeView.vue`

> **Shadow check:** `client/src/views/HomeView.vue.js` exists and may shadow the `.vue`. After editing, run Step 4; if the dev server / build doesn't reflect changes, delete `client/src/views/HomeView.vue.js` (it is a stale compiled artifact) and rebuild.

- [ ] **Step 1: Import and call the composable in `<script setup>`**

In `client/src/views/HomeView.vue`, add the import after the existing `useSocketStore` import (line ~91):

```ts
import { useInstallPrompt } from '../composables/useInstallPrompt'
```

And after `const error = ref('')` (line ~100) add:

```ts
const { showInstallButton, showIosHint, promptInstall } = useInstallPrompt()
```

- [ ] **Step 2: Add the install button next to the (i) button**

In the template, immediately after the credits `<button class="info-btn" ...>i</button>` line, add:

```html
    <!-- Install / Add to home screen -->
    <button
      v-if="showInstallButton"
      class="install-btn"
      @click="promptInstall"
    >
      📲 Přidat na plochu
    </button>
```

- [ ] **Step 3: Add the iOS hint modal**

In the template, immediately after the existing credits modal `<Transition>...</Transition>` block (around line 51–`</Transition>`), add a second transition block:

```html
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
```

> Use the same `name="fade"` only if a `fade` transition exists; otherwise reuse whatever transition name wraps the credits modal. Check the credits `<Transition>` block and match its `name`.

- [ ] **Step 4: Add the install button style**

In the `<style scoped>` block, immediately after the `.info-btn:hover {...}` rule (line ~185), add:

```css
.install-btn {
  position: absolute;
  top: 14px;
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
```

> Note: the mute button per project history lives top-left. If `.install-btn` overlaps it, nudge `top`/`left` (e.g. `top: 56px`) to avoid collision — verify visually in Step 5.

- [ ] **Step 5: Verify build and run dev server**

```bash
cd client && npm run build
```

Expected: exits 0 (vue-tsc passes). If the button doesn't appear in `npm run dev`, delete the stale shadow:

```bash
rm -f client/src/views/HomeView.vue.js
```

- [ ] **Step 6: Run the full test suite**

```bash
cd client && npm run test
```

Expected: all tests pass (existing + new `useInstallPrompt` tests).

- [ ] **Step 7: Commit**

```bash
git add client/src/views/HomeView.vue
git commit -m "feat: add 'Přidat na plochu' button and iOS hint modal to home screen"
```

---

## Task 7: Manual verification

- [ ] **Step 1: Build and preview**

```bash
cd client && npm run build && npm run preview
```

- [ ] **Step 2: Verify in browser**

- Open the preview URL in Chrome desktop. DevTools → Application → Manifest: name "Ruleta", icons load, no errors. Application → Service Workers: `sw.js` registered.
- In Chrome, an install icon appears in the address bar (confirms installability). The "📲 Přidat na plochu" button shows on the home screen.
- Toggle device emulation to an iPhone (or check `isIOS` path): button shows and clicking opens the hint modal.
- Run installed/standalone (install the app): button is hidden.

- [ ] **Step 3: Note any visual button-collision fix**

If `.install-btn` overlapped the mute button, confirm the adjusted position looks right.

---

## Self-Review Notes

- **Spec coverage:** vite-plugin-pwa + manifest (Task 3), icons incl. maskable + apple-touch (Task 2/4), composable with canInstall/isStandalone/isIOS/showIosHint/promptInstall (Task 5), smart-visibility button + iOS modal on HomeView (Task 6), unit tests + build verification (Task 5/6/7). All spec sections covered.
- **Type consistency:** composable returns `{ canInstall, isStandalone, isIOS, showIosHint, showInstallButton, promptInstall }` — consumed identically in tests (Task 5) and HomeView (Task 6).
- **No placeholders:** all code blocks complete; icon generation commands verified working (`@resvg/resvg-js-cli` + `sips`) in this environment.
