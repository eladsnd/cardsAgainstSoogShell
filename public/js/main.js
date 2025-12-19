/**
 * Main Application Entry Point
 */

import { socketClient } from './utils/socket-client.js';
import { UIRenderer } from './ui/renderer.js';
import { GameState } from './game/state.js';
import { STORAGE_KEYS } from '../constants.js';

class App {
    constructor() {
        this.ui = new UIRenderer();
        this.state = new GameState();
        this.socket = socketClient;

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
            const ipDisplay = document.createElement('div');
            ipDisplay.className = 'local-ip-display';
            ipDisplay.innerHTML = `Join at: <strong>${data.url}</strong>`;
            document.querySelector('.container').prepend(ipDisplay);
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
            localStorage.removeItem(STORAGE_KEYS.SESSION);
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

            // Update UI based on phase
            // ... (Add phase logic here)
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
        // Show winner overlay
        alert(`Winner: ${data.winner.name}`);
    }

    saveSession(room, name) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({
            roomCode: room,
            playerName: name,
            timestamp: Date.now()
        }));
    }

    checkSession() {
        // Restore session logic
    }
}

// Initialize
window.app = new App();
