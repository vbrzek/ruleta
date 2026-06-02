// server/src/index.ts
import { createGameServer } from './createGameServer.js'

const PORT = Number(process.env.PORT) || 3001

const { httpServer } = createGameServer()

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
