# Ruleta — Design Spec

**Datum:** 2026-06-01
**Status:** schváleno

---

## Přehled

Webová hra rulety pro mobil (na šířku) a desktop. Jeden hráč proti krupiérovi (singleplayer) nebo 2–8 hráčů u jednoho stolu (multiplayer). Cíl: dosáhnout $5 000 od startovního kapitálu $1 000 (singleplayer), nebo být první na $5 000 (multiplayer).

---

## Technologický stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | Vue 3 (Composition API) + Pinia + Vue Router + Vite |
| Backend | Node.js + TypeScript + Express + Socket.IO |
| Struktura | Monorepo (`client/`, `server/`, `shared/`) |
| Kolo | CSS 3D transforms + SVG (37 segmentů) |
| Zvuky | Web Audio API |
| Komunikace | Socket.IO (WebSockets + fallback) |

---

## Struktura projektu

```
ruleta/
├── client/
│   ├── src/
│   │   ├── views/
│   │   │   ├── HomeView.vue
│   │   │   ├── LobbyView.vue
│   │   │   └── GameView.vue
│   │   ├── components/
│   │   │   ├── RouletteWheel.vue      # 3D izometrické kolo + animace
│   │   │   ├── RouletteBall.vue       # kulička (counter-rotation)
│   │   │   ├── BettingPanel.vue       # výběr sázky + výše
│   │   │   ├── PlayerList.vue         # zůstatky hráčů
│   │   │   ├── GameResult.vue         # overlay výsledků kola
│   │   │   └── GameOverModal.vue      # konec hry
│   │   ├── stores/
│   │   │   ├── gameStore.ts           # stav hry, kola, hráčů
│   │   │   └── socketStore.ts         # Socket.IO připojení
│   │   ├── composables/
│   │   │   ├── useSocket.ts
│   │   │   ├── useGame.ts
│   │   │   └── useSound.ts
│   │   └── router/index.ts            # /, /lobby/:code, /game/:code
│   └── vite.config.ts                 # proxy WS → localhost:3001
├── server/
│   ├── src/
│   │   ├── index.ts                   # Express + Socket.IO setup
│   │   ├── GameRoom.ts                # herní logika, fáze kola
│   │   ├── RoomManager.ts             # create/join/list místností
│   │   └── roulette.ts                # pure funkce: spin(), resolveWin()
│   └── package.json
└── shared/
    └── types.ts                       # sdílené typy
```

---

## Sdílené typy (`shared/types.ts`)

```ts
type GamePhase = 'lobby' | 'betting' | 'spinning' | 'result'
type PlayerStatus = 'active' | 'spectator'
type BetType = 'red' | 'black' | 'even' | 'odd' | 'number'

interface Player {
  id: string
  nickname: string
  balance: number
  status: PlayerStatus
  isHost: boolean
}

interface Bet {
  type: BetType
  amount: number
  number?: number  // 0–36, pouze pokud type === 'number'
}

interface GameState {
  code: string
  phase: GamePhase
  players: Player[]
  round: number
  currentBets: Record<string, Bet>
  lastResult?: number  // výsledné číslo posledního spinu
}
```

---

## Obrazovky

### 1. Úvodní obrazovka (`/`)

- Kolo rulety vlevo (3D izometrické, statické, oříznuté ~50 %)
- Menu vpravo:
  - **Singleplayer** → okamžitě do `GameView` (lokální session)
  - **Připojit se ke hře** → pole pro 6-místný kód → `LobbyView`
  - **Založit hru** → server vygeneruje kód → `LobbyView`

### 2. Lobby (`/lobby/:code`)

- Hostitel vidí: kód hry (velký, kopírovatelný), QR kód, seznam hráčů, tlačítko **Spustit hru**
- Host vidí: stejný pohled, tlačítko Spustit skryto
- Při připojení dalšího hráče se seznam aktualizuje real-time

### 3. Herní obrazovka (`/game/:code`)

**Layout (landscape):**
- Levá polovina: `RouletteWheel` + `RouletteBall`
- Pravá polovina: `PlayerList` (nahoře) + `BettingPanel` (dole)

**Fáze kola:**

| Fáze | Popis |
|------|-------|
| `betting` | Odpočet 30 s, hráč volí sázku a potvrdí; po potvrzení všech aktivních hráčů přechod okamžitě |
| `spinning` | Server pošle výsledek, klient animuje kolo ~5 s (rychlá rotace → zpomalení → zastavení na čísle) |
| `result` | Overlay 3 s — výhry/prohry, nové zůstatky |
| → opakovat | Dokud hra neskončí |

**Konec hry:** modální overlay s výhercem (nebo "BANKROT"), žebříčkem, tlačítky *Hrát znovu* / *Domů*.

---

## Sázecí systém

### Typy sázek

| Typ | Výplata | Podmínka výhry |
|-----|---------|----------------|
| Červená (`red`) | 1:1 | výsledek ∈ červená čísla (18 čísel) |
| Černá (`black`) | 1:1 | výsledek ∈ černá čísla (18 čísel) |
| Sudá (`even`) | 1:1 | výsledek ∈ {2,4,...,36} |
| Lichá (`odd`) | 1:1 | výsledek ∈ {1,3,...,35} |
| Číslo (`number`) | 35:1 | výsledek === zadané číslo |

