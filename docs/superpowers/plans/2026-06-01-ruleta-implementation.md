# Ruleta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based European roulette game (singleplayer vs house, multiplayer 2–8 players real-time) as a Vue 3 + Vite + Node.js + Socket.IO monorepo.

**Architecture:** `client/` (Vue 3 + Pinia + Vue Router + Vite), `server/` (Node.js + TypeScript + Express + Socket.IO), `shared/` (TypeScript types). All game logic and spin results live server-side. Client connects via Socket.IO and renders state. Singleplayer also creates a server room (same code path as multiplayer).

**Tech Stack:** Vue 3, Pinia, Vue Router, Vite, TypeScript, Express 4, Socket.IO 4, Vitest, qrcode

---

## File Map

```
ruleta/
├── package.json                          # root — npm workspaces + concurrently
├── .gitignore
├── CLAUDE.md                             # already exists
├── shared/
│   ├── package.json
│   └── types.ts                          # CREATE: all shared types
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── index.ts                      # CREATE: Express + Socket.IO entry
│   │   ├── roulette.ts                   # CREATE: spin(), resolveWin(), WHEEL_ORDER
│   │   ├── RoomManager.ts                # CREATE: create/join/remove rooms
│   │   └── GameRoom.ts                   # CREATE: game state machine
│   └── tests/
│       ├── roulette.test.ts              # CREATE: TDD tests
│       ├── RoomManager.test.ts           # CREATE: TDD tests
│       └── GameRoom.test.ts              # CREATE: TDD tests
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts                    # CREATE: proxy + shared alias
    ├── index.html
    └── src/
        ├── main.ts
        ├── App.vue                       # CREATE: router-view + portrait overlay
        ├── router/
        │   └── index.ts                  # CREATE: /, /lobby/:code, /game/:code
        ├── stores/
        │   ├── socketStore.ts            # CREATE: Socket.IO connection + events
        │   └── gameStore.ts              # CREATE: reactive game state
        ├── composables/
        │   ├── useGame.ts                # CREATE: action helpers
        │   └── useSound.ts              # CREATE: Web Audio API
        ├── assets/
        │   └── main.css                  # CREATE: global CSS vars + reset
        ├── views/
        │   ├── HomeView.vue              # CREATE: split layout, 3 menu buttons
        │   ├── LobbyView.vue             # CREATE: code, QR, player list, start
        │   └── GameView.vue              # CREATE: split layout, full game loop
        └── components/
            ├── RouletteWheel.vue         # CREATE: SVG 37-segment wheel + 3D CSS
            ├── BettingPanel.vue          # CREATE: 5 bet types + amount controls
            ├── PlayerList.vue            # CREATE: balances + status
            ├── GameResult.vue            # CREATE: 3s result overlay
            └── GameOverModal.vue         # CREATE: end screen + leaderboard
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `shared/package.json`
- Create: `shared/types.ts` (empty placeholder)
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "ruleta",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "dev": "concurrently -n server,client -c cyan,green \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm -w server run dev",
    "dev:client": "npm -w client run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.superpowers/
*.local
```

- [ ] **Step 3: Create shared/package.json**

```json
{
  "name": "@ruleta/shared",
  "version": "1.0.0",
  "main": "types.ts",
  "types": "types.ts"
}
```

- [ ] **Step 4: Create shared/types.ts (placeholder)**

```ts
export type GamePhase = 'lobby' | 'betting' | 'spinning' | 'result'
export type PlayerStatus = 'active' | 'spectator'
export type BetType = 'red' | 'black' | 'even' | 'odd' | 'number'

export interface Player {
  id: string
  nickname: string
  balance: number
  status: PlayerStatus
  isHost: boolean
}

export interface Bet {
  type: BetType
  amount: number
  number?: number
}

export interface GameState {
  code: string
  phase: GamePhase
  players: Player[]
  round: number
  currentBets: Record<string, Bet>
  lastResult?: number
  isSingleplayer: boolean
}
```

- [ ] **Step 5: Create server/package.json**

```json
{
  "name": "@ruleta/server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "@ruleta/shared": "*",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.5",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3",
    "vitest": "^1.3.1"
  }
}
```

- [ ] **Step 6: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "skipLibCheck": true,
    "paths": {
      "@ruleta/shared": ["../shared/types.ts"]
    }
  },
  "include": ["src/**/*", "tests/**/*", "../shared/types.ts"]
}
```

- [ ] **Step 7: Create server/vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@ruleta/shared': new URL('../shared/types.ts', import.meta.url).pathname,
    },
  },
})
```

- [ ] **Step 8: Create client/package.json**

```json
{
  "name": "@ruleta/client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@ruleta/shared": "*",
    "pinia": "^2.1.7",
    "qrcode": "^1.5.3",
    "socket.io-client": "^4.7.4",
    "vue": "^3.4.19",
    "vue-router": "^4.3.0"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@vitejs/plugin-vue": "^5.0.4",
    "typescript": "^5.3.3",
    "vite": "^5.1.4",
    "vitest": "^1.3.1",
    "vue-tsc": "^2.0.6"
  }
}
```

- [ ] **Step 9: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "lib": ["ESNext", "DOM"],
    "skipLibCheck": true,
    "paths": {
      "@ruleta/shared": ["../shared/types.ts"]
    }
  },
  "include": ["src/**/*", "../shared/types.ts"]
}
```

- [ ] **Step 10: Create client/vite.config.ts**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@ruleta/shared': resolve(__dirname, '../shared/types.ts'),
    },
  },
  server: {
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

- [ ] **Step 11: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ruleta</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 12: Install dependencies**

```bash
npm install
```

Expected: workspaces linked, node_modules created in root and each package.

- [ ] **Step 13: Commit**

```bash
git init
git add .
git commit -m "feat: monorepo scaffold — Vue 3 + Vite + Node.js + Socket.IO"
```

---

## Task 2: Server — Roulette Pure Logic (TDD)

**Files:**
- Create: `server/tests/roulette.test.ts`
- Create: `server/src/roulette.ts`

- [ ] **Step 1: Write failing tests**

```ts
// server/tests/roulette.test.ts
import { describe, it, expect } from 'vitest'
import { spin, resolveWin, RED_NUMBERS, BLACK_NUMBERS, WHEEL_ORDER } from '../src/roulette'

describe('WHEEL_ORDER', () => {
  it('contains exactly 37 unique numbers 0-36', () => {
    expect(WHEEL_ORDER).toHaveLength(37)
    expect(new Set(WHEEL_ORDER).size).toBe(37)
    expect(Math.min(...WHEEL_ORDER)).toBe(0)
    expect(Math.max(...WHEEL_ORDER)).toBe(36)
  })
  it('starts with 0', () => {
    expect(WHEEL_ORDER[0]).toBe(0)
  })
})

describe('RED_NUMBERS + BLACK_NUMBERS', () => {
  it('each has 18 numbers', () => {
    expect(RED_NUMBERS.size).toBe(18)
    expect(BLACK_NUMBERS.size).toBe(18)
  })
  it('no overlap between red and black', () => {
    for (const n of RED_NUMBERS) expect(BLACK_NUMBERS.has(n)).toBe(false)
  })
  it('together with 0 cover all 37 numbers', () => {
    const all = new Set([0, ...RED_NUMBERS, ...BLACK_NUMBERS])
    expect(all.size).toBe(37)
  })
})

describe('spin', () => {
  it('returns integer 0-36', () => {
    for (let i = 0; i < 200; i++) {
      const n = spin()
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(36)
    }
  })
})

