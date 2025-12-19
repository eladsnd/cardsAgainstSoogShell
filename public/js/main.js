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
        document.getElementById('leaveGameBtn').onclick = () => this.leaveGame();

        // Socket Events
        this.socket.on('gameState', (data) => this.onGameState(data));
        this.socket.on('yourHand', (hand) => this.onHandUpdate(hand));
        this.socket.on('playerJoined', (data) => console.log('Player joined:', data));
        this.socket.on('playerLeft', (data) => console.log('Player left:', data));
        this.socket.on('roundWinner', (data) => this.onRoundWinner(data));
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
        const name = document.getElementById('playerNameInput').value.trim();
        if (!name) return this.ui.showError('Enter name');

        this.state.playerName = name;
        this.socket.emit('createRoom', name, (res) => {
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
        const name = document.getElementById('playerNameInput').value.trim();

        if (!name || !code) return this.ui.showError('Enter name and code');

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
        if (this.state.selectedCards.length !== this.state.pickCount) {
            return this.ui.showError(`Select ${this.state.pickCount} cards`);
        }
        this.socket.emit('submitCards', this.state.selectedCards, (res) => {
            if (res.success) {
                this.state.selectedCards = [];
                this.ui.renderHand(this.state.hand, [], this.onCardSelect.bind(this));
            } else {
                this.ui.showError(res.message);
            }
        });
    }

    leaveGame() {
        if (confirm('Leave game?')) {
            this.socket.emit('leaveGame');
            sessionStorage.removeItem(STORAGE_KEYS.SESSION);
            location.reload();
        }
    }

    // Event Handlers
    onGameState(data) {
        this.state.update(data);
        this.ui.updatePlayerList(data.players);

        if (data.gameStarted) {
            this.ui.showScreen('game');
            this.ui.renderBlackCard(data.currentBlackCard);

            const myId = this.socket.getId();
            const isCzar = data.currentCzarId === myId;
            const czar = data.players.find(p => p.id === data.currentCzarId);
            const czarName = czar ? czar.name : 'Unknown';

            // Update Info & Scoreboard
            this.ui.updateGameInfo(data.currentRound, czarName, isCzar);

            // Mark czar in players array for scoreboard
            const playersWithCzar = data.players.map(p => ({
                ...p,
                isCzar: p.id === data.currentCzarId
            }));
            this.ui.updateScoreboard(playersWithCzar);

            // Phase Logic
            const handSection = document.getElementById('playerHandSection');
            const submissionsSection = document.getElementById('submissionsSection');
            const winnerSection = document.getElementById('roundWinnerSection');
            const gameOverSection = document.getElementById('gameOverSection');
            const phaseIndicator = document.getElementById('phaseIndicator');

            // Reset visibility
            handSection.style.display = 'none';
            submissionsSection.style.display = 'none';
            winnerSection.style.display = 'none';
            gameOverSection.style.display = 'none';

            if (data.phase === 'playing') {
                phaseIndicator.textContent = isCzar ? 'Wait for players to submit...' : 'Pick your cards!';
                if (!isCzar) {
                    handSection.style.display = 'block';
                }
            } else if (data.phase === 'judging') {
                phaseIndicator.textContent = isCzar ? 'Pick the winner!' : 'Czar is judging...';
                submissionsSection.style.display = 'block';
                // Note: Submissions are rendered via separate socket event or if included in gameState
            } else if (data.phase === 'roundEnd') {
                phaseIndicator.textContent = 'Round Over!';
                winnerSection.style.display = 'block';
                // Render winner info if available
                if (data.roundWinner) {
                    const winner = data.players.find(p => p.id === data.roundWinner);
                    document.getElementById('winnerSubmission').textContent = `${winner ? winner.name : 'Someone'} won!`;
                }
            }
        }
    }

    onHandUpdate(hand) {
        this.state.hand = hand;
        this.ui.renderHand(hand, this.state.selectedCards, this.onCardSelect.bind(this));
    }

    onCardSelect(cardId) {
        // Selection logic
        if (this.state.selectedCards.includes(cardId)) {
            this.state.selectedCards = this.state.selectedCards.filter(id => id !== cardId);
        } else {
            if (this.state.selectedCards.length < this.state.pickCount) {
                this.state.selectedCards.push(cardId);
            }
        }
        this.ui.renderHand(this.state.hand, this.state.selectedCards, this.onCardSelect.bind(this));
    }

    onRoundWinner(data) {
        // Show winner UI
        console.log('Round winner:', data);
        // Could show a modal or toast here
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
