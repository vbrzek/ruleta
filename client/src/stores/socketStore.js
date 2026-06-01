import { defineStore } from 'pinia';
import { io } from 'socket.io-client';
import { ref } from 'vue';
export const useSocketStore = defineStore('socket', () => {
    let socket = null;
    const connected = ref(false);
    function connect() {
        if (socket?.connected)
            return socket;
        socket = io({ path: '/socket.io', transports: ['websocket'] });
        socket.on('connect', () => { connected.value = true; });
        socket.on('disconnect', () => { connected.value = false; });
        return socket;
    }
    function getSocket() {
        if (!socket)
            connect();
        return socket;
    }
    function emit(event, data) {
        getSocket().emit(event, data);
    }
    function on(event, handler) {
        getSocket().on(event, handler);
    }
    function off(event, handler) {
        getSocket().off(event, handler);
    }
    return { connected, connect, getSocket, emit, on, off };
});
