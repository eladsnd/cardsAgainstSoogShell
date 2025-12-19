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
        this.socket.on('submissions', (data) => this.onSubmissions(data));
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
        console.log('onGameState:', data);
        this.state.update(data);
        this.ui.updatePlayerList(data.players);

        if (data.phase === 'lobby') {
            // Determine if I am the host (first player)
            const isHost = data.players[0]?.id === this.socket.getId();

            // Render pack selection
            if (data.availablePacks && data.selectedPacks) {
                this.ui.renderPackSelection(
                    data.availablePacks,
                    data.selectedPacks,
                    isHost,
                    (packId, isChecked) => this.togglePack(packId, isChecked, data.selectedPacks)
                );
            }
        } else if (data.gameStarted) {
            this.ui.showScreen('game');
            this.ui.renderBlackCard(data.currentBlackCard);

            const myId = this.socket.getId();
            const isCzar = data.currentCzarId === myId;
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
            this.ui.updateScoreboard(playersWithCzar);

            // Phase Logic
            const handSection = document.getElementById('playerHandSection');
            const submissionsSection = document.getElementById('submissionsSection');
            const winnerSection = document.getElementById('roundWinnerSection');
            const gameOverSection = document.getElementById('gameOverSection');
            const phaseIndicator = document.getElementById('phaseIndicator');

            // Reset visibility
            if (handSection) handSection.style.display = 'none';
            if (submissionsSection) submissionsSection.style.display = 'none';
            if (winnerSection) winnerSection.style.display = 'none';
            if (gameOverSection) gameOverSection.style.display = 'none';

            if (data.phase === 'playing') {
                if (phaseIndicator) phaseIndicator.textContent = isCzar ? 'Wait for players to submit...' : 'Pick your cards!';
                if (!isCzar && handSection) {
                    handSection.style.display = 'block';
                }
            } else if (data.phase === 'judging') {
                if (phaseIndicator) phaseIndicator.textContent = isCzar ? 'Pick the winner!' : 'Czar is judging...';
                if (submissionsSection) submissionsSection.style.display = 'block';
            } else if (data.phase === 'roundEnd') {
                if (phaseIndicator) phaseIndicator.textContent = 'Round Over!';
                if (winnerSection) winnerSection.style.display = 'block';
                if (data.roundWinner) {
                    const winner = data.players.find(p => p.id === data.roundWinner);
                    document.getElementById('winnerSubmission').textContent = `${winner ? winner.name : 'Someone'} won!`;
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

    onSubmissions(submissions) {
        // Only Czar receives this
        this.ui.renderSubmissions(submissions, true, this.selectWinner.bind(this));
    }

    selectWinner(playerId) {
        if (confirm('Select this as the winner?')) {
            this.socket.emit('selectWinner', playerId, (res) => {
                if (!res.success) this.ui.showError(res.message);
            });
        }
    }

    onRoundWinner(data) {
        // Show winner UI
        console.log('Round winner:', data);

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

            // Only Czar can click next round
            const myId = this.socket.getId();
            // We need to know who the NEW czar is, or if the current user WAS the czar.
            // For simplicity, let anyone click next round for now, or check if we are the czar of the COMPLETED round.
            // Better: The server rotates the Czar at the START of the new round.
            // So for "Next Round" button, anyone can click it to trigger the server.

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
