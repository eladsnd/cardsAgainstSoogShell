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
            blackCard: document.getElementById('blackCardDisplay'),
            playerHand: document.getElementById('playerHand'),
            submissions: document.getElementById('submissionsGrid'),
            roundInfo: document.getElementById('roundNumber'),
            czarInfo: document.getElementById('czarIndicator'),
            gameStatus: document.getElementById('gameStatus'),
            scoreboard: document.getElementById('scoreboard'),
            errorMessage: document.getElementById('errorMessage'),
            displayRoomCode: document.getElementById('displayRoomCode'),
            qrCodeContainer: document.getElementById('qrCodeContainer')
        };
        console.log('Renderer initialized. Screens:', this.screens);
    }

    showScreen(screenName) {
        console.log('Showing screen:', screenName);
        Object.values(this.screens).forEach(s => {
            if (s) s.classList.remove('active');
        });

        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            console.log('Activated screen:', this.screens[screenName]);
        } else {
            console.error('Screen not found:', screenName);
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

    updateGameInfo(round, czarName, isCzar, submissionCount, totalPlayers) {
        this.elements.roundInfo.textContent = `Round ${round}`;

        const subText = `Submissions: ${submissionCount}/${totalPlayers - 1}`;
        this.elements.czarInfo.textContent = `Czar: ${czarName} ${isCzar ? '(YOU)' : ''} | ${subText}`;

        if (isCzar) {
            this.elements.czarInfo.classList.add('highlight');
        } else {
            this.elements.czarInfo.classList.remove('highlight');
        }
    }

    updateScoreboard(players) {
        this.elements.scoreboard.innerHTML = players.map(p => `
            <div class="score-item ${p.id === p.currentCzarId ? 'czar' : ''}">
                <span class="name">${p.name}</span>
                <span class="score">${p.score}</span>
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

    renderPackSelection(packs, selectedIds, isHost, onToggle) {
        const container = document.getElementById('packList');
        const section = document.getElementById('gameSettingsSection');

        if (!container || !section) return;

        section.style.display = 'block';
        container.innerHTML = '';

        packs.forEach(pack => {
            const isSelected = selectedIds.includes(pack.id);
            const div = document.createElement('div');
            div.className = 'pack-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isSelected;
            checkbox.disabled = !isHost;
            checkbox.id = `pack-${pack.id}`;

            if (isHost) {
                checkbox.onchange = () => onToggle(pack.id, checkbox.checked);
                div.onclick = (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                        onToggle(pack.id, checkbox.checked);
                    }
                };
            }

            const label = document.createElement('label');
            label.htmlFor = `pack-${pack.id}`;
            label.textContent = pack.name;
            label.style.cursor = isHost ? 'pointer' : 'default';

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
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
