import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSocketStore } from './socketStore';
export const useGameStore = defineStore('game', () => {
    const socketStore = useSocketStore();
    const gameState = ref(null);
    const myPlayerId = ref('');
    const roomCode = ref('');
    const bettingTimeLeft = ref(30);
    const lastWinners = ref({});
    const lastBalances = ref({});
    const gameOverData = ref(null);
    const betConfirmed = ref(false);
    const isListening = ref(false);
    let bettingTimer = null;
    const myPlayer = computed(() => gameState.value?.players.find(p => p.id === myPlayerId.value) ?? null);
    function setupListeners() {
        if (isListening.value)
            return;
        isListening.value = true;
        const s = socketStore.getSocket();
        myPlayerId.value = s.id ?? '';
        // Update myPlayerId once connected
        s.on('connect', () => { myPlayerId.value = s.id ?? ''; });
        socketStore.on('room:joined', (data) => {
            const d = data;
            roomCode.value = d.code;
        });
        socketStore.on('room:playerJoined', (data) => {
            const d = data;
            if (gameState.value) {
                if (!gameState.value.players.find(p => p.id === d.player.id)) {
                    gameState.value.players.push(d.player);
                }
            }
        });
        socketStore.on('room:playerLeft', (data) => {
            const d = data;
            if (gameState.value)
                gameState.value.players = d.players;
        });
        socketStore.on('room:newHost', (data) => {
            const d = data;
            if (gameState.value) {
                gameState.value.players.forEach(p => {
                    p.isHost = p.id === d.playerId;
                });
            }
        });
        socketStore.on('game:started', (data) => {
            const d = data;
            gameState.value = d.gameState;
            gameOverData.value = null;
        });
        socketStore.on('game:bettingOpen', (data) => {
            const d = data;
            if (gameState.value)
                gameState.value.phase = 'betting';
            betConfirmed.value = false;
            bettingTimeLeft.value = d.timeLimit;
            startBettingTimer();
        });
        socketStore.on('game:playerBet', (data) => {
            const d = data;
            if (gameState.value) {
                gameState.value.currentBets[d.playerId] = { type: 'even', amount: 0 };
            }
        });
        socketStore.on('game:spinResult', (data) => {
            const d = data;
            if (gameState.value) {
                gameState.value.phase = 'spinning';
                gameState.value.lastResult = d.number;
                // Update balances in player list
                gameState.value.players.forEach(p => {
                    if (d.newBalances[p.id] !== undefined)
                        p.balance = d.newBalances[p.id];
                });
            }
            lastWinners.value = d.winners;
            lastBalances.value = d.newBalances;
            stopBettingTimer();
        });
        socketStore.on('game:roundEnd', (data) => {
            const d = data;
            gameState.value = d.gameState;
        });
        socketStore.on('game:playerBankrupt', (data) => {
            const d = data;
            const p = gameState.value?.players.find(pl => pl.id === d.playerId);
            if (p)
                p.status = 'spectator';
        });
        socketStore.on('game:over', (data) => {
            const d = data;
            gameOverData.value = d;
            if (gameState.value)
                gameState.value.phase = 'lobby';
        });
    }
    function startBettingTimer() {
        stopBettingTimer();
        bettingTimer = setInterval(() => {
            bettingTimeLeft.value = Math.max(0, bettingTimeLeft.value - 1);
            if (bettingTimeLeft.value === 0)
                stopBettingTimer();
        }, 1000);
    }
    function stopBettingTimer() {
        if (bettingTimer) {
            clearInterval(bettingTimer);
            bettingTimer = null;
        }
    }
    function reset() {
        gameState.value = null;
        roomCode.value = '';
        gameOverData.value = null;
        betConfirmed.value = false;
        isListening.value = false;
        stopBettingTimer();
    }
    return {
        gameState, myPlayerId, roomCode, bettingTimeLeft,
        lastWinners, lastBalances, gameOverData, betConfirmed,
        myPlayer, setupListeners, reset,
    };
});
