# PWA — Instalovatelná aplikace + tlačítko „Přidat na plochu"

**Datum:** 2026-06-02
**Stav:** Schváleno k implementaci

## Cíl

Umožnit uživatelům přidat Ruletu na domovskou obrazovku jako plnohodnotnou
instalovatelnou PWA. Na úvodní obrazovku přibude tlačítko „📲 Přidat na plochu".

## Rozhodnutí (z brainstormingu)

- **Rozsah:** Plná instalovatelná PWA — manifest + ikony + service worker (offline cache).
- **Ikona:** Vygenerovaná SVG ikona v barvách hry (fialovo-zlatá).
- **Tlačítko:** Na úvodní obrazovce (HomeView), vedle (i) tlačítka, s emoji 📲.
- **Viditelnost:** Chytrá — skryté ve standalone režimu; na Androidu jen když je
  instalace dostupná, na iOS vždy (ukáže návod).

## Architektura

Čtyři části:

### 1. PWA infrastruktura — `vite-plugin-pwa`

- Přidat dev dependency `vite-plugin-pwa`.
- Nakonfigurovat v `client/vite.config.ts`:
  - `registerType: 'autoUpdate'`
  - manifest:
    - `name: "Ruleta"`, `short_name: "Ruleta"`
    - `display: "standalone"`
    - `theme_color: "#0d0b1e"`, `background_color: "#0d0b1e"`
    - `start_url: "/"`
    - `lang: "cs"`
    - `orientation: "landscape"` (hra je primárně na šířku)
    - `icons`: 192, 512 a maskable 512
  - service worker: precache statických assetů (workbox default) → běh i offline.
- Plugin automaticky vloží manifest link + registraci SW do `index.html`.
- Do `index.html` přidat `<meta name="theme-color">` a `<link rel="apple-touch-icon">`
  (vite-plugin-pwa umí přes `includeAssets` / manifest; apple-touch-icon doplnit ručně,
  protože iOS jej čte z HTML).

### 2. Ikony

- Vytvořit zdrojové SVG: stylizované kolo rulety / žeton.
  - Pozadí `#0d0b1e`, akcent `#f0c060`, doplňkově `#7b4fc4` / `#c0392b`.
- Vygenerovat PNG do `client/public/`:
  - `pwa-192x192.png`
  - `pwa-512x512.png`
  - `pwa-512x512-maskable.png` (s bezpečným okrajem pro maskování)
  - `apple-touch-icon-180x180.png`
- Generování PNG: použít nástroj dostupný v prostředí (ověřit pořadí: `sharp`
  přes npx, `rsvg-convert`, `sips` na macOS). Fallback: `@vite-pwa/assets-generator`.

### 3. Composable `useInstallPrompt`

Soubor: `client/src/composables/useInstallPrompt.ts`

Zapouzdřuje logiku instalace, aby HomeView zůstal čistý. Vystaví:

- `canInstall: Ref<boolean>` — `true` po odchycení `beforeinstallprompt`
  (Android/Chrome). Event se uloží (`deferredPrompt`).
- `isStandalone: Ref<boolean>` — appka už běží jako nainstalovaná:
  `window.matchMedia('(display-mode: standalone)').matches` nebo
  `(navigator as any).standalone === true` (iOS).
- `isIOS: Ref<boolean>` — iOS Safari (nepodporuje `beforeinstallprompt`):
  detekce z `navigator.userAgent` + vyloučení standalone.
- `showIosHint: Ref<boolean>` — řídí návodový modal.
- `promptInstall(): Promise<void>`:
  - Pokud existuje `deferredPrompt` → zavolá `.prompt()`, počká na `userChoice`,
    vyčistí stav.
  - Jinak (iOS / bez podpory) → `showIosHint.value = true`.

Lifecycle: `onMounted` registruje `beforeinstallprompt` a `appinstalled`
listenery; `onUnmounted` je odebere. `appinstalled` resetuje `canInstall`.

**Viditelnost tlačítka** (computed v HomeView nebo v composable):
`showInstallButton = !isStandalone && (canInstall || isIOS)`.

### 4. Tlačítko + modal na HomeView

Soubor: `client/src/views/HomeView.vue`

- Tlačítko „📲 Přidat na plochu" vedle stávajícího (i) tlačítka
  (`.info-btn` pattern). Styl ve shodě s tmavým/zlatým motivem.
- `v-if="showInstallButton"`.
- `@click="promptInstall"`.
- Návodový modal (`v-if="showIosHint"`) ve stejném stylu jako credits modal
  (`.modal-backdrop` / `.modal`): krok za krokem „Klepni na Sdílet (ikona) →
  Přidat na plochu". Zavírání klikem na pozadí, jako u credits.

## Data flow

```
beforeinstallprompt event (Android/Chrome)
  → useInstallPrompt uloží deferredPrompt, canInstall = true
  → HomeView reaktivně zobrazí tlačítko
  → klik → promptInstall()
       ├─ Android: deferredPrompt.prompt() → nativní dialog
       └─ iOS / bez podpory: showIosHint = true → návodový modal
appinstalled event → canInstall = false (tlačítko zmizí)
```

## Edge cases / poznámky

- **HTTPS:** Reálná instalace a SW vyžadují HTTPS. Na `localhost` to funguje pro
  vývoj/test, na produkci je nutné HTTPS.
- **Standalone režim:** Když appka běží nainstalovaná, tlačítko se nezobrazí.
- **`.js` shadowing `.ts`:** V `client/src` se vyskytují stale `.vue.js` / `.js`
  artefakty, které mohou stínit editované zdroje (viz projektová paměť). Po editaci
  ověřit, že se změna projevuje; případně smazat artefakt.

## Testování

- **Unit test** pro `useInstallPrompt` (`client/src/composables/__tests__` nebo
  vedle souboru, dle existující konvence):
  - po dispatchnutí `beforeinstallprompt` se `canInstall` nastaví na `true`
    a default je potlačen (`preventDefault`).
  - `promptInstall()` s deferred promptem volá `prompt()`.
  - `promptInstall()` bez deferred promptu (iOS) nastaví `showIosHint = true`.
  - detekce `isStandalone` přes mock `matchMedia`.
  - detekce `isIOS` přes mock `navigator.userAgent`.
- **Build:** `npm run build` v `client/` musí projít vč. `vue-tsc` (typová kontrola)
  a vygenerovat manifest + SW v `dist/`.

## Mimo rozsah (YAGNI)

- Push notifikace.
- Pokročilá offline cache herních dat / API (hra je real-time přes WS, offline
  herní stav neřešíme).
- Vlastní instalační UI mimo úvodní obrazovku.
