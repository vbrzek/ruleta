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
    // Registered handler references for teardown
    const registeredHandlers = [];
    const myPlayer = computed(() => gameState.value?.players.find(p => p.id === myPlayerId.value) ?? null);
    function setupListeners() {
        if (isListening.value)
            return;
        isListening.value = true;
        const s = socketStore.getSocket();
        myPlayerId.value = s.id ?? '';
        function addListener(event, fn) {
            socketStore.on(event, fn);
            registeredHandlers.push({ event, fn });
        }
        // Update myPlayerId once connected
        const onConnect = () => { myPlayerId.value = s.id ?? ''; };
        s.on('connect', onConnect);
        registeredHandlers.push({ event: 'connect', fn: onConnect });
        addListener('room:joined', (data) => {
            const d = data;
            roomCode.value = d.code;
        });
        addListener('room:playerJoined', (data) => {
            const d = data;
            if (gameState.value) {
                if (!gameState.value.players.find(p => p.id === d.player.id)) {
                    gameState.value.players.push(d.player);
                }
            }
        });
        addListener('room:playerLeft', (data) => {
            const d = data;
            if (gameState.value)
                gameState.value.players = d.players;
        });
        addListener('room:newHost', (data) => {
            const d = data;
            if (gameState.value) {
                gameState.value.players.forEach(p => {
                    p.isHost = p.id === d.playerId;
                });
            }
        });
        addListener('game:started', (data) => {
            const d = data;
            gameState.value = d.gameState;
            gameOverData.value = null;
        });
        addListener('game:bettingOpen', (data) => {
            const d = data;
            if (gameState.value)
                gameState.value.phase = 'betting';
            betConfirmed.value = false;
            bettingTimeLeft.value = d.timeLimit;
            startBettingTimer();
        });
        addListener('game:playerBet', (data) => {
            const d = data;
            if (gameState.value) {
                gameState.value.currentBets[d.playerId] = { type: 'even', amount: 0 };
            }
        });
        addListener('game:spinResult', (data) => {
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
        addListener('game:roundEnd', (data) => {
            const d = data;
            gameState.value = d.gameState;
        });
        addListener('game:playerBankrupt', (data) => {
            const d = data;
            const p = gameState.value?.players.find(pl => pl.id === d.playerId);
            if (p)
                p.status = 'spectator';
        });
        addListener('game:over', (data) => {
            const d = data;
            gameOverData.value = d;
            if (gameState.value)
                gameState.value.phase = 'lobby';
        });
    }
    function teardownListeners() {
        for (const { event, fn } of registeredHandlers) {
            socketStore.off(event, fn);
        }
        registeredHandlers.length = 0;
        isListening.value = false;
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
        stopBettingTimer();
        teardownListeners();
        sessionStorage.removeItem('ruleta_room_code');
        sessionStorage.removeItem('ruleta_old_socket_id');
    }
    return {
        gameState, myPlayerId, roomCode, bettingTimeLeft,
        lastWinners, lastBalances, gameOverData, betConfirmed,
        myPlayer, setupListeners, teardownListeners, reset,
    };
});
