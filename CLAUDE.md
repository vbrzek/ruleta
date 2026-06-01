# Ruleta — CLAUDE.md

## Co je tento projekt

Webová hra rulety. Singleplayer (1 hráč vs. krupiér) a multiplayer (2–8 hráčů, real-time přes WebSockets). Primárně pro mobil na šířku, funguje i na desktopu.

## Technologický stack

- **Frontend:** Vue 3 (Composition API) + Pinia + Vue Router + Vite (`client/`)
- **Backend:** Node.js + TypeScript + Express + Socket.IO (`server/`)
- **Sdílené typy:** `shared/types.ts`
- **Kolo:** CSS 3D transforms + SVG (37 segmentů, evropská ruleta 0–36)
- **Zvuky:** Web Audio API

## Spuštění

```bash
# Backend
cd server && npm install && npm run dev   # port 3001

# Frontend
cd client && npm install && npm run dev  # port 5173 (proxy → 3001)
```

## Klíčové principy

- **Server je autorita:** výsledek spinu se generuje výhradně na serveru (`roulette.ts`). Klient nikdy nevypočítává výhry.
- **Socket.IO rooms:** každý herní stůl = jedna Socket.IO místnost pojmenovaná kódem hry.
- **Sdílené typy:** veškeré datové struktury jsou v `shared/types.ts` — importovat z tam, nikdy nedefinovat duplicitně.

## Herní logika

- Typ rulety: Evropská (0–36, jedna nula)
- Typy sázek: červená (1:1), černá (1:1), sudá (1:1), lichá (1:1), konkrétní číslo (35:1)
- Nula prohrává všechny outside sázky (červená, černá, sudá, lichá)
- Sázky pouze násobky $100, minimum $100
- Tlačítko "Vše" povinně pokud zůstatek < $200
- Singleplayer: start $1 000, cíl $5 000, bankrot = prohra
- Multiplayer: start $1 000, cíl $5 000, první kdo dosáhne vyhrává; bankrot = divák

## Fáze kola

`lobby` → `betting` (30 s) → `spinning` (~5 s animace) → `result` (3 s) → zpět na `betting`

## Vizuální styl

- Pozadí: `#0d0b1e` (tmavá fialová)
- Akcenty: `#7b4fc4`, `#4fc3f7`
- Výhry: `#f0c060` (zlatá)
- Kolo: červená `#c0392b`, černá `#1a1a2e`, nula `#27ae60`

## Struktura souborů

```
client/src/
  views/       HomeView, LobbyView, GameView
  components/  RouletteWheel, RouletteBall, BettingPanel, PlayerList, GameResult, GameOverModal
  stores/      gameStore, socketStore
  composables/ useSocket, useGame, useSound
  router/      /, /lobby/:code, /game/:code

server/src/
  index.ts       Express + Socket.IO
  GameRoom.ts    herní logika + fáze
  RoomManager.ts správa místností
  roulette.ts    spin(), resolveWin() — pure funkce

shared/
  types.ts       Player, Bet, GameState, BetType, GamePhase, ...
```

## Design spec

Plný design dokument: `docs/superpowers/specs/2026-06-01-ruleta-design.md`
