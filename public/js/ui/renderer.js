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
            qrCodeContainer: document.getElementById('qrCodeContainer'),
            swapsRemaining: document.getElementById('swapsRemainingDisplay'),
            swapCardsBtn: document.getElementById('swapCardsBtn'),
            timerDisplay: document.getElementById('timerDisplay'),
            timerSeconds: document.getElementById('timerSeconds'),
            toggleTimerBtn: document.getElementById('toggleTimerBtn'),
            tradeBlackCardBtn: document.getElementById('tradeBlackCardBtn'),
        };
        this.isFloating = false;
        this.playerColor = null; // Will be set when game state is received
        this.initPersistentTimer();
        console.log('Renderer initialized. Screens:', this.screens);
    }

    initPersistentTimer() {
        window.addEventListener('scroll', () => {
            if (!this.elements.timerDisplay) return;

            // If we are scrolled down more than 50px, float the timer
            const shouldFloat = window.scrollY > 50;

            if (shouldFloat !== this.isFloating) {
                this.isFloating = shouldFloat;
                this.elements.timerDisplay.classList.toggle('floating', this.isFloating);
            }
        });
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
        this.elements.errorMessage.style.display = 'block';
        setTimeout(() => {
            this.elements.errorMessage.style.display = 'none';
        }, duration);
    }

    updateRoomCode(code) {
        this.elements.displayRoomCode.textContent = code;
    }

    updatePlayerList(players, myId) {
        // Update player count span
        const countSpan = document.getElementById('playerCount');
        if (countSpan) countSpan.textContent = players.length;

        this.elements.playerList.innerHTML = players.map(p => `
            <div class="player-item ${p.connected ? '' : 'disconnected'}">
                ${p.color ? `<span class="player-color-dot" style="background-color: ${p.color}; box-shadow: 0 0 8px ${p.color}, 0 0 12px ${p.color};"></span>` : ''}
                <span class="player-name">${p.name} ${p.id === myId ? '<span class="you-indicator">(YOU)</span>' : ''}</span>
                <span class="player-score">${p.score} 🏆</span>
            </div>
        `).join('');

        // Update "Need at least 2 players" message
        const startBtn = document.getElementById('startGameBtn');
        const subtitle = startBtn?.nextElementSibling;
        if (subtitle && subtitle.classList.contains('subtitle')) {
            if (players.length >= 2) {
                subtitle.style.display = 'none';
                startBtn.disabled = false;
            } else {
                subtitle.style.display = 'block';
                startBtn.disabled = true;
            }
        }
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

    updateTradeButton(isCzar, phase, blackCardTraded) {
        if (this.elements.tradeBlackCardBtn) {
            // Show only if Czar, playing phase, and hasn't traded yet
            const showButton = isCzar && phase === 'playing' && !blackCardTraded;
            this.elements.tradeBlackCardBtn.style.display = showButton ? 'block' : 'none'; // changed to block/flex in CSS, use block or inherit
            // match typical display style from CSS if needed, or just block
        }
    }

    setPlayerColor(color) {
        this.playerColor = color;
        console.log('[Renderer] Player color set to:', color);
    }

    markCardsAsSubmitted(cardIds) {
        if (!this.playerColor) {
            console.warn('[Renderer] Cannot mark cards as submitted - no player color set');
            return;
        }

        const handContainer = this.elements.playerHand;
        if (!handContainer) return;

        // Find all card elements and transform selected -> submitted with player color
        const cardElements = handContainer.querySelectorAll('.card');
        cardElements.forEach(cardEl => {
            const cardId = cardEl.dataset.cardId;
            if (cardIds.includes(cardId)) {
                // Remove blue selection, add submitted class with player color
                cardEl.classList.remove('selected');
                cardEl.classList.add('submitted');
                cardEl.style.border = `4px solid ${this.playerColor}`;
                cardEl.style.boxShadow = `0 0 20px ${this.playerColor}`;
                console.log(`[Renderer] Card ${cardId} marked as submitted with color ${this.playerColor}`);
            }
        });
    }

    clearSubmittedCards() {
        const handContainer = this.elements.playerHand;
        if (!handContainer) return;

        const cardElements = handContainer.querySelectorAll('.card.submitted');
        cardElements.forEach(cardEl => {
            cardEl.classList.remove('submitted');
            cardEl.style.borderColor = '';
            cardEl.style.boxShadow = '';
        });
    }

    updateScoreboard(players, myId) {
        this.elements.scoreboard.innerHTML = players.map(p => `
            <div class="score-item ${p.id === p.currentCzarId ? 'czar' : ''} ${p.id === myId ? 'me' : ''}">
                ${p.color ? `<span class="player-color-dot" style="background-color: ${p.color}; box-shadow: 0 0 8px ${p.color}, 0 0 12px ${p.color};"></span>` : ''}
                <span class="name">${p.name} ${p.id === myId ? '<span class="you-indicator">(YOU)</span>' : ''}</span>
                <span class="score">${p.score}</span>
            </div>
        `).join('');
    }

    renderBlackCard(card) {
        if (!card) return;

        const text = card.text.replace(/_/g, '____');
        const pickText = `(PICK ${card.pick || 1})`;

        this.elements.blackCard.innerHTML = `
            <div class="card-text">${text}</div>
            <div class="card-pick">${pickText}</div>
        `;

        this.applyTextDirection(this.elements.blackCard.querySelector('.card-text'), text);
    }

    renderHand(cards, selectedIds = [], onSelect, submittedCardIds = []) {
        // Before clearing, save submitted card styling info
        const submittedCards = [];
        if (this.elements.playerHand) {
            const existingSubmitted = this.elements.playerHand.querySelectorAll('.card.submitted');
            existingSubmitted.forEach(cardEl => {
                submittedCards.push({
                    id: cardEl.dataset.cardId,
                    border: cardEl.style.border,
                    boxShadow: cardEl.style.boxShadow
                });
            });
        }

        this.elements.playerHand.innerHTML = '';

        // Ensure selectedIds is an array of strings
        const safeSelectedIds = (Array.isArray(selectedIds) ? selectedIds : []).map(id => String(id));
        console.log(`[Renderer] Rendering hand. Selected IDs:`, safeSelectedIds);

        cards.forEach(card => {
            const cardIdStr = String(card.id);
            // Check if this card was previously submitted
            const wasSubmitted = submittedCards.find(sc => sc.id === cardIdStr);

            // Robust selection check: cardIdStr must be present in safeSelectedIds
            const isSelected = card.id !== undefined && card.id !== null && safeSelectedIds.includes(cardIdStr);
            console.log(`[Renderer] Card: ${cardIdStr}, isSelected: ${isSelected}, wasSubmitted: ${!!wasSubmitted}`);
            const selectedIndex = isSelected ? safeSelectedIds.indexOf(cardIdStr) : -1;

            const el = document.createElement('div');
            el.className = `card white small ${isSelected ? 'selected' : ''} ${wasSubmitted ? 'submitted' : ''}`;
            el.dataset.cardId = cardIdStr; // CRITICAL: Set card ID for markCardsAsSubmitted

            // Restore submitted styling if this card was previously submitted
            if (wasSubmitted) {
                el.style.border = wasSubmitted.border;
                el.style.boxShadow = wasSubmitted.boxShadow;
            }

            // Add selection order badge if multi-pick
            let badgeHtml = '';
            if (isSelected && safeSelectedIds.length > 1) {
                badgeHtml = `<div class="selection-badge">${selectedIndex + 1}</div>`;
            }

            el.innerHTML = `
                ${badgeHtml}
                <div class="card-text">${card.text}</div>
            `;

            this.applyTextDirection(el.querySelector('.card-text'), card.text);

            el.onclick = () => onSelect(cardIdStr);
            this.elements.playerHand.appendChild(el);
        });

        // Update Swap Button State
        if (this.elements.swapCardsBtn) {
            const canSwap = selectedIds.length > 0 && selectedIds.length <= 3;
            this.elements.swapCardsBtn.disabled = !canSwap;
        }
    }

    updateSwapsDisplay(count) {
        if (this.elements.swapsRemaining) {
            this.elements.swapsRemaining.textContent = `Swaps left: ${count}`;
        }
    }

    renderSubmissions(submissions, isCzar, onSelectWinner) {
        const grid = this.elements.submissions;
        const section = document.getElementById('submissionsSection');
        const label = section?.querySelector('.white-cards-label');

        if (label) {
            label.textContent = isCzar ? 'Pick the Funniest Answer!' : 'Submissions';
        }

        grid.innerHTML = '';

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

                // Add "Pick this" indicator
                const indicator = document.createElement('div');
                indicator.className = 'pick-indicator';
                indicator.textContent = 'PICK THIS';
                indicator.style.textAlign = 'center';
                indicator.style.fontSize = '0.8rem';
                indicator.style.fontWeight = '800';
                indicator.style.color = 'var(--accent-blue)';
                indicator.style.marginTop = '0.5rem';
                indicator.style.opacity = '0';
                indicator.style.transition = 'opacity 0.2s';
                group.appendChild(indicator);

                group.onmouseenter = () => indicator.style.opacity = '1';
                group.onmouseleave = () => indicator.style.opacity = '0';
                group.onclick = () => onSelectWinner(sub.playerId);
            }

            this.elements.submissions.appendChild(group);
        });
    }

    clearSubmissions() {
        if (this.elements.submissions) {
            this.elements.submissions.innerHTML = '';
        }
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
            div.className = `pack-item${isSelected ? ' selected' : ''}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isSelected;
            checkbox.disabled = !isHost;
            checkbox.id = `pack-${pack.id}`;

            if (isHost) {
                div.onclick = (e) => {
                    // Prevent any accidental double-firing if checkbox was clicked
                    if (e.target === checkbox) return;

                    const nextState = !checkbox.checked;
                    checkbox.checked = nextState;
                    onToggle(pack.id, nextState);
                };

                // Still allow checkbox change (e.g. from keyboard)
                checkbox.onchange = (e) => {
                    onToggle(pack.id, checkbox.checked);
                };
            }

            const label = document.createElement('span'); // Use span instead of label with htmlFor to avoid double toggle
            const packIcon = pack.id.startsWith('deck_') ? '📁 ' : '📦 ';
            label.textContent = packIcon + pack.name;
            label.style.cursor = isHost ? 'pointer' : 'default';

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });

        // Add Deck Info
        if (this.elements.deckInfo && selectedIds.length > 0) {
            this.elements.deckInfo.style.display = 'block';
            const blackCount = packs
                .filter(p => selectedIds.includes(p.id))
                .reduce((sum, p) => sum + (p.blackCount || (p.black ? p.black.length : 0) || 0), 0);
            const whiteCount = packs
                .filter(p => selectedIds.includes(p.id))
                .reduce((sum, p) => sum + (p.whiteCount || (p.white ? p.white.length : 0) || 0), 0);

            this.elements.deckInfo.innerHTML = `
                <span>📊</span>
                <div>
                    <strong>Total Loaded:</strong> ${blackCount} Black / ${whiteCount} White
                </div>
            `;
        } else if (this.elements.deckInfo) {
            this.elements.deckInfo.style.display = 'none';
        }
    }

    renderWinningScore(score, isHost, onScoreChange) {
        const input = this.elements.winningScoreInput;
        if (!input) return;

        input.value = score;
        input.disabled = !isHost;

        if (isHost) {
            input.onchange = () => onScoreChange(input.value);
        }
    }

    renderTimerSettings(isEnabled, duration, isHost, onToggle, onDurationChange) {
        const toggle = document.getElementById('timerToggle');
        const durationInput = document.getElementById('timerDurationInput');
        const durationContainer = document.getElementById('timerDurationContainer');

        if (toggle) {
            toggle.disabled = !isHost;
            if (toggle.checked !== isEnabled) {
                toggle.checked = isEnabled;
            }
            toggle.onchange = () => {
                const checked = toggle.checked;
                if (durationContainer) durationContainer.style.display = checked ? 'flex' : 'none';
                onToggle(checked);
            };
        }

        if (durationInput) {
            durationInput.disabled = !isHost;
            if (durationInput.value !== String(duration)) {
                durationInput.value = duration;
            }
            durationInput.onchange = () => {
                const val = parseInt(durationInput.value);
                if (!isNaN(val)) onDurationChange(val);
            };
        }

        if (durationContainer) {
            durationContainer.style.display = isEnabled ? 'flex' : 'none';
        }
    }

    updateTimer(remaining, enabled, running, isCzar, phase) {
        if (!this.elements.timerDisplay) return;

        if (!enabled || (phase !== 'playing' && phase !== 'judging')) {
            this.elements.timerDisplay.style.display = 'none';
            return;
        }

        // Only show if playing phase (judging phase timer is removed as requested, 
        // but we'll keep the display hidden for it)
        if (phase !== 'playing') {
            this.elements.timerDisplay.style.display = 'none';
            return;
        }

        this.elements.timerDisplay.style.display = 'flex';
        this.elements.timerSeconds.textContent = remaining;

        // Apply not-czar class for floating opacity if needed
        this.elements.timerDisplay.classList.toggle('not-czar', !isCzar);

        // Toggle button visibility and icon
        if (this.elements.toggleTimerBtn) {
            this.elements.toggleTimerBtn.style.display = isCzar ? 'flex' : 'none';
            this.elements.toggleTimerBtn.textContent = running ? '⏸️' : '▶️';
            this.elements.toggleTimerBtn.title = running ? 'Pause Timer' : 'Start Timer';
        }

        // Visual warning if time is low
        if (remaining <= 10 && running) {
            this.elements.timerDisplay.classList.add('warning');
        } else {
            this.elements.timerDisplay.classList.remove('warning');
        }
    }

    renderGameOver(winner, leaderboard) {
        const section = document.getElementById('gameOverSection');
        const winnerName = document.getElementById('gameWinnerName');

        if (section && winnerName) {
            section.style.display = 'flex';
            winnerName.textContent = `${winner.name} Won the Game!`;

            // Render Leaderboard
            if (leaderboard) {
                const leaderboardHtml = `
                    <div class="leaderboard">
                        <h4>Final Standings</h4>
                        ${leaderboard.map((p, i) => `
                            <div class="leaderboard-item ${i === 0 ? 'winner' : ''}">
                                <span class="rank">#${i + 1}</span>
                                <span class="name">${p.name}</span>
                                <span class="score">${p.score} pts</span>
                            </div>
                        `).join('')}
                    </div>
                `;

                // Find or create leaderboard container
                let container = document.getElementById('leaderboardContainer');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'leaderboardContainer';
                    winnerName.after(container);
                }
                container.innerHTML = leaderboardHtml;
            }

            // Re-bind Back to Home button (in case it wasn't bound at page load)
            const newGameBtn = document.getElementById('newGameBtn');
            if (newGameBtn) {
                console.log('[UI] Binding newGameBtn click handler');
                newGameBtn.onclick = (e) => {
                    console.log('[UI] Back to Home clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    // Clear session storage like leaveGame does
                    sessionStorage.clear();
                    location.reload();
                };
            } else {
                console.error('[UI] newGameBtn not found!');
            }
        }
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
