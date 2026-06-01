import { useSocketStore } from '../stores/socketStore';
import { useGameStore } from '../stores/gameStore';
export function useGame() {
    const socketStore = useSocketStore();
    const gameStore = useGameStore();
    function createRoom(nickname, isSingleplayer = false) {
        socketStore.connect();
        gameStore.setupListeners();
        socketStore.emit('room:create', { nickname, isSingleplayer });
    }
    function joinRoom(code, nickname) {
        socketStore.connect();
        gameStore.setupListeners();
        socketStore.emit('room:join', { code, nickname });
    }
    function startGame(code) {
        socketStore.emit('room:start', { code });
    }
    function placeBet(type, amount, number) {
        socketStore.emit('game:bet', { type, amount, number });
        useGameStore().betConfirmed = true;
    }
    return { createRoom, joinRoom, startGame, placeBet };
}
