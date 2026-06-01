import { defineStore } from 'pinia'
import { io, type Socket } from 'socket.io-client'
import { ref } from 'vue'

export const useSocketStore = defineStore('socket', () => {
  let socket: Socket | null = null
  const connected = ref(false)

  function connect() {
    if (socket?.connected) return socket
    socket = io({ path: '/socket.io', transports: ['websocket'] })

    socket.on('connect', () => {
      connected.value = true
      // Try to reconnect to a previous session
      const savedCode = sessionStorage.getItem('ruleta_room_code')
      const savedOldId = sessionStorage.getItem('ruleta_old_socket_id')
      if (savedCode && savedOldId && savedOldId !== socket!.id) {
        socket!.emit('room:rejoin', { code: savedCode, oldId: savedOldId })
      }
    })
    socket.on('disconnect', () => {
      connected.value = false
      // Save current socket ID before it changes on reconnect
      if (socket?.id) sessionStorage.setItem('ruleta_old_socket_id', socket.id)
    })
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
