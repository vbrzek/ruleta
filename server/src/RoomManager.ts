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
