/**
 * Main Application Entry Point
 */

import { SocketClient } from './utils/socket-client.js';
import { UIRenderer } from './ui/renderer.js';
import { GameState } from './game/state.js';
import { STORAGE_KEYS } from '../constants.js';

class App {
    constructor() {
        this.ui = new UIRenderer();
        this.state = new GameState();
        this.socket = new SocketClient();

        this.bindEvents();
        this.checkSession();
        this.fetchLocalIP();
    }

    bindEvents() {
        // UI Buttons
        document.getElementById('createRoomBtn').onclick = () => this.createRoom();
        document.getElementById('joinRoomBtn').onclick = () => this.joinRoom();
        document.getElementById('startGameBtn').onclick = () => this.startGame();
        document.getElementById('submitCardsBtn').onclick = () => this.submitCards();
        document.getElementById('swapCardsBtn').onclick = () => this.swapCards();
        document.getElementById('endGameBtn').onclick = () => this.endGame();
        document.getElementById('leaveGameBtn').onclick = () => this.leaveGame();
        document.getElementById('leaveLobbyBtn').onclick = () => this.leaveGame();
        document.getElementById('newGameBtn').onclick = () => location.reload();

        const toggleBtn = document.getElementById('toggleTimerBtn');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                this.socket.emit('toggleTimer', (res) => {
                    if (!res.success) this.ui.showError(res.message);
                });
            };
        }

        // Socket Events
        this.socket.on('gameState', (data) => this.onGameState(data));
        this.socket.on('yourHand', (hand) => this.onHandUpdate(hand));
        this.socket.on('playerJoined', (data) => console.log('Player joined:', data));
        this.socket.on('playerLeft', (data) => console.log('Player left:', data));
        this.socket.on('roundWinner', (data) => this.onRoundWinner(data));
        this.socket.on('submissions', (data) => this.onSubmissions(data));
        this.socket.on('connect', () => this.onSocketConnect());
        this.socket.on('timerTick', (data) => this.onTimerTick(data));
    }

    async fetchLocalIP() {
        try {
            const res = await fetch('/api/local-ip');
            const data = await res.json();
            // Render QR Code on Home Screen
            this.ui.renderQRCode(data.url);

            // Add IP display
            const ipDisplay = document.getElementById('localIpDisplay');
            if (ipDisplay) {
                ipDisplay.innerHTML = `Join at: <strong>${data.url}</strong>`;
            }
        } catch (e) {
            console.error('Failed to fetch local IP', e);
        }
    }

    createRoom() {
        let name = document.getElementById('playerNameInput').value.trim();
        if (!name) {
            name = this.getRandomName();
        }

        this.state.playerName = name;
        this.socket.emit('createRoom', name, (res) => {
            console.log('createRoom response:', res);
            if (res.success) {
                this.saveSession(res.roomCode, name);
                this.ui.showScreen('lobby');
                this.ui.updateRoomCode(res.roomCode);
            } else {
                this.ui.showError(res.message);
            }
        });
    }

    joinRoom() {
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        let name = document.getElementById('playerNameInput').value.trim();

        if (!code) return this.ui.showError('Enter room code');
        if (!name) {
            name = this.getRandomName();
        }

        this.state.playerName = name;
        this.socket.emit('joinRoom', code, name, (res) => {
            if (res.success) {
                this.saveSession(res.roomCode, name);
                this.ui.showScreen('lobby');
                this.ui.updateRoomCode(res.roomCode);
            } else {
                this.ui.showError(res.message);
            }
        });
    }

    startGame() {
        this.socket.emit('startGame', (res) => {
            if (!res.success) this.ui.showError(res.message);
        });
    }

    submitCards() {
        console.log('[Submit] Button clicked');
        const selectedCount = this.state.selectedCards.length;
        const pickCount = this.state.pickCount;
        console.log(`[Submit] Selected: ${selectedCount}, Required: ${pickCount}`);
        console.log(`[Submit] Selected IDs:`, JSON.stringify(this.state.selectedCards));

        if (selectedCount !== pickCount) {
            console.warn(`[Submit] Validation failed: ${selectedCount} !== ${pickCount}`);
            return this.ui.showError(`Select ${pickCount} cards`);
        }

        console.log('[Submit] Sending to server...');
        this.socket.emit('submitCards', this.state.selectedCards, (res) => {
            console.log('[Submit] Server response:', res);
            if (res.success) {
                this.state.selectedCards = [];
                this.ui.renderHand(this.state.hand, [], this.onCardSelect.bind(this));
            } else {
                console.error('[Submit] Server error:', res.message);
                this.ui.showError(res.message);
            }
        });
    }

    swapCards() {
        if (this.state.selectedCards.length === 0) return;
        if (this.state.swapsRemaining < this.state.selectedCards.length) {
            return this.ui.showError('Not enough swaps remaining');
        }

        this.socket.emit('swapCards', this.state.selectedCards, (res) => {
            if (res.success) {
                this.state.selectedCards = [];
                // Hand will be updated via 'yourHand' event
            } else {
                this.ui.showError(res.message);
            }
        });
    }

    endGame() {
        if (confirm('End the game now and show final scores?')) {
            console.log('[Client] Emitting endGame event...');
            this.socket.emit('endGame', (res) => {
                console.log('[Client] endGame response:', res);
                if (!res.success) {
                    this.ui.showError(res.message || 'Failed to end game');
                } else {
                    console.log('[Client] Game ended successfully, waiting for gameState update');
                }
                // Game state will be updated via 'gameState' event
            });
        }
    }

    leaveGame() {
        if (confirm('Leave game?')) {
            this.socket.emit('leaveGame');
            sessionStorage.removeItem(STORAGE_KEYS.SESSION);
            location.reload();
        }
    }

    onSocketConnect() {
        console.log('[Socket] Connected/Reconnected to server');
        // If we have a saved session, try to re-join the room automatically
        const saved = sessionStorage.getItem(STORAGE_KEYS.SESSION);
        if (saved) {
            try {
                const session = JSON.parse(saved);
                if (session.roomCode && session.playerName) {
                    console.log(`[Socket] Auto-rejoining room: ${session.roomCode} for ${session.playerName}`);
                    this.socket.emit('joinRoom', session.roomCode, session.playerName, (res) => {
                        if (res.success) {
                            console.log('[Socket] Auto-rejoin successful');
                            this.ui.updateRoomCode(session.roomCode);
                        } else {
                            console.warn('[Socket] Auto-rejoin failed:', res.message);
                        }
                    });
                }
            } catch (e) {
                console.error('[Socket] Failed to parse saved session for auto-rejoin:', e);
            }
        }
    }

    onToggleTimer(isEnabled) {
        if (this.isHost) {
            this.socket.emit('updateGameSettings', { timerEnabled: isEnabled }, (res) => {
                if (!res.success) this.ui.showError(res.message);
            });
        }
    }

    onTimerDurationChange(duration) {
        if (this.isHost) {
            this.socket.emit('updateGameSettings', { timerDuration: duration }, (res) => {
                if (!res.success) this.ui.showError(res.message);
            });
        }
    }

    onTimerTick(data) {
        const isCzar = this.state.gameData.currentCzarId === this.socket.getId();
        this.ui.updateTimer(data.remaining, this.state.timerEnabled, this.state.timerRunning, isCzar, this.state.phase);
    }

    // Event Handlers
    onGameState(data) {
        console.log('onGameState:', data);

        // If we just entered the playing phase, clear previous selections
        if (data.phase === 'playing' && this.state.currentPhase !== 'playing') {
            console.log('[State] New round started, clearing selection');
            this.state.selectedCards = [];
            this.ui.clearSubmissions();
        }

        this.state.update(data);
        const myId = this.socket.getId();
        this.isHost = data.players[0]?.id === myId;
        this.ui.updatePlayerList(data.players, myId);

        if (data.phase === 'lobby') {

            // Render pack selection
            if (data.availablePacks && data.selectedPacks) {
                this.ui.renderPackSelection(
                    data.availablePacks,
                    data.selectedPacks,
                    this.isHost,
                    (packId, isChecked) => this.togglePack(packId, isChecked, data.selectedPacks)
                );
            }

            // Render timer settings
            this.ui.renderTimerSettings(
                data.timerEnabled || false,
                data.timerDuration || 40,
                this.isHost,
                (enabled) => this.onToggleTimer(enabled),
                (duration) => this.onTimerDurationChange(duration)
            );
        } else if (data.gameStarted) {
            this.ui.showScreen('game');

            // Update timer display
            const isCzar = data.currentCzarId === myId;
            this.ui.updateTimer(data.timerRemaining, data.timerEnabled, data.timerRunning, isCzar, data.phase);

            if (data.currentBlackCard) {
                console.log(`[State] Current Black Card: "${data.currentBlackCard.text}", Pick: ${data.currentBlackCard.pick}`);
                this.ui.renderBlackCard(data.currentBlackCard);
            }

            const me = data.players.find(p => p.id === myId);
            if (me) {
                this.state.swapsRemaining = me.swapsRemaining;
                this.ui.updateSwapsDisplay(me.swapsRemaining);
            }

            const czar = data.players.find(p => p.id === data.currentCzarId);
            const czarName = czar ? czar.name : 'Unknown';

            // Update Info & Scoreboard
            this.ui.updateGameInfo(
                data.currentRound,
                czarName,
                isCzar,
                data.submissionCount || 0,
                data.players.length
            );

            // Mark czar in players array for scoreboard
            const playersWithCzar = data.players.map(p => ({
                ...p,
                isCzar: p.id === data.currentCzarId
            }));
            this.ui.updateScoreboard(playersWithCzar, myId);

            // Phase Logic
            const handSection = document.getElementById('playerHandSection');
            const submissionsSection = document.getElementById('submissionsSection');
            const winnerSection = document.getElementById('roundWinnerSection');
            const gameOverSection = document.getElementById('gameOverSection');
            const phaseIndicator = document.getElementById('phaseIndicator');
            const endGameBtn = document.getElementById('endGameBtn');

            // Show/hide End Game button based on host status
            const isHost = data.players[0]?.id === this.socket.getId();
            if (endGameBtn) endGameBtn.style.display = isHost ? 'inline-block' : 'none';

            // Reset visibility
            if (handSection) handSection.style.display = 'none';
            if (submissionsSection) submissionsSection.style.display = 'none';
            if (winnerSection) winnerSection.style.display = 'none';
            if (gameOverSection) gameOverSection.style.display = 'none';

            if (data.phase === 'playing') {
                if (phaseIndicator) phaseIndicator.textContent = isCzar ? 'Wait for players to submit...' : 'Pick your cards!';
                if (!isCzar && handSection) {
                    handSection.style.display = 'block';
                    // Ensure hand is rendered when phase changes to playing
                    this.ui.renderHand(this.state.hand, this.state.selectedCards, this.onCardSelect.bind(this));
                }
            } else if (data.phase === 'judging') {
                if (phaseIndicator) phaseIndicator.textContent = isCzar ? 'Pick the winner!' : 'Czar is judging...';
                if (submissionsSection) submissionsSection.style.display = 'block';
                if (data.submissions && data.submissions.length > 0) {
                    this.ui.renderSubmissions(data.submissions, isCzar, this.selectWinner.bind(this));
                }
            } else if (data.phase === 'roundEnd') {
                if (phaseIndicator) phaseIndicator.textContent = 'Round Over!';
                if (winnerSection) winnerSection.style.display = 'block';
                if (data.roundWinner) {
                    const winner = data.players.find(p => p.id === data.roundWinner);
                    document.getElementById('winnerSubmission').textContent = `${winner ? winner.name : 'Someone'} won!`;
                }
            } else if (data.phase === 'gameOver') {
                if (gameOverSection) gameOverSection.style.display = 'flex';
                if (data.winner && data.leaderboard) {
                    this.ui.renderGameOver(data.winner, data.leaderboard);
                }
            }
        }
    }

    togglePack(packId, isChecked, currentSelectedPacks) {
        let newPacks = [...currentSelectedPacks];
        if (isChecked) {
            if (!newPacks.includes(packId)) newPacks.push(packId);
        } else {
            newPacks = newPacks.filter(id => id !== packId);
        }

        this.socket.emit('updateGameSettings', { packs: newPacks }, (res) => {
            if (!res.success) this.ui.showError(res.message);
        });
    }

    onHandUpdate(hand) {
        console.log('[Hand] Received hand update:', hand);
        console.log('[Hand] Card IDs:', hand.map(c => c.id));
        this.state.hand = hand;
        this.ui.renderHand(hand, this.state.selectedCards, this.onCardSelect.bind(this));
    }

    onCardSelect(cardId) {
        if (cardId === undefined || cardId === null) return;

        const idStr = String(cardId);
        const pickCount = this.state.pickCount;

        console.log(`[Selection] Card: ${idStr}, Type: ${typeof cardId}, PickCount: ${pickCount}`);
        console.log(`[Selection] Current selected:`, this.state.selectedCards);

        // Selection logic
        if (this.state.selectedCards.includes(idStr)) {
            // Deselect if already selected
            console.log(`[Selection] Deselecting ${idStr}`);
            this.state.selectedCards = this.state.selectedCards.filter(id => id !== idStr);
        } else {
            if (pickCount === 1) {
                // Auto-replace for single pick
                console.log(`[Selection] Auto-replacing with ${idStr}`);
                this.state.selectedCards = [idStr];
            } else {
                // Add if under limit for multi-pick
                if (this.state.selectedCards.length < pickCount) {
                    console.log(`[Selection] Adding ${idStr}`);
                    this.state.selectedCards.push(idStr);
                } else {
                    console.log(`[Selection] Limit reached (${pickCount})`);
                }
            }
        }
        this.ui.renderHand(this.state.hand, this.state.selectedCards, this.onCardSelect.bind(this));
    }

    getRandomName() {
        const adjectives = [
            'Angry', 'Happy', 'Lucky', 'Cute', 'Dissapointed', 'Sleepy',
            'Hungry', 'Brave', 'Silly', 'Grumpy', 'Fancy', 'Wild'
        ];
        const animals = [
            'Llama', 'Giraffe', 'Dog', 'Fox', 'Cat', 'Panda',
            'Penguin', 'Koala', 'Tiger', 'Lion', 'Bear', 'Rabbit'
        ];

        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];

        return `${adj} ${animal}`;
    }

    onSubmissions(submissions) {
        const isCzar = this.state.gameData?.currentCzarId === this.socket.getId();
        this.ui.renderSubmissions(submissions, isCzar, this.selectWinner.bind(this));
    }

    selectWinner(playerId) {
        this.socket.emit('selectWinner', playerId, (res) => {
            if (res.success) {
                if (res.gameOver) {
                    this.ui.renderGameOver(res.winner, res.leaderboard);
                }
            } else {
                this.ui.showError(res.message);
            }
        });
    }

    onRoundWinner(data) {
        // Show winner UI
        console.log('Round winner:', data);
        if (data.gameOver) {
            this.ui.renderGameOver(data.winner, data.leaderboard);
            return; // Don't show round winner section when game is over
        }

        const winnerSection = document.getElementById('roundWinnerSection');
        const winnerSubmission = document.getElementById('winnerSubmission');
        const nextRoundBtn = document.getElementById('nextRoundBtn');

        if (winnerSection && winnerSubmission) {
            winnerSection.style.display = 'block';

            // Find winner name from players list or data
            const winnerName = data.winner ? data.winner.name : 'Unknown';

            // Format winning cards
            const winningCardsText = data.submissions
                .find(s => s.playerId === data.winnerId)
                ?.cards.map(c => c.text).join(' + ') || '';

            winnerSubmission.innerHTML = `
                <div class="winner-name">${winnerName} wins!</div>
                <div class="winner-cards">${winningCardsText}</div>
            `;

            nextRoundBtn.onclick = () => {
                this.socket.emit('nextRound', (res) => {
                    if (!res.success) this.ui.showError(res.message);
                });
            };
        }
    }

    // Session Management
    saveSession(roomCode, playerName) {
        try {
            const session = {
                roomCode,
                playerName,
                timestamp: Date.now()
            };
            sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        } catch (e) {
            console.error('Failed to save session:', e);
        }
    }

    checkSession() {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEYS.SESSION);
            if (saved) {
                const session = JSON.parse(saved);
                // Basic validation
                if (session.roomCode && session.playerName) {
                    console.log('Restoring session:', session);
                    this.state.playerName = session.playerName;
                    this.state.roomCode = session.roomCode;

                    // Auto-join
                    this.socket.emit('joinRoom', session.roomCode, session.playerName, (res) => {
                        if (res.success) {
                            this.ui.showScreen('lobby');
                            this.ui.updateRoomCode(session.roomCode);
                        } else {
                            // Session invalid, clear it
                            sessionStorage.removeItem(STORAGE_KEYS.SESSION);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Failed to restore session:', e);
        }
    }
}

// Initialize
console.log('Starting App initialization...');
try {
    const app = new App();
    window.app = app;
    console.log('App initialized successfully, attached to window.app');
} catch (error) {
    console.error('CRITICAL: App initialization failed:', error);
}
