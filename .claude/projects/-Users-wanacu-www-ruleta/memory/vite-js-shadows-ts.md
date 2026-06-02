---
name: vite-js-shadows-ts
description: Why compiled .js must never live in client/src — Vite loads it instead of the .ts source
metadata:
  type: project
---

Vite's default `resolve.extensions` puts `.js` before `.ts`, so an extensionless import like `../stores/gameStore` resolves to a sibling `gameStore.js` if one exists — silently running stale compiled code while `.ts` edits appear to do nothing.

This bit us: committed compiled `.js` (stores, composables, router, `.vue.js`) under `client/src/` shadowed the real sources. Removed them and added `client/src/**/*.js` to `.gitignore` (2026-06-02).

**Why:** edits to `.ts`/`.vue` source were not taking effect in the running app.
**How to apply:** never commit compiled `.js` into `client/src/`; the source of truth is `.ts`/`.vue`. `npm run build` emits to `dist/` (gitignored). `.vue` imports are safe because they carry an explicit extension.