describe('resolveWin', () => {
  it('red bet on red number pays 1:1', () => {
    expect(resolveWin('red', undefined, 1, 100)).toBe(100)
    expect(resolveWin('red', undefined, 32, 200)).toBe(200)
  })
  it('red bet on black number pays 0', () => {
    expect(resolveWin('red', undefined, 2, 100)).toBe(0)
  })
  it('red bet on 0 pays 0', () => {
    expect(resolveWin('red', undefined, 0, 100)).toBe(0)
  })
  it('black bet on black number pays 1:1', () => {
    expect(resolveWin('black', undefined, 2, 100)).toBe(100)
  })
  it('black bet on red number pays 0', () => {
    expect(resolveWin('black', undefined, 1, 100)).toBe(0)
  })
  it('even bet on even number pays 1:1', () => {
    expect(resolveWin('even', undefined, 4, 100)).toBe(100)
  })
  it('even bet on 0 pays 0', () => {
    expect(resolveWin('even', undefined, 0, 100)).toBe(0)
  })
  it('even bet on odd number pays 0', () => {
    expect(resolveWin('even', undefined, 3, 100)).toBe(0)
  })
  it('odd bet on odd number pays 1:1', () => {
    expect(resolveWin('odd', undefined, 3, 100)).toBe(100)
  })
  it('odd bet on 0 pays 0', () => {
    expect(resolveWin('odd', undefined, 0, 100)).toBe(0)
  })
  it('number bet on exact match pays 35:1', () => {
    expect(resolveWin('number', 7, 7, 100)).toBe(3500)
  })
  it('number bet on wrong number pays 0', () => {
    expect(resolveWin('number', 7, 8, 100)).toBe(0)
  })
  it('number bet on 0 pays 35:1', () => {
    expect(resolveWin('number', 0, 0, 100)).toBe(3500)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
cd server && npm test
```

Expected: FAIL — `Cannot find module '../src/roulette'`

- [ ] **Step 3: Implement roulette.ts**

```ts
// server/src/roulette.ts
import type { BetType } from '@ruleta/shared'

// European roulette wheel order (clockwise from 0)
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
])

export function spin(): number {
  return Math.floor(Math.random() * 37)
}

export function resolveWin(
  type: BetType,
  betNumber: number | undefined,
  result: number,
  amount: number,
): number {
  switch (type) {
    case 'red':    return RED_NUMBERS.has(result) ? amount : 0
    case 'black':  return BLACK_NUMBERS.has(result) ? amount : 0
    case 'even':   return result !== 0 && result % 2 === 0 ? amount : 0
    case 'odd':    return result % 2 === 1 ? amount : 0
    case 'number': return result === betNumber ? amount * 35 : 0
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd server && npm test
```

Expected: all 17 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add server/src/roulette.ts server/tests/roulette.test.ts
git commit -m "feat: roulette pure logic — spin, resolveWin, wheel order (TDD)"
```

---

## Task 3: Server — RoomManager (TDD)

**Files:**
- Create: `server/tests/RoomManager.test.ts`
- Create: `server/src/RoomManager.ts`
- Create: `server/src/GameRoom.ts` (minimal stub for these tests)

- [ ] **Step 1: Write failing tests**

```ts
// server/tests/RoomManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { RoomManager } from '../src/RoomManager'

let manager: RoomManager

beforeEach(() => { manager = new RoomManager() })

describe('create', () => {
  it('returns a room with a 6-character code', () => {
    const room = manager.create('p1', 'Alice', false)
    expect(room.code).toHaveLength(6)
    expect(room.code).toMatch(/^[A-Z0-9]+$/)
  })
  it('codes are unique', () => {
    const codes = new Set(Array.from({ length: 50 }, () => manager.create(`p${Math.random()}`, 'X', false).code))
    expect(codes.size).toBe(50)
  })
  it('creates room retrievable by get()', () => {
    const room = manager.create('p1', 'Alice', false)
    expect(manager.get(room.code)).toBe(room)
  })
})

describe('get', () => {
  it('returns undefined for unknown code', () => {
    expect(manager.get('XXXXXX')).toBeUndefined()
  })
  it('is case-insensitive', () => {
    const room = manager.create('p1', 'Alice', false)
    expect(manager.get(room.code.toLowerCase())).toBe(room)
  })
})

describe('join', () => {
  it('adds a player to an existing room', () => {
    const room = manager.create('p1', 'Alice', false)
    const joined = manager.join(room.code, 'p2', 'Bob')
    expect(joined).toBe(room)
    expect(room.getPlayers()).toHaveLength(2)
  })
  it('throws for unknown code', () => {
    expect(() => manager.join('XXXXXX', 'p2', 'Bob')).toThrow('Místnost neexistuje')
  })
})

describe('remove', () => {
  it('removes a room', () => {
    const room = manager.create('p1', 'Alice', false)
    manager.remove(room.code)
    expect(manager.get(room.code)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd server && npm test tests/RoomManager.test.ts
```

Expected: FAIL — `Cannot find module '../src/RoomManager'`

- [ ] **Step 3: Create GameRoom minimal stub** (needed by RoomManager, full implementation in next task)

```ts
// server/src/GameRoom.ts
import type { Player, GameState, GamePhase, Bet } from '@ruleta/shared'

const START_BALANCE = 1000

export class GameRoom {
  private players = new Map<string, Player>()
  private _phase: GamePhase = 'lobby'
  round = 0
  lastResult?: number
  isSingleplayer: boolean
  private bets = new Map<string, Bet>()
  onAllBetsPlaced?: () => void

  constructor(
    public readonly code: string,
    hostId: string,
    hostNickname: string,
    isSingleplayer: boolean,
  ) {
    this.isSingleplayer = isSingleplayer
    this.players.set(hostId, {
      id: hostId,
      nickname: hostNickname,
      balance: START_BALANCE,
      status: 'active',
      isHost: true,
    })
  }

  getPlayers(): Player[] {
    return [...this.players.values()]
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id)
  }

  get phase(): GamePhase { return this._phase }
  setPhase(p: GamePhase): void { this._phase = p }

  addPlayer(id: string, nickname: string): Player {
    if (this.players.size >= 8) throw new Error('Místnost je plná')
    if (this._phase !== 'lobby') throw new Error('Hra již probíhá')
    const player: Player = { id, nickname, balance: START_BALANCE, status: 'active', isHost: false }
    this.players.set(id, player)
    return player
  }

  removePlayer(id: string): { newHostId?: string; shouldClose: boolean } {
    const player = this.players.get(id)
    if (!player) return { shouldClose: false }
    this.players.delete(id)
    this.bets.delete(id)
    if (this.players.size === 0) return { shouldClose: true }
    if (player.isHost) {
      const next = this.players.values().next().value!
      next.isHost = true
      return { newHostId: next.id, shouldClose: false }
    }
    return { shouldClose: false }
  }

  clearBets(): void { this.bets.clear() }

  placeBet(playerId: string, bet: Bet): void {
    const player = this.players.get(playerId)
    if (!player || player.status !== 'active') throw new Error('Hráč nenalezen nebo není aktivní')
    if (this._phase !== 'betting') throw new Error('Sázení není otevřeno')
    if (bet.amount < 100 || bet.amount > player.balance) throw new Error('Neplatná částka')
    if (bet.amount % 100 !== 0) throw new Error('Částka musí být násobek 100')
    if (bet.type === 'number' && (bet.number === undefined || bet.number < 0 || bet.number > 36)) {
      throw new Error('Neplatné číslo')
    }
    this.bets.set(playerId, bet)
    if (this.allActiveBetsPlaced()) this.onAllBetsPlaced?.()
  }

  allActiveBetsPlaced(): boolean {
    return this.getPlayers()
      .filter(p => p.status === 'active')
      .every(p => this.bets.has(p.id))
  }

  executeRound(spinResult: number): {
    result: number
    winners: Record<string, number>
    newBalances: Record<string, number>
  } {
    // Import lazily to avoid circular at test time; callers pass spinResult
    const { resolveWin } = require('./roulette') as typeof import('./roulette')
    this._phase = 'spinning'
    this.lastResult = spinResult
    const winners: Record<string, number> = {}
    const newBalances: Record<string, number> = {}

    for (const [id, player] of this.players) {
      if (player.status !== 'active') continue
      const bet = this.bets.get(id)
      if (bet) {
        const profit = resolveWin(bet.type, bet.number, spinResult, bet.amount)
        player.balance += profit > 0 ? profit : -bet.amount
        winners[id] = profit
      }
      if (player.balance <= 0) {
        player.balance = 0
        player.status = 'spectator'
      }
      newBalances[id] = player.balance
    }
    this._phase = 'result'
    this.round++
    return { result: spinResult, winners, newBalances }
  }

  checkGameOver(): Player | null {
    const winner = this.getPlayers().find(p => p.balance >= 5000)
    return winner ?? null
  }

  onlyOneActivePlayer(): Player | null {
    const active = this.getPlayers().filter(p => p.status === 'active')
    return active.length === 1 ? active[0] : null
  }

  getLeaderboard(): Player[] {
    return [...this.players.values()].sort((a, b) => b.balance - a.balance)
  }

  getState(): GameState {
    return {
      code: this.code,
      phase: this._phase,
      players: this.getPlayers(),
      round: this.round,
      currentBets: Object.fromEntries(this.bets),
      lastResult: this.lastResult,
      isSingleplayer: this.isSingleplayer,
    }
  }
}
```

- [ ] **Step 4: Create RoomManager.ts**

```ts
// server/src/RoomManager.ts
import { GameRoom } from './GameRoom.js'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export class RoomManager {
  private rooms = new Map<string, GameRoom>()

  create(hostId: string, nickname: string, isSingleplayer: boolean): GameRoom {
    const code = this.generateCode()
    const room = new GameRoom(code, hostId, nickname, isSingleplayer)
    this.rooms.set(code, room)
    return room
  }

  get(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase())
  }

  join(code: string, playerId: string, nickname: string): GameRoom {
    const room = this.get(code)
    if (!room) throw new Error('Místnost neexistuje')
    room.addPlayer(playerId, nickname)
    return room
  }

  remove(code: string): void {
    this.rooms.delete(code.toUpperCase())
  }

  private generateCode(): string {
    let code: string
    do {
      code = Array.from(
        { length: 6 },
        () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
      ).join('')
    } while (this.rooms.has(code))
    return code
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd server && npm test tests/RoomManager.test.ts
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
cd ..
git add server/src/GameRoom.ts server/src/RoomManager.ts server/tests/RoomManager.test.ts
git commit -m "feat: GameRoom + RoomManager — room lifecycle (TDD)"
```

---

## Task 4: Server — GameRoom Logic (TDD)

**Files:**
- Create: `server/tests/GameRoom.test.ts`
- Modify: `server/src/GameRoom.ts` (already created — verify all methods work)

- [ ] **Step 1: Write failing tests**

```ts
// server/tests/GameRoom.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { GameRoom } from '../src/GameRoom'

let room: GameRoom

beforeEach(() => {
  room = new GameRoom('TEST01', 'host1', 'Alice', false)
})

describe('constructor', () => {
  it('host is added with START_BALANCE $1000', () => {
    const players = room.getPlayers()
    expect(players).toHaveLength(1)
    expect(players[0]).toMatchObject({ id: 'host1', nickname: 'Alice', balance: 1000, isHost: true, status: 'active' })
  })
  it('phase is lobby', () => {
    expect(room.phase).toBe('lobby')
  })
})

describe('addPlayer', () => {
  it('adds up to 8 players total', () => {
    for (let i = 2; i <= 8; i++) room.addPlayer(`p${i}`, `Player${i}`)
    expect(room.getPlayers()).toHaveLength(8)
  })
  it('throws when room is full', () => {
    for (let i = 2; i <= 8; i++) room.addPlayer(`p${i}`, `Player${i}`)
    expect(() => room.addPlayer('p9', 'Extra')).toThrow('Místnost je plná')
  })
  it('throws when game is in progress', () => {
    room.setPhase('betting')
    expect(() => room.addPlayer('p2', 'Bob')).toThrow('Hra již probíhá')
  })
})

describe('removePlayer', () => {
  it('returns shouldClose=true when last player leaves', () => {
    expect(room.removePlayer('host1')).toEqual({ shouldClose: true })
  })
  it('transfers host to next player', () => {
    room.addPlayer('p2', 'Bob')
    const result = room.removePlayer('host1')
    expect(result.newHostId).toBe('p2')
    expect(room.getPlayer('p2')?.isHost).toBe(true)
  })
  it('returns shouldClose=false for non-host', () => {
    room.addPlayer('p2', 'Bob')
    expect(room.removePlayer('p2')).toEqual({ shouldClose: false })
  })
})

describe('placeBet', () => {
  beforeEach(() => room.setPhase('betting'))

  it('accepts valid even bet', () => {
    room.placeBet('host1', { type: 'even', amount: 100 })
    expect(room.allActiveBetsPlaced()).toBe(true)
  })
  it('accepts valid number bet', () => {
    room.placeBet('host1', { type: 'number', amount: 200, number: 17 })
    expect(room.allActiveBetsPlaced()).toBe(true)
  })
  it('throws for amount not multiple of 100', () => {
    expect(() => room.placeBet('host1', { type: 'even', amount: 150 })).toThrow('násobek 100')
  })
  it('throws for amount exceeding balance', () => {
    expect(() => room.placeBet('host1', { type: 'even', amount: 1100 })).toThrow('Neplatná částka')
  })
  it('throws when not in betting phase', () => {
    room.setPhase('spinning')
    expect(() => room.placeBet('host1', { type: 'even', amount: 100 })).toThrow('Sázení není otevřeno')
  })
  it('throws for invalid number (out of 0-36)', () => {
    expect(() => room.placeBet('host1', { type: 'number', amount: 100, number: 37 })).toThrow('Neplatné číslo')
  })
  it('calls onAllBetsPlaced when all active players bet', () => {
    let called = false
    room.onAllBetsPlaced = () => { called = true }
    room.placeBet('host1', { type: 'odd', amount: 100 })
    expect(called).toBe(true)
  })
})

describe('executeRound', () => {
  beforeEach(() => {
    room.setPhase('betting')
    room.placeBet('host1', { type: 'red', amount: 300 })
  })

  it('returns correct result number', () => {
    const { result } = room.executeRound(1) // 1 is red
    expect(result).toBe(1)
  })
  it('pays 1:1 for red win (profit = amount)', () => {
    const { winners } = room.executeRound(1) // 1 is red → win
    expect(winners['host1']).toBe(300)
  })
  it('balance increases by profit on win', () => {
    room.executeRound(1) // red win
    expect(room.getPlayer('host1')?.balance).toBe(1000 + 300)
  })
  it('balance decreases by bet on loss', () => {
    room.executeRound(2) // 2 is black → red bet loses
    expect(room.getPlayer('host1')?.balance).toBe(1000 - 300)
  })
  it('pays 35:1 for number bet win', () => {
    room.clearBets()
    room.placeBet('host1', { type: 'number', amount: 100, number: 7 })
    const { winners } = room.executeRound(7)
    expect(winners['host1']).toBe(3500)
    expect(room.getPlayer('host1')?.balance).toBe(1000 + 3500)
  })
  it('sets player to spectator on bankruptcy', () => {
    room.clearBets()
    room.placeBet('host1', { type: 'even', amount: 1000 })
    room.executeRound(1) // 1 is odd → lose all
    expect(room.getPlayer('host1')?.status).toBe('spectator')
    expect(room.getPlayer('host1')?.balance).toBe(0)
  })
  it('increments round counter', () => {
    expect(room.round).toBe(0)
    room.executeRound(0)
    expect(room.round).toBe(1)
  })
})

describe('checkGameOver', () => {
  it('returns null when no player has reached $5000', () => {
    expect(room.checkGameOver()).toBeNull()
  })
  it('returns winner when balance >= 5000', () => {
    room.getPlayer('host1')!.balance = 5000
    expect(room.checkGameOver()?.id).toBe('host1')
  })
})

describe('onlyOneActivePlayer', () => {
  it('returns null with 1 active player (no comparison possible)', () => {
    // Single player = no "only one remaining" scenario with 1 total player
    // Needs 2+ total players, 1 active
    expect(room.onlyOneActivePlayer()).toBeNull() // still needs 2+ total for this to trigger
  })
  it('returns the player when 2 started and 1 went bankrupt', () => {
    room.addPlayer('p2', 'Bob')
    room.getPlayer('p2')!.status = 'spectator'
    expect(room.onlyOneActivePlayer()?.id).toBe('host1')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL (missing require in executeRound)**

```bash
cd server && npm test tests/GameRoom.test.ts
```

Expected: some tests FAIL because `executeRound` uses `require('./roulette')` which doesn't work in ESM. Fix by using a direct import:

- [ ] **Step 3: Fix GameRoom.ts to use ESM import for roulette**

Replace the `executeRound` method's `require` call — instead, import at top of file:

```ts
// Add at top of server/src/GameRoom.ts (after existing imports):
import { resolveWin, spin as _spin } from './roulette.js'
```

And update `executeRound` to remove the `require`:

```ts
executeRound(spinResult: number): {
  result: number
  winners: Record<string, number>
  newBalances: Record<string, number>
} {
  this._phase = 'spinning'
  this.lastResult = spinResult
  const winners: Record<string, number> = {}
  const newBalances: Record<string, number> = {}

  for (const [id, player] of this.players) {
    if (player.status !== 'active') continue
    const bet = this.bets.get(id)
    if (bet) {
      const profit = resolveWin(bet.type, bet.number, spinResult, bet.amount)
      player.balance += profit > 0 ? profit : -bet.amount
      winners[id] = profit
    }
    if (player.balance <= 0) {
      player.balance = 0
      player.status = 'spectator'
    }
    newBalances[id] = player.balance
  }
  this._phase = 'result'
  this.round++
  return { result: spinResult, winners, newBalances }
}
```

- [ ] **Step 4: Run all server tests — expect PASS**

```bash
cd server && npm test
```

Expected: all tests across roulette, RoomManager, GameRoom PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add server/src/GameRoom.ts server/tests/GameRoom.test.ts
git commit -m "feat: GameRoom game logic — betting, round execution, bankruptcy (TDD)"
```

---

## Task 5: Server — Socket.IO Entry Point

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server/src/index.ts**

```ts
// server/src/index.ts
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { RoomManager } from './RoomManager.js'
import { spin } from './roulette.js'

const PORT = 3001
const SPIN_DURATION_MS = 5500  // animation + buffer
const RESULT_DURATION_MS = 3000

const app = express()
app.use(cors())
app.get('/health', (_req, res) => res.json({ ok: true }))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const rooms = new RoomManager()

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runGameLoop(code: string): Promise<void> {
  const room = rooms.get(code)
  if (!room) return

  while (true) {
    room.setPhase('betting')
    room.clearBets()
    io.to(code).emit('game:bettingOpen', { timeLimit: 30 })

    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 30_000)
      room.onAllBetsPlaced = () => {
        clearTimeout(timer)
        resolve()
      }
    })

    const result = spin()
    const { winners, newBalances } = room.executeRound(result)

    io.to(code).emit('game:spinResult', { number: result, winners, newBalances })

    // Notify bankruptcies
    for (const player of room.getPlayers()) {
      if (player.status === 'spectator' && newBalances[player.id] === 0) {
        io.to(code).emit('game:playerBankrupt', { playerId: player.id })
      }
    }

    await delay(SPIN_DURATION_MS)

    // Check end conditions
    const winner = room.checkGameOver()
    const soloWinner = !winner && room.getPlayers().length > 1 ? room.onlyOneActivePlayer() : null

    if (winner || soloWinner) {
      io.to(code).emit('game:over', {
        winner: winner ?? soloWinner,
        leaderboard: room.getLeaderboard(),
      })
      rooms.remove(code)
      return
    }

    io.to(code).emit('game:roundEnd', { gameState: room.getState() })
    await delay(RESULT_DURATION_MS)
  }
}

io.on('connection', socket => {
  console.log('connected:', socket.id)

  socket.on('room:create', ({ nickname, isSingleplayer = false }: { nickname: string; isSingleplayer?: boolean }) => {
    try {
      const room = rooms.create(socket.id, nickname, isSingleplayer)
      socket.join(room.code)
      socket.emit('room:joined', { code: room.code, players: room.getPlayers(), isSingleplayer })
    } catch (e: unknown) {
      socket.emit('room:error', { message: (e as Error).message })
    }
  })

  socket.on('room:join', ({ code, nickname }: { code: string; nickname: string }) => {
    try {
      const room = rooms.join(code, socket.id, nickname)
      socket.join(room.code)
      socket.emit('room:joined', { code: room.code, players: room.getPlayers(), isSingleplayer: room.isSingleplayer })
      socket.to(room.code).emit('room:playerJoined', { player: room.getPlayer(socket.id) })
    } catch (e: unknown) {
      socket.emit('room:error', { message: (e as Error).message })
    }
  })

  socket.on('room:start', ({ code }: { code: string }) => {
    const room = rooms.get(code)
    if (!room) return
    const player = room.getPlayer(socket.id)
    if (!player?.isHost) return
    io.to(code).emit('game:started', { gameState: room.getState() })
    runGameLoop(code)
  })

  socket.on('game:bet', ({ type, amount, number }: { type: string; amount: number; number?: number }) => {
    // Find which room this socket is in
    const code = [...socket.rooms].find(r => r !== socket.id)
    if (!code) return
    const room = rooms.get(code)
    if (!room) return
    try {
      room.placeBet(socket.id, { type: type as any, amount, number })
      socket.to(code).emit('game:playerBet', { playerId: socket.id })
    } catch (e: unknown) {
      socket.emit('room:error', { message: (e as Error).message })
    }
  })

  socket.on('disconnecting', () => {
    for (const code of socket.rooms) {
      if (code === socket.id) continue
      const room = rooms.get(code)
      if (!room) continue
      const { newHostId, shouldClose } = room.removePlayer(socket.id)
      if (shouldClose) {
        rooms.remove(code)
      } else {
        if (newHostId) {
          io.to(code).emit('room:newHost', { playerId: newHostId })
        }
        io.to(code).emit('room:playerLeft', {
          playerId: socket.id,
          players: room.getPlayers(),
        })
        if (room.phase === 'betting' && room.allActiveBetsPlaced()) {
          room.onAllBetsPlaced?.()
        }
      }
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

- [ ] **Step 2: Start the server and verify it responds**

```bash
cd server && npm run dev
```

Expected: `Server running on http://localhost:3001`

In another terminal:
```bash
curl http://localhost:3001/health
```
Expected: `{"ok":true}`

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: Socket.IO server — room lifecycle, game loop, all events"
```

---

## Task 6: Client — Global Shell

**Files:**
- Create: `client/src/main.ts`
- Create: `client/src/App.vue`
- Create: `client/src/router/index.ts`
- Create: `client/src/assets/main.css`
- Create: `client/src/views/HomeView.vue` (placeholder)
- Create: `client/src/views/LobbyView.vue` (placeholder)
- Create: `client/src/views/GameView.vue` (placeholder)

- [ ] **Step 1: Create client/src/assets/main.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0d0b1e;
  --bg2: #120d30;
  --accent: #7b4fc4;
  --accent2: #4fc3f7;
  --gold: #f0c060;
  --red: #c0392b;
  --black-num: #1a1a2e;
  --green-zero: #27ae60;
  --text: #e8e0ff;
  --text-muted: #8877aa;
  --rim: #4a2d8a;
}

html, body, #app {
  width: 100%;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  overflow: hidden;
}

button {
  cursor: pointer;
  border: none;
  font-family: inherit;
  font-size: 1rem;
  border-radius: 8px;
  padding: 0.6em 1.4em;
  transition: opacity 0.15s, transform 0.1s;
}
button:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
button:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-primary {
  background: linear-gradient(135deg, var(--accent), #9b55f4);
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.btn-secondary {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent2);
}

input[type="text"] {
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 6px;
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  padding: 0.5em 0.8em;
  outline: none;
  width: 100%;
}
input[type="text"]:focus { border-color: var(--accent2); }
```

- [ ] **Step 2: Create client/src/router/index.ts**

```ts
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/lobby/:code', component: () => import('../views/LobbyView.vue') },
    { path: '/game/:code', component: () => import('../views/GameView.vue') },
  ],
})

export default router
```

- [ ] **Step 3: Create client/src/main.ts**

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 4: Create client/src/App.vue**

```vue
<template>
  <div class="app">
    <router-view />
    <!-- Portrait mode warning -->
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
.app { width: 100vw; height: 100vh; position: relative; }

.portrait-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.portrait-message {
  text-align: center;
  color: var(--text-muted);
}
.rotate-icon {
  font-size: 4rem;
  animation: rotate 2s linear infinite;
  display: block;
  margin-bottom: 1rem;
}
@keyframes rotate { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 5: Create placeholder views**

`client/src/views/HomeView.vue`:
```vue
<template><div style="color:white;padding:2rem">Home — TODO</div></template>
```

`client/src/views/LobbyView.vue`:
```vue
<template><div style="color:white;padding:2rem">Lobby — TODO</div></template>
```

`client/src/views/GameView.vue`:
```vue
<template><div style="color:white;padding:2rem">Game — TODO</div></template>
```

- [ ] **Step 6: Start client dev server and verify routing works**

```bash
cd client && npm run dev
```

Open http://localhost:5173 — should show "Home — TODO" on white background.
Open http://localhost:5173/#/lobby/TEST01 — should show "Lobby — TODO".

- [ ] **Step 7: Commit**

```bash
cd ..
git add client/
git commit -m "feat: client shell — Vue Router, global CSS, portrait overlay"
```

---

## Task 7: Client — RouletteWheel Component

**Files:**
- Create: `client/src/components/RouletteWheel.vue`

- [ ] **Step 1: Create RouletteWheel.vue**

The wheel is an SVG with 37 pie segments in European order, wrapped in a CSS 3D perspective container.

```vue
<template>
  <div class="wheel-scene" :class="{ static: props.static }">
    <div class="wheel-tilt">
      <!-- Outer rim -->
      <div class="wheel-rim">
        <div
          class="wheel-disc"
          :style="discStyle"
          @transitionend="onTransitionEnd"
        >
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <!-- Segments -->
            <g v-for="seg in segments" :key="seg.num">
              <path :d="seg.path" :fill="seg.color" stroke="#2a1a5a" stroke-width="1" />
              <text
                :x="seg.labelX"
                :y="seg.labelY"
                text-anchor="middle"
                dominant-baseline="central"
                fill="white"
                font-size="12"
                font-weight="bold"
                :transform="`rotate(${seg.labelAngle}, ${seg.labelX}, ${seg.labelY})`"
              >{{ seg.num }}</text>
            </g>
            <!-- Center hub -->
            <circle cx="200" cy="200" r="30" fill="#3a2570" stroke="#6b4fc4" stroke-width="3" />
            <circle cx="200" cy="200" r="18" fill="#5a3a90" stroke="#8b6fd4" stroke-width="2" />
            <!-- Spokes -->
            <line v-for="a in [0,60,120,180,240,300]" :key="a"
              :x1="200 + 18 * Math.cos((a-90)*Math.PI/180)"
              :y1="200 + 18 * Math.sin((a-90)*Math.PI/180)"
              :x2="200 + 28 * Math.cos((a-90)*Math.PI/180)"
              :y2="200 + 28 * Math.sin((a-90)*Math.PI/180)"
              stroke="#8b6fd4" stroke-width="2"
            />
          </svg>
        </div>
        <!-- Ball layer (counter-rotates) -->
        <div
          v-if="!props.static"
          class="ball-track"
          :style="ballStyle"
        >
          <div class="ball" />
        </div>
      </div>
    </div>
    <!-- Marker (top pointer) -->
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

// Current cumulative rotation (persisted between spins)
const currentRotation = ref(0)
const isAnimating = ref(false)

const discStyle = ref<Record<string, string>>({})
const ballStyle = ref<Record<string, string>>({})

watch(() => props.spinning, (spinning) => {
  if (!spinning || props.targetNumber === undefined || isAnimating.value) return
  isAnimating.value = true

  const targetIdx = WHEEL_ORDER.indexOf(props.targetNumber)
  const targetCenter = (targetIdx + 0.5) * SEG_ANGLE
  // Wheel rotates so targetCenter lands at 0° (marker at top).
  // We add 8 full rotations for dramatic effect.
  const additionalRotation = ((360 - targetCenter) % 360) + 360 * 8
  const finalRotation = currentRotation.value + additionalRotation

  discStyle.value = {
    transform: `rotate(${finalRotation}deg)`,
    transition: 'transform 5s cubic-bezier(0.2, 0.8, 0.3, 1)',
  }
  // Ball counter-rotates at ~1.4× speed
  ballStyle.value = {
    transform: `rotate(${-finalRotation * 1.35}deg)`,
    transition: 'transform 5s cubic-bezier(0.5, 0, 0.6, 1)',
  }

  currentRotation.value = finalRotation % 360
})

function onTransitionEnd() {
  if (!isAnimating.value) return
  isAnimating.value = false
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
  width: min(55vw, 95vh);
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
}

.wheel-disc {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.wheel-disc svg {
  width: 100%;
  height: 100%;
}

.ball-track {
  position: absolute;
  inset: 5%;
  border-radius: 50%;
  transform-origin: center;
}

.ball {
  position: absolute;
  top: -5px;
  left: calc(50% - 7px);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff8c0, #d4a020);
  box-shadow: 0 2px 6px rgba(0,0,0,0.6);
}

.marker {
  position: absolute;
  top: 4%;
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

.wheel-scene.static .wheel-tilt {
  cursor: default;
}
</style>
```

- [ ] **Step 2: Create a quick smoke-test page by embedding the wheel in HomeView.vue temporarily**

```vue
<!-- client/src/views/HomeView.vue (temporary test) -->
<template>
  <div style="width:100vw;height:100vh;background:#0d0b1e;display:flex;align-items:center;justify-content:center;">
    <div style="width:400px;height:400px;">
      <RouletteWheel :static="true" />
    </div>
  </div>
</template>
<script setup lang="ts">
import RouletteWheel from '../components/RouletteWheel.vue'
</script>
```

- [ ] **Step 3: Start dev server and visually verify the wheel renders**

```bash
cd client && npm run dev
```

Open http://localhost:5173 — should see the isometric 3D wheel with colored segments and numbers.
Verify: segments alternate red/black/green (0), numbers visible, 3D tilt visible.

- [ ] **Step 4: Commit**

```bash
cd ..
git add client/src/components/RouletteWheel.vue client/src/views/HomeView.vue
git commit -m "feat: RouletteWheel — SVG 37 segments, 3D CSS, European layout"
```

---

## Task 8: Client — BettingPanel Component

**Files:**
- Create: `client/src/components/BettingPanel.vue`

- [ ] **Step 1: Create BettingPanel.vue**

```vue
<template>
  <div class="betting-panel" :class="{ disabled: props.disabled }">
    <!-- Bet type selection -->
    <div class="bet-types">
      <button
        v-for="bt in BET_TYPES"
        :key="bt.value"
        class="bet-type-btn"
        :class="[bt.value, { active: selectedType === bt.value }]"
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
      <button
        v-if="props.balance < 200 || true"
        class="all-in-btn"
        :disabled="props.disabled"
        @click="betAmount = props.balance"
      >
        Vše
      </button>
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
import { ref, computed } from 'vue'
import type { BetType } from '@ruleta/shared'

const BET_TYPES: { value: BetType; label: string; odds: string }[] = [
  { value: 'red',    label: 'Červená',  odds: '1:1' },
  { value: 'black',  label: 'Černá',    odds: '1:1' },
  { value: 'even',   label: 'Sudá',     odds: '1:1' },
  { value: 'odd',    label: 'Lichá',    odds: '1:1' },
  { value: 'number', label: 'Číslo',    odds: '35:1' },
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
  if (!selectedType.value) return false
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

// Reset when new round starts (disabled → false)
watch(() => props.disabled, (d) => {
  if (!d) confirmed.value = false
})

import { watch } from 'vue'
</script>

<style scoped>
.betting-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  height: 100%;
}
.betting-panel.disabled { opacity: 0.5; pointer-events: none; }

.bet-types {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}

.bet-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--bg2);
  border: 2px solid transparent;
  color: var(--text);
  transition: border-color 0.15s, background 0.15s;
}
.bet-type-btn.red { background: #2a0808; }
.bet-type-btn.black { background: #0a0a1a; border: 2px solid #333; }
.bet-type-btn.active { border-color: var(--accent2) !important; }
.bet-type-btn.even, .bet-type-btn.odd, .bet-type-btn.number { background: #1a1040; }

.odds { font-size: 0.6rem; color: var(--gold); margin-top: 2px; }

.number-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
  max-height: 80px;
  overflow-y: auto;
}

.num-btn {
  font-size: 0.65rem;
  padding: 4px 2px;
  border-radius: 3px;
  font-weight: 700;
}
.num-btn.red { background: var(--red); color: white; }
.num-btn.black { background: #222; color: white; border: 1px solid #555; }
.num-btn.zero { background: var(--green-zero); color: white; }
.num-btn[aria-pressed="true"] { outline: 2px solid var(--gold); }

.amount-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount-btn {
  width: 36px;
  height: 36px;
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
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--gold);
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 6px;
  padding: 6px;
}

.all-in-btn {
  background: #3a1a00;
  border: 1px solid #c05000;
  color: #ff8830;
  font-weight: bold;
  font-size: 0.8rem;
  padding: 6px 10px;
}

.confirm-btn {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  letter-spacing: 0.05em;
}
</style>
```

- [ ] **Step 2: Temporarily add BettingPanel to HomeView to verify rendering**

```vue
<!-- client/src/views/HomeView.vue (temp) -->
<template>
  <div style="width:400px;height:300px;background:#120d30;margin:40px auto;">
    <BettingPanel :balance="1000" :disabled="false" @confirm-bet="console.log($event)" />
  </div>
</template>
<script setup lang="ts">
import BettingPanel from '../components/BettingPanel.vue'
</script>
```

- [ ] **Step 3: Verify in browser — all 5 bet type buttons, number grid appears for 'Číslo', +/- work**

- [ ] **Step 4: Commit**

```bash
cd ..
git add client/src/components/BettingPanel.vue
git commit -m "feat: BettingPanel — 5 bet types, number grid, amount controls, all-in"
```

---

## Task 9: Client — Pinia Stores + useGame

**Files:**
- Create: `client/src/stores/socketStore.ts`
- Create: `client/src/stores/gameStore.ts`
- Create: `client/src/composables/useGame.ts`

- [ ] **Step 1: Create socketStore.ts**

```ts
// client/src/stores/socketStore.ts
import { defineStore } from 'pinia'
import { io, Socket } from 'socket.io-client'
import { ref } from 'vue'

export const useSocketStore = defineStore('socket', () => {
  let socket: Socket | null = null
  const connected = ref(false)

  function connect() {
    if (socket?.connected) return
    socket = io({ path: '/socket.io', transports: ['websocket'] })
    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })
    return socket
  }

  function getSocket(): Socket {
    if (!socket) connect()
    return socket!
  }

  function emit(event: string, data?: unknown) {
    getSocket().emit(event, data)
  }

  function on(event: string, handler: (...args: unknown[]) => void) {
    getSocket().on(event, handler)
  }

  function off(event: string, handler?: (...args: unknown[]) => void) {
    getSocket().off(event, handler)
  }

  return { connected, connect, getSocket, emit, on, off }
})
```

- [ ] **Step 2: Create gameStore.ts**

```ts
// client/src/stores/gameStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, Player } from '@ruleta/shared'
import { useSocketStore } from './socketStore'

export const useGameStore = defineStore('game', () => {
  const socketStore = useSocketStore()

  const gameState = ref<GameState | null>(null)
  const myPlayerId = ref<string>('')
  const roomCode = ref<string>('')
  const bettingTimeLeft = ref(30)
  const lastWinners = ref<Record<string, number>>({})
  const lastBalances = ref<Record<string, number>>({})
  const gameOverData = ref<{ winner: Player | null; leaderboard: Player[] } | null>(null)
  const betConfirmed = ref(false)

  let bettingTimer: ReturnType<typeof setInterval> | null = null

  const myPlayer = computed(() =>
    gameState.value?.players.find(p => p.id === myPlayerId.value) ?? null,
  )

  const isMyTurn = computed(() => myPlayer.value?.status === 'active' && !betConfirmed.value)

  function setupListeners() {
    const s = socketStore.getSocket()
    myPlayerId.value = s.id ?? ''

    socketStore.on('room:joined', (data: unknown) => {
      const d = data as { code: string; players: Player[]; isSingleplayer: boolean }
      roomCode.value = d.code
    })

    socketStore.on('room:playerJoined', (data: unknown) => {
      const d = data as { player: Player }
      if (gameState.value) gameState.value.players.push(d.player)
    })

    socketStore.on('room:playerLeft', (data: unknown) => {
      const d = data as { playerId: string; players: Player[] }
      if (gameState.value) gameState.value.players = d.players
    })

    socketStore.on('game:started', (data: unknown) => {
      const d = data as { gameState: GameState }
      gameState.value = d.gameState
      gameOverData.value = null
    })

    socketStore.on('game:bettingOpen', (data: unknown) => {
      const d = data as { timeLimit: number }
      if (gameState.value) gameState.value.phase = 'betting'
      betConfirmed.value = false
      bettingTimeLeft.value = d.timeLimit
      startBettingTimer()
    })

    socketStore.on('game:playerBet', (data: unknown) => {
      const d = data as { playerId: string }
      if (gameState.value) gameState.value.currentBets[d.playerId] = {} as any
    })

    socketStore.on('game:spinResult', (data: unknown) => {
      const d = data as { number: number; winners: Record<string, number>; newBalances: Record<string, number> }
      if (gameState.value) {
        gameState.value.phase = 'spinning'
        gameState.value.lastResult = d.number
      }
      lastWinners.value = d.winners
      lastBalances.value = d.newBalances
      stopBettingTimer()
    })

    socketStore.on('game:roundEnd', (data: unknown) => {
      const d = data as { gameState: GameState }
      gameState.value = d.gameState
    })

    socketStore.on('game:playerBankrupt', (data: unknown) => {
      const d = data as { playerId: string }
      const p = gameState.value?.players.find(pl => pl.id === d.playerId)
      if (p) p.status = 'spectator'
    })

    socketStore.on('game:over', (data: unknown) => {
      const d = data as { winner: Player | null; leaderboard: Player[] }
      gameOverData.value = d
      if (gameState.value) gameState.value.phase = 'lobby'
    })
  }

  function startBettingTimer() {
    stopBettingTimer()
    bettingTimer = setInterval(() => {
      bettingTimeLeft.value = Math.max(0, bettingTimeLeft.value - 1)
      if (bettingTimeLeft.value === 0) stopBettingTimer()
    }, 1000)
  }

  function stopBettingTimer() {
    if (bettingTimer) { clearInterval(bettingTimer); bettingTimer = null }
  }

  function reset() {
    gameState.value = null
    roomCode.value = ''
    gameOverData.value = null
    betConfirmed.value = false
    stopBettingTimer()
  }

  return {
    gameState, myPlayerId, roomCode, bettingTimeLeft,
    lastWinners, lastBalances, gameOverData, betConfirmed,
    myPlayer, isMyTurn,
    setupListeners, reset,
  }
})
```

- [ ] **Step 3: Create useGame.ts**

```ts
// client/src/composables/useGame.ts
import { useSocketStore } from '../stores/socketStore'
import { useGameStore } from '../stores/gameStore'
import type { BetType } from '@ruleta/shared'

export function useGame() {
  const socketStore = useSocketStore()
  const gameStore = useGameStore()

  function createRoom(nickname: string, isSingleplayer = false) {
    socketStore.connect()
    gameStore.setupListeners()
    socketStore.emit('room:create', { nickname, isSingleplayer })
  }

  function joinRoom(code: string, nickname: string) {
    socketStore.connect()
    gameStore.setupListeners()
    socketStore.emit('room:join', { code, nickname })
  }

  function startGame(code: string) {
    socketStore.emit('room:start', { code })
  }

  function placeBet(type: BetType, amount: number, number?: number) {
    socketStore.emit('game:bet', { type, amount, number })
    gameStore.betConfirmed = true
  }

  return { createRoom, joinRoom, startGame, placeBet }
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/stores/ client/src/composables/useGame.ts
git commit -m "feat: Pinia stores — socketStore, gameStore; useGame composable"
```

---

## Task 10: Client — HomeView

**Files:**
- Modify: `client/src/views/HomeView.vue`

- [ ] **Step 1: Rewrite HomeView.vue with split layout**

```vue
<template>
  <div class="home">
    <!-- Left: static wheel (clipped) -->
    <div class="wheel-half">
      <RouletteWheel :static="true" />
    </div>

    <!-- Right: menu -->
    <div class="menu-half">
      <div class="menu-content">
        <h1 class="title">Ruleta</h1>
        <p class="subtitle">Evropská ruleta</p>

        <div class="menu-buttons">
          <button class="btn-primary menu-btn" @click="startSingleplayer">
            🎯 Singleplayer
          </button>
          <button class="btn-secondary menu-btn" @click="showJoin = !showJoin">
            🔗 Připojit se ke hře
          </button>

          <!-- Join input -->
          <div v-if="showJoin" class="join-form">
            <input
              v-model="joinCode"
              type="text"
              placeholder="Kód hry (6 znaků)"
              maxlength="6"
              @keyup.enter="doJoin"
            />
            <button class="btn-primary" :disabled="joinCode.length < 6" @click="doJoin">
              Vstoupit
            </button>
          </div>

          <button class="btn-secondary menu-btn" @click="createMultiplayer">
            ➕ Založit hru
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import RouletteWheel from '../components/RouletteWheel.vue'
import { useGame } from '../composables/useGame'
import { useGameStore } from '../stores/gameStore'
import { useSocketStore } from '../stores/socketStore'

const router = useRouter()
const { createRoom, joinRoom } = useGame()
const gameStore = useGameStore()
const socketStore = useSocketStore()

const showJoin = ref(false)
const joinCode = ref('')
const error = ref('')

function startSingleplayer() {
  createRoom('Hráč', true)
  waitForRoom().then(code => router.push(`/game/${code}`))
}

function createMultiplayer() {
  const nick = prompt('Vaše přezdívka:') || 'Hráč'
  createRoom(nick, false)
  waitForRoom().then(code => router.push(`/lobby/${code}`))
}

function doJoin() {
  const nick = prompt('Vaše přezdívka:') || 'Hráč'
  joinRoom(joinCode.value.toUpperCase(), nick)
  waitForRoom().then(code => router.push(`/lobby/${code}`))
}

function waitForRoom(): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = socketStore.getSocket()
    s.once('room:joined', (data: { code: string }) => resolve(data.code))
    s.once('room:error', (data: { message: string }) => {
      error.value = data.message
      reject(data.message)
    })
  })
}
</script>

<style scoped>
.home {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.wheel-half {
  width: 50%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 20px;
}

.menu-half {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.menu-content {
  width: 100%;
  max-width: 360px;
}

.title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  background: linear-gradient(135deg, #fff, var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-btn {
  width: 100%;
  padding: 14px;
  font-size: 1rem;
}

.join-form {
  display: flex;
  gap: 8px;
}

.join-form input {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 1.1rem;
}

.error {
  color: #ff6060;
  margin-top: 1rem;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 2: Start both server and client, test navigation**

Terminal 1: `cd server && npm run dev`
Terminal 2: `cd client && npm run dev`

Open http://localhost:5173 — verify:
- Wheel visible on left (isometric, static)
- 3 menu buttons on right
- "Připojit se" expands input
- "Singleplayer" navigates to /game/XXXXXX
- "Založit hru" navigates to /lobby/XXXXXX

- [ ] **Step 3: Commit**

```bash
cd ..
git add client/src/views/HomeView.vue
git commit -m "feat: HomeView — split layout, 3 menu actions, socket navigation"
```

---

## Task 11: Client — LobbyView

**Files:**
- Modify: `client/src/views/LobbyView.vue`

- [ ] **Step 1: Rewrite LobbyView.vue**

```vue
<template>
  <div class="lobby">
    <div class="lobby-card">
      <h2>Herní místnost</h2>

      <div class="room-code">
        <span class="code-label">Kód hry</span>
        <div class="code-display" @click="copyCode" :title="copied ? 'Zkopírováno!' : 'Klikněte pro kopírování'">
          {{ code }}
          <span class="copy-hint">{{ copied ? '✓' : '📋' }}</span>
        </div>
      </div>

      <div class="qr-section">
        <img v-if="qrUrl" :src="qrUrl" alt="QR kód" class="qr-img" />
      </div>

      <div class="players-section">
        <h3>Hráči ({{ players.length }}/8)</h3>
        <ul class="player-list">
          <li v-for="p in players" :key="p.id" class="player-item">
            <span class="player-name">{{ p.nickname }}</span>
            <span v-if="p.isHost" class="host-badge">Hostitel</span>
          </li>
        </ul>
      </div>

      <button
        v-if="isHost"
        class="btn-primary start-btn"
        :disabled="players.length < 2"
        @click="startGame"
      >
        {{ players.length < 2 ? 'Čekáme na hráče...' : 'Spustit hru' }}
      </button>
      <p v-else class="waiting-text">Čekáme až hostitel spustí hru...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import type { Player } from '@ruleta/shared'
import { useGameStore } from '../stores/gameStore'
import { useSocketStore } from '../stores/socketStore'
import { useGame } from '../composables/useGame'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const socketStore = useSocketStore()
const { startGame: doStart } = useGame()

const code = route.params.code as string
const players = ref<Player[]>([])
const qrUrl = ref('')
const copied = ref(false)

const isHost = computed(() => {
  const me = players.value.find(p => p.id === socketStore.getSocket().id)
  return me?.isHost ?? false
})

onMounted(async () => {
  // Populate players from store if available
  const s = socketStore.getSocket()

  s.on('room:joined', (data: { players: Player[] }) => {
    players.value = data.players
  })
  s.on('room:playerJoined', (data: { player: Player }) => {
    if (!players.value.find(p => p.id === data.player.id)) {
      players.value.push(data.player)
    }
  })
  s.on('room:playerLeft', (data: { players: Player[] }) => {
    players.value = data.players
  })
  s.on('game:started', () => {
    router.push(`/game/${code}`)
  })

  // Generate QR code
  const url = `${window.location.origin}${window.location.pathname}#/join/${code}`
  qrUrl.value = await QRCode.toDataURL(url, { width: 150, margin: 1 })
})

async function copyCode() {
  await navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function startGame() {
  doStart(code)
}
</script>

<style scoped>
.lobby {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.lobby-card {
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 16px;
  padding: 2rem;
  width: min(500px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h2 { font-size: 1.5rem; text-align: center; }

.code-label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.1em; }

.code-display {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 0.25em;
  color: var(--gold);
  cursor: pointer;
  user-select: all;
  display: flex;
  align-items: center;
  gap: 12px;
}

.copy-hint { font-size: 1.2rem; }

.qr-section { display: flex; justify-content: center; }
.qr-img { border-radius: 8px; background: white; padding: 6px; }

h3 { font-size: 1rem; color: var(--text-muted); }

.player-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }

.player-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: 6px;
}

.player-name { font-weight: 600; }
.host-badge { font-size: 0.7rem; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; }

.start-btn { width: 100%; padding: 14px; font-size: 1.1rem; }
.waiting-text { text-align: center; color: var(--text-muted); font-size: 0.9rem; }
</style>
```

- [ ] **Step 2: Test lobby flow end-to-end**

1. Start server and client.
2. Open http://localhost:5173, click "Založit hru", enter nickname.
3. Verify lobby shows: room code, QR, player list with host.
4. Open second browser tab, click "Připojit se", enter code.
5. Verify both tabs update player list in real-time.
6. Verify host sees "Spustit hru" button; guest does not.

- [ ] **Step 3: Commit**

```bash
git add client/src/views/LobbyView.vue
git commit -m "feat: LobbyView — room code, QR, player list, real-time updates"
```

---

## Task 12: Client — PlayerList + GameView

**Files:**
- Create: `client/src/components/PlayerList.vue`
- Create: `client/src/components/GameResult.vue`
- Create: `client/src/components/GameOverModal.vue`
- Modify: `client/src/views/GameView.vue`

- [ ] **Step 1: Create PlayerList.vue**

```vue
<template>
  <div class="player-list">
    <div
      v-for="player in players"
      :key="player.id"
      class="player-row"
      :class="{ me: player.id === myId, spectator: player.status === 'spectator', bet: hasBet(player.id) }"
    >
      <div class="player-info">
        <span class="nickname">{{ player.nickname }}<span v-if="player.isHost"> 👑</span></span>
        <span v-if="player.status === 'spectator'" class="spectator-label">divák</span>
        <span v-if="hasBet(player.id)" class="bet-label">✓ vsadil</span>
      </div>
      <div class="balance" :class="{ changed: recentlyChanged(player.id) }">
        ${{ player.balance.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Player } from '@ruleta/shared'

const props = defineProps<{
  players: Player[]
  myId: string
  bets: Record<string, unknown>
  lastBalances: Record<string, number>
}>()

const changed = ref<Set<string>>(new Set())

function hasBet(id: string): boolean {
  return id in props.bets
}

function recentlyChanged(id: string): boolean {
  return changed.value.has(id)
}

watch(() => props.lastBalances, (newBalances) => {
  changed.value = new Set(Object.keys(newBalances))
  setTimeout(() => { changed.value = new Set() }, 2000)
}, { deep: true })
</script>

<style scoped>
.player-list { display: flex; flex-direction: column; gap: 6px; padding: 8px; }

.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--bg2);
  border: 1px solid transparent;
  transition: border-color 0.2s;
}
.player-row.me { border-color: var(--accent2); }
.player-row.spectator { opacity: 0.5; }
.player-row.bet { border-color: var(--accent); }

.player-info { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.nickname { font-weight: 600; font-size: 0.9rem; }
.spectator-label { font-size: 0.7rem; color: var(--text-muted); background: #333; padding: 1px 5px; border-radius: 3px; }
.bet-label { font-size: 0.7rem; color: var(--accent); }

.balance { font-weight: 700; color: var(--gold); font-size: 1rem; }
.balance.changed { animation: flash 0.6s ease; }

@keyframes flash {
  0%,100% { color: var(--gold); }
  50% { color: #fff; }
}
</style>
```

- [ ] **Step 2: Create GameResult.vue**

```vue
<template>
  <Transition name="fade">
    <div v-if="visible" class="result-overlay">
      <div class="result-number">
        <span class="number-label">{{ resultNumber }}</span>
        <span class="color-label" :class="numberColor">{{ colorName }}</span>
      </div>
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
  if (props.resultNumber === 0) return 'green'
  return RED.has(props.resultNumber) ? 'red' : 'black'
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
  background: rgba(10, 5, 25, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 20;
}

.result-number { text-align: center; }
.number-label { display: block; font-size: 5rem; font-weight: 900; color: white; }
.color-label { display: block; font-size: 1.2rem; font-weight: 700; padding: 4px 16px; border-radius: 20px; }
.color-label.red { background: var(--red); }
.color-label.black { background: #222; border: 1px solid #555; }
.color-label.green { background: var(--green-zero); }

.my-result { font-size: 1.8rem; font-weight: 800; }
.win { color: var(--gold); }
.loss { color: #ff6060; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 3: Create GameOverModal.vue**

```vue
<template>
  <div v-if="props.data" class="modal-backdrop">
    <div class="modal">
      <div v-if="props.data.winner" class="winner-header">
        🏆 {{ props.data.winner.nickname }} vyhrál!
      </div>
      <div v-else class="bankrupt-header">💸 Bankrot!</div>

      <div class="leaderboard">
        <div
          v-for="(p, i) in props.data.leaderboard"
          :key="p.id"
          class="leaderboard-row"
          :class="{ me: p.id === myId }"
        >
          <span class="rank">#{{ i + 1 }}</span>
          <span class="name">{{ p.nickname }}</span>
          <span class="balance">${{ p.balance.toLocaleString() }}</span>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" @click="emit('play-again')">Hrát znovu</button>
        <button class="btn-secondary" @click="emit('home')">Domů</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '@ruleta/shared'

const props = defineProps<{
  data: { winner: Player | null; leaderboard: Player[] } | null
  myId: string
}>()

const emit = defineEmits<{
  'play-again': []
  'home': []
}>()
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 3, 15, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--bg2);
  border: 1px solid var(--rim);
  border-radius: 16px;
  padding: 2rem;
  width: min(420px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.winner-header { font-size: 1.5rem; font-weight: 900; color: var(--gold); text-align: center; }
.bankrupt-header { font-size: 1.5rem; font-weight: 900; color: #ff6060; text-align: center; }

.leaderboard { display: flex; flex-direction: column; gap: 6px; }

.leaderboard-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--bg);
}
.leaderboard-row.me { border: 1px solid var(--accent2); }

.rank { color: var(--text-muted); width: 24px; }
.name { flex: 1; font-weight: 600; }
.balance { color: var(--gold); font-weight: 700; }

.modal-actions { display: flex; gap: 10px; }
.modal-actions button { flex: 1; padding: 12px; }
</style>
```

- [ ] **Step 4: Rewrite GameView.vue**

```vue
<template>
  <div class="game-view">
    <!-- Left: wheel -->
    <div class="wheel-section">
      <RouletteWheel
        :spinning="gameState?.phase === 'spinning'"
        :target-number="gameState?.lastResult"
        @spin-complete="onSpinComplete"
      />
      <!-- Round info -->
      <div class="round-info" v-if="gameState">
        Kolo {{ gameState.round + 1 }}
        <span v-if="gameState.phase === 'betting'" class="timer">
          &nbsp;· {{ bettingTimeLeft }}s
        </span>
      </div>

      <!-- Result overlay (positioned over wheel) -->
      <GameResult
        :visible="showResult"
        :result-number="gameState?.lastResult"
        :my-win="myWin"
      />
    </div>

    <!-- Right: players + betting -->
    <div class="sidebar">
      <PlayerList
        v-if="gameState"
        :players="gameState.players"
        :my-id="myPlayerId"
        :bets="gameState.currentBets"
        :last-balances="lastBalances"
      />

      <BettingPanel
        v-if="myPlayer && gameState?.phase === 'betting'"
        :balance="myPlayer.balance"
        :disabled="betConfirmed || myPlayer.status === 'spectator'"
        @confirm-bet="onBet"
      />

      <div v-if="myPlayer?.status === 'spectator'" class="spectator-notice">
        Jste divák — sledujete hru
      </div>
    </div>

    <GameOverModal
      :data="gameOverData"
      :my-id="myPlayerId"
      @play-again="playAgain"
      @home="goHome"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/gameStore'
import { useGame } from '../composables/useGame'
import RouletteWheel from '../components/RouletteWheel.vue'
import BettingPanel from '../components/BettingPanel.vue'
import PlayerList from '../components/PlayerList.vue'
import GameResult from '../components/GameResult.vue'
import GameOverModal from '../components/GameOverModal.vue'
import type { BetType } from '@ruleta/shared'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { placeBet, startGame } = useGame()

const {
  gameState, myPlayerId, bettingTimeLeft,
  lastWinners, lastBalances, gameOverData, betConfirmed,
  myPlayer,
} = storeToRefs(gameStore)

const code = route.params.code as string
const showResult = ref(false)
const myWin = ref(0)

// Auto-start for singleplayer (the host navigates here directly)
onMounted(() => {
  if (!gameState.value) {
    // We navigated here from singleplayer — start immediately
    const s = useSocketStore().getSocket()
    s.once('room:joined', () => startGame(code))
  }
})

function onBet({ type, amount, number }: { type: BetType; amount: number; number?: number }) {
  placeBet(type, amount, number)
}

function onSpinComplete() {
  showResult.value = true
  myWin.value = lastWinners.value[myPlayerId.value] ?? 0
  setTimeout(() => { showResult.value = false }, 3000)
}

function playAgain() {
  gameStore.reset()
  router.push('/')
}

function goHome() {
  gameStore.reset()
  router.push('/')
}

import { useSocketStore } from '../stores/socketStore'
onUnmounted(() => gameStore.reset())
</script>

<style scoped>
.game-view {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  gap: 0;
}

.wheel-section {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.round-info {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.85rem;
  color: var(--text-muted);
  background: rgba(10,5,30,0.7);
  padding: 4px 12px;
  border-radius: 20px;
}

.timer { color: var(--accent2); font-weight: bold; }

.sidebar {
  width: min(320px, 42%);
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--rim);
  background: var(--bg2);
  overflow: hidden;
}

.spectator-notice {
  text-align: center;
  padding: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  border-top: 1px solid var(--rim);
}
</style>
```

- [ ] **Step 5: End-to-end test of singleplayer game**

1. Start server + client.
2. Click Singleplayer → navigates to /game/XXXXXX.
3. Game starts → BettingPanel appears, 30s timer.
4. Place a bet → confirm.
5. Wheel spins, result shown, balance updates.
6. Next round starts automatically.
7. Play until $5000 or bankrupt — GameOverModal appears.

- [ ] **Step 6: End-to-end test of multiplayer**

1. Open two browser tabs.
2. Tab 1: Založit hru → lobby. Tab 2: Připojit se → lobby.
3. Host clicks Spustit hru.
4. Both tabs navigate to /game/ and game plays.

- [ ] **Step 7: Commit**

```bash
cd ..
git add client/src/components/PlayerList.vue client/src/components/GameResult.vue \
        client/src/components/GameOverModal.vue client/src/views/GameView.vue
git commit -m "feat: GameView + PlayerList + GameResult + GameOverModal — full game loop"
```

---

## Task 13: Client — useSound

**Files:**
- Create: `client/src/composables/useSound.ts`
- Modify: `client/src/views/GameView.vue` (add sound triggers)
- Modify: `client/src/App.vue` (add mute toggle)

- [ ] **Step 1: Create useSound.ts**

```ts
// client/src/composables/useSound.ts
import { ref } from 'vue'

const muted = ref(false)
let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3) {
  if (muted.value) return
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
    ;[0, 200, 500, 900].forEach(delay => setTimeout(() => playTone(600, 0.15, 'sine', 0.2), delay))
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
```

- [ ] **Step 2: Wire sounds into GameView.vue**

Add to the `<script setup>` of GameView.vue:

```ts
import { useSound } from '../composables/useSound'
const { startTicking, stopTicking, slowdownSound, playWin, playLoss } = useSound()

// Watch for spin phase
watch(() => gameState.value?.phase, (phase) => {
  if (phase === 'spinning') {
    startTicking()
    setTimeout(slowdownSound, 3000)
  }
})

// Update onSpinComplete to play win/loss sound
function onSpinComplete() {
  stopTicking()
  showResult.value = true
  myWin.value = lastWinners.value[myPlayerId.value] ?? 0
  if (myWin.value > 0) playWin()
  else playLoss()
  setTimeout(() => { showResult.value = false }, 3000)
}
```

- [ ] **Step 3: Add mute toggle to App.vue**

In App.vue's `<template>`, add:
```html
<button class="mute-btn" @click="sound.toggleMute()">
  {{ sound.muted.value ? '🔇' : '🔊' }}
</button>
```

In `<script setup>`:
```ts
import { useSound } from './composables/useSound'
const sound = useSound()
```

In `<style scoped>`:
```css
.mute-btn {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 50;
  background: rgba(20,10,50,0.8);
  border: 1px solid var(--rim);
  color: white;
  font-size: 1.2rem;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
```

- [ ] **Step 4: Test sound manually — verify ticking during spin, win/loss sound after result**

- [ ] **Step 5: Commit**

```bash
git add client/src/composables/useSound.ts client/src/views/GameView.vue client/src/App.vue
git commit -m "feat: useSound — Web Audio API ticking/win/loss sounds, mute toggle"
```

---

## Task 14: Final Polish & Reconnection

**Files:**
- Modify: `server/src/index.ts` (reconnection support)
- Modify: `client/src/views/HomeView.vue` (join from QR URL)
- Modify: `client/src/router/index.ts` (add /join/:code route)

- [ ] **Step 1: Add /join/:code route for QR scanning**

```ts
// client/src/router/index.ts — add route:
{ path: '/join/:code', component: () => import('../views/JoinView.vue') },
```

Create `client/src/views/JoinView.vue`:

```vue
<template>
  <div class="join-page">
    <h2>Připojit se ke hře</h2>
    <p>Kód: <strong>{{ code }}</strong></p>
    <input v-model="nickname" type="text" placeholder="Vaše přezdívka" maxlength="20" />
    <button class="btn-primary" :disabled="!nickname" @click="doJoin">Vstoupit</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '../composables/useGame'
import { useSocketStore } from '../stores/socketStore'

const route = useRoute()
const router = useRouter()
const { joinRoom } = useGame()
const socketStore = useSocketStore()
const code = route.params.code as string
const nickname = ref('')

function doJoin() {
  joinRoom(code, nickname.value)
  socketStore.getSocket().once('room:joined', (data: { code: string }) => {
    router.push(`/lobby/${data.code}`)
  })
  socketStore.getSocket().once('room:error', () => {
    router.push('/')
  })
}
</script>

<style scoped>
.join-page {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 1rem; height: 100vh;
  background: var(--bg); color: var(--text);
}
h2 { font-size: 1.5rem; }
input { max-width: 280px; }
button { padding: 12px 32px; font-size: 1rem; }
</style>
```

- [ ] **Step 2: Add server-side reconnection (60s hold)**

In `server/src/index.ts`, add a reconnection map and modify the disconnect handler:

```ts
// Add after `const rooms = new RoomManager()`:
const disconnectedPlayers = new Map<string, { code: string; nickname: string; timeout: ReturnType<typeof setTimeout> }>()

// Replace `socket.on('disconnecting', ...)` with:
socket.on('disconnecting', () => {
  for (const code of socket.rooms) {
    if (code === socket.id) continue
    const room = rooms.get(code)
    if (!room) continue
    const player = room.getPlayer(socket.id)
    if (!player) continue
    // Hold state for 60s before removing
    const timeout = setTimeout(() => {
      disconnectedPlayers.delete(socket.id)
      const { newHostId, shouldClose } = room.removePlayer(socket.id)
      if (shouldClose) {
        rooms.remove(code)
      } else {
        if (newHostId) io.to(code).emit('room:newHost', { playerId: newHostId })
        io.to(code).emit('room:playerLeft', { playerId: socket.id, players: room.getPlayers() })
      }
    }, 60_000)
    disconnectedPlayers.set(socket.id, { code, nickname: player.nickname, timeout })
  }
})

// Add new event for reconnection:
socket.on('room:rejoin', ({ code, oldId }: { code: string; oldId: string }) => {
  const held = disconnectedPlayers.get(oldId)
  if (!held || held.code !== code) {
    socket.emit('room:error', { message: 'Relace vypršela, připojte se znovu' })
    return
  }
  clearTimeout(held.timeout)
  disconnectedPlayers.delete(oldId)
  // Re-map old player ID to new socket ID (simplified: add as existing player)
  socket.join(code)
  socket.emit('room:joined', { code, players: rooms.get(code)?.getPlayers() ?? [] })
})
```

- [ ] **Step 3: Run the full test suite one final time**

```bash
cd server && npm test
```

Expected: all tests PASS

- [ ] **Step 4: Manual smoke test — full game from home screen**

1. Start `npm run dev` from root (runs both server and client).
2. Singleplayer: play 3+ rounds, verify balance updates, sound plays.
3. Multiplayer (two tabs): create + join + start + play 2 rounds + one player hits $5000 → GameOverModal shows.
4. Portrait mode: resize browser to portrait → overlay appears.
5. Mute toggle: click 🔊 → 🔇, spin in silence.

- [ ] **Step 5: Final commit**

```bash
cd ..
git add .
git commit -m "feat: reconnection support, /join/:code QR route — v1 complete"
```

---

## Self-Review Checklist

All spec requirements mapped:

| Requirement | Task |
|-------------|------|
| Úvodní obrazovka — split layout, 3 tlačítka | Task 10 |
| Kolo 3D izometrické, statické na home | Task 7, 10 |
| Singleplayer $1000→$5000, bankrot | Task 2, 4, 12 |
| Multiplayer create/join room s kódem | Task 5, 11 |
| Lobby s QR, player list, start button | Task 11 |
| Real-time hráči přes Socket.IO | Task 5, 9 |
| Sázky: červená/černá/sudá/lichá/číslo | Task 2, 8 |
| Výplaty 1:1 a 35:1 | Task 2 |
| Nula prohrává outside sázky | Task 2 |
| Výše sázky po $100, all-in < $200 | Task 8 |
| Timer 30s, přechod dřív | Task 5, 12 |
| Animace kola ~5s, kulička | Task 7 |
| Výsledný overlay 3s | Task 12 |
| Bankrupt → divák | Task 4, 12 |
| GameOverModal + leaderboard | Task 12 |
| Zvuky + mute | Task 13 |
| Portrait overlay | Task 6 |
| Hraniční případ — timer expiry | Task 5 |
| Hraniční případ — host disconnect | Task 5, 14 |
| Hraniční případ — 1 aktivní hráč | Task 4, 5 |
| Reconnect 60s | Task 14 |
| Evropská ruleta 0-36 | Task 2 |
