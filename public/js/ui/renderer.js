/**
 * UI Renderer
 * Handles all DOM manipulation
 */

import { GAME_PHASES, UNICODE_RANGES } from '../../constants.js';

export class UIRenderer {
    constructor() {
        this.screens = {
            home: document.getElementById('homeScreen'),
            lobby: document.getElementById('lobbyScreen'),
            game: document.getElementById('gameScreen'),
            creator: document.getElementById('creatorScreen')
        };

        this.elements = {
            playerList: document.getElementById('playerList'),
            blackCard: document.getElementById('blackCard'),
            playerHand: document.getElementById('playerHand'),
            submissions: document.getElementById('submissions'),
            roundInfo: document.getElementById('roundInfo'),
            czarInfo: document.getElementById('czarInfo'),
            gameStatus: document.getElementById('gameStatus'),
            scoreboard: document.getElementById('scoreboard'),
            errorMessage: document.getElementById('errorMessage'),
            displayRoomCode: document.getElementById('displayRoomCode'),
            qrCodeContainer: document.getElementById('qrCodeContainer') // New
        };
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }

    showError(message, duration = 4000) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.add('show');
        setTimeout(() => {
            this.elements.errorMessage.classList.remove('show');
        }, duration);
    }

    updateRoomCode(code) {
        this.elements.displayRoomCode.textContent = code;
    }

    updatePlayerList(players) {
        this.elements.playerList.innerHTML = players.map(p => `
            <div class="player-item ${p.connected ? '' : 'disconnected'}">
                <span class="player-name">${p.name}</span>
                <span class="player-score">${p.score} 🏆</span>
            </div>
        `).join('');
    }

    renderBlackCard(card) {
        if (!card) return;

        const text = card.text.replace(/_/g, '____');
        const pickText = card.pick > 1 ? `(PICK ${card.pick})` : '';

        this.elements.blackCard.innerHTML = `
            <div class="card-text">${text}</div>
            <div class="card-pick">${pickText}</div>
        `;

        this.applyTextDirection(this.elements.blackCard.querySelector('.card-text'), text);
    }

    renderHand(cards, selectedIds = [], onSelect) {
        this.elements.playerHand.innerHTML = '';

        cards.forEach(card => {
            const el = document.createElement('div');
            el.className = `card white small ${selectedIds.includes(card.id) ? 'selected' : ''}`;
            el.innerHTML = `<div class="card-text">${card.text}</div>`;

            this.applyTextDirection(el.querySelector('.card-text'), card.text);

            el.onclick = () => onSelect(card.id);
            this.elements.playerHand.appendChild(el);
        });
    }

    renderSubmissions(submissions, isCzar, onSelectWinner) {
        this.elements.submissions.innerHTML = '';

        submissions.forEach(sub => {
            const group = document.createElement('div');
            group.className = 'submission-group';

            sub.cards.forEach(card => {
                const el = document.createElement('div');
                el.className = 'card white small';
                el.innerHTML = `<div class="card-text">${card.text}</div>`;
                this.applyTextDirection(el.querySelector('.card-text'), card.text);
                group.appendChild(el);
            });

            if (isCzar) {
                group.classList.add('clickable');
                group.onclick = () => onSelectWinner(sub.playerId);
            }

            this.elements.submissions.appendChild(group);
        });
    }

    applyTextDirection(element, text) {
        if (UNICODE_RANGES.HEBREW.test(text)) {
            element.classList.add('rtl');
            element.dir = 'rtl';
        } else {
            element.classList.remove('rtl');
            element.dir = 'ltr';
        }
    }

    // New: Render QR Code
    renderQRCode(url) {
        if (this.elements.qrCodeContainer && window.QRCode) {
            this.elements.qrCodeContainer.innerHTML = '';
            new QRCode(this.elements.qrCodeContainer, {
                text: url,
                width: 128,
                height: 128
            });
        }
    }
}