Nula (0) prohrává všechny outside sázky (červená, černá, sudá, lichá).

**Červená čísla:** 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
**Černá čísla:** 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35

### Výše sázky

- Krok: $100 (tlačítka `−` / `+`)
- Minimum: $100
- Maximum: celý zůstatek hráče
- Tlačítko **Vše** (all-in): vždy dostupné, povinně zobrazeno pokud zůstatek < $200

### Startovní kapitál

- Singleplayer: $1 000, cíl $5 000
- Multiplayer: $1 000, cíl $5 000 (první hráč, který dosáhne, vyhrává)

---

## Socket.IO události

### Client → Server

| Událost | Data |
|---------|------|
| `room:create` | `{ nickname: string }` |
| `room:join` | `{ code: string, nickname: string }` |
| `room:start` | `{ code: string }` |
| `game:bet` | `{ type: BetType, amount: number, number?: number }` |

### Server → Client

| Událost | Data |
|---------|------|
| `room:joined` | `{ code: string, players: Player[] }` |
| `room:error` | `{ message: string }` |
| `room:playerJoined` | `{ player: Player }` |
| `game:started` | `{ gameState: GameState }` |
| `game:bettingOpen` | `{ timeLimit: 30 }` |
| `game:playerBet` | `{ playerId: string }` (ostatním — bez částky) |
| `game:spinResult` | `{ number: number, winners: Record<string, number>, newBalances: Record<string, number> }` |
| `game:roundEnd` | `{ gameState: GameState }` |
| `game:over` | `{ winner: Player \| null, leaderboard: Player[] }` |
| `game:playerBankrupt` | `{ playerId: string }` |

**Server jako autorita:** výsledek spinu (`Math.random()`) se generuje výhradně na serveru. Klient nikdy nevypočítává výhry sám.

---

## Animace kola

```css
.wheel-container { perspective: 800px; }
.wheel {
  transform: rotateX(55deg);
  transform-style: preserve-3d;
}
```

- **SVG disk:** 37 segmentů (0–36), barevné dle evropské rulety (červená/černá, 0 zelená)
- **Rotace:** JS animace ve dvou fázích:
  1. Rychlá rotace (~3 s, cubic-bezier rychlý start)
  2. Zpomalení na cílový úhel (~2 s, ease-out)
- **Kulička:** samostatná vrstva s counter-rotací — vizuálně "obíhá" dráhu
- **Čísla na segmentech:** otočena o `rotateX(-55deg)` aby byly čitelná přes perspektivní zkreslení

---

## Vizuální styl

| Prvek | Hodnota |
|-------|---------|
| Pozadí | `#0d0b1e` |
| Kolo rim | `#4a2d8a` + světelný lesk `radial-gradient` |
| Červená čísla | `#c0392b` |
| Černá čísla | `#1a1a2e` |
| Nula | `#27ae60` |
| UI akcenty | `#7b4fc4`, `#4fc3f7` |
| Výhry/peníze | `#f0c060` |

---

## Responsivita

- **Primární:** mobil na šířku (`landscape`)
- **Desktop:** stejný layout, max-width `1400px`, vycentrováno
- **Portrait mobile:** overlay "Otočte zařízení na šířku" (kolo rotace ikonou)

---

## Zvuky

Volitelně vypínatelné (ikona v rohu). Implementace přes `useSound` composable s Web Audio API:

| Zvuk | Trigger |
|------|---------|
| Tikání | během animace kola |
| Zpomalení | poslední 2 s spinu |
| Výhra | spinResult s kladnou výhrou |
| Prohra | spinResult bez výhry |
| Klik | stisk tlačítka |

---

## Rouleta — pravidla

- Typ: **Evropská** (čísla 0–36, jedno nulové pole)
- Výhoda kasina: ~2.7 %
- Nula prohrává: sázky na sudou, lichou

---

## Hraniční případy

| Situace | Chování |
|---------|---------|
| Hráč nestihne vsadit do 30 s | Kolo se točí bez jeho sázky — žádná ztráta, žádná výhra |
| Host se odpojí | Dalšímu hráči (dle pořadí připojení) se přiřadí role hostitele; pokud místnost osiří → zrušena |
| V multiplayeru zbyde 1 aktivní hráč | Okamžitě prohlášen za vítěze (ostatní zkrachovali) |
| Hráč se odpojí během hry | Server drží jeho stav 60 s; hráč může rejoinovat na stejné URL a pokračovat |
| Singleplayer | Také vytváří serverovou místnost (stejný Socket.IO flow jako multiplayer) — sdílí kód a zjednodušuje implementaci |

---

## Co je mimo scope (v1)

- Přihlašování / uživatelské účty
- Statistiky a história her
- Chat v lobby/hře
- Mobilní appka (jen web)
- Tucty, sloupce a ostatní kombinované sázky
