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
