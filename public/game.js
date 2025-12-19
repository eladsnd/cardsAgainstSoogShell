// Client-side game logic
const socket = io();

let currentRoomCode = null;
let playerName = null;
let gameState = null;
let playerHand = [];
let selectedCards = [];

// Session persistence
const SESSION_KEY = 'cardsAgainstSoogSession';

/**
 * Save current session to localStorage
 * @returns {boolean} Success status
 */
function saveSession() {
    try {
        if (!currentRoomCode || !playerName) {
            console.warn('Cannot save session: missing room code or player name');
            return false;
        }

        localStorage.setItem(SESSION_KEY, JSON.stringify({
            roomCode: currentRoomCode,
            playerName: playerName,
            timestamp: Date.now()
        }));
        return true;
    } catch (error) {
        console.error('Failed to save session:', error);
        showError('Failed to save your session. Please check browser settings.');
        return false;
    }
}

/**
 * Load saved session from localStorage
 * @returns {Object|null} Session data or null
 */
function loadSession() {
    try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
            const session = JSON.parse(saved);
            // Only restore if session is less than 1 hour old
            if (Date.now() - session.timestamp < 3600000) {
                return session;
            }
        }
    } catch (error) {
        console.error('Failed to load session:', error);
    }
    return null;
}

/**
 * Clear saved session from localStorage
 */
function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (error) {
        console.error('Failed to clear session:', error);
    }
}

// Try to restore session on page load
const savedSession = loadSession();
if (savedSession) {
    playerName = savedSession.playerName;
    currentRoomCode = savedSession.roomCode;


    // Attempt to rejoin
    socket.emit('joinRoom', savedSession.roomCode, savedSession.playerName, (response) => {
        if (response.success) {
            displayRoomCode.textContent = savedSession.roomCode;
            playerNameInput.value = savedSession.playerName;
            // gameState event will determine which screen to show
        } else {
            // Failed to rejoin, clear session and stay on home
            clearSession();
            currentRoomCode = null;
            playerName = null;
        }
    });
}


// DOM Elements
const homeScreen = document.getElementById('homeScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');

const playerNameInput = document.getElementById('playerNameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const errorMessage = document.getElementById('errorMessage');

const displayRoomCode = document.getElementById('displayRoomCode');
const playerList = document.getElementById('playerList');
const playerCount = document.getElementById('playerCount');
const startGameBtn = document.getElementById('startGameBtn');

const blackCardDisplay = document.getElementById('blackCardDisplay');
const roundNumber = document.getElementById('roundNumber');
const czarIndicator = document.getElementById('czarIndicator');
const scoreboard = document.getElementById('scoreboard');
const phaseIndicator = document.getElementById('phaseIndicator');
const gameStatus = document.getElementById('gameStatus');
const playerHandSection = document.getElementById('playerHandSection');
const playerHandEl = document.getElementById('playerHand');
const submissionsSection = document.getElementById('submissionsSection');
const submissionsGrid = document.getElementById('submissionsGrid');
const roundWinnerSection = document.getElementById('roundWinnerSection');
const winnerSubmission = document.getElementById('winnerSubmission');
const nextRoundBtn = document.getElementById('nextRoundBtn');
const gameOverSection = document.getElementById('gameOverSection');
const gameWinnerName = document.getElementById('gameWinnerName');
const newGameBtn = document.getElementById('newGameBtn');

// Utility functions
function showScreen(screen) {
    [homeScreen, lobbyScreen, gameScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 4000);
}

/**
 * Validate player name input
 * @param {string} name - Player name to validate
 * @returns {Object} {valid: boolean, error: string}
 */
function validatePlayerName(name) {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Please enter your name' };
    }
    if (name.trim().length > 20) {
        return { valid: false, error: 'Name too long (max 20 characters)' };
    }
    if (!/^[a-zA-Z0-9\u0590-\u05FF\s]+$/.test(name)) {
        return { valid: false, error: 'Name contains invalid characters' };
    }
    return { valid: true, error: null };
}

// Hebrew RTL detection
function isHebrew(text) {
    return /[\u0590-\u05FF]/.test(text);
}

function applyTextDirection(element, text) {
    if (isHebrew(text)) {
        element.classList.add('rtl');
        element.dir = 'rtl';
    } else {
        element.classList.remove('rtl');
        element.dir = 'ltr';
    }
}


function updatePlayerList(players) {
    playerList.innerHTML = '';
    playerCount.textContent = players.length;

    players.forEach(player => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.innerHTML = `
      <div class="player-icon"></div>
      <span>${player.name}</span>
    `;
        playerList.appendChild(li);
    });
}

function updateScoreboard(players) {
    scoreboard.innerHTML = '';

    players.forEach(player => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.textContent = `${player.name}: ${player.score}`;
        scoreboard.appendChild(scoreItem);
    });
}

function renderBlackCard(card) {
    if (card) {
        blackCardDisplay.querySelector('.card-text').textContent = card.text;
    }
}

function renderPlayerHand() {
    playerHandEl.innerHTML = '';


    playerHand.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card white small';
        cardEl.dataset.cardId = card.id;

        const isSelected = selectedCards.some(c => c.id === card.id);
        if (isSelected) {
            cardEl.classList.add('selected');
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'card-text';
        textDiv.textContent = card.text;
        applyTextDirection(textDiv, card.text);
        cardEl.appendChild(textDiv);

        cardEl.addEventListener('click', () => selectCard(card));

        playerHandEl.appendChild(cardEl);
    });

}

function selectCard(card) {
    const maxCards = gameState?.currentBlackCard?.pick || 1;

    const index = selectedCards.findIndex(c => c.id === card.id);

    if (index > -1) {
        // Deselect
        selectedCards.splice(index, 1);
    } else {
        // Select
        if (selectedCards.length < maxCards) {
            selectedCards.push(card);
        } else {
            // Replace first card if at max
            selectedCards.shift();
            selectedCards.push(card);
        }
    }

    renderPlayerHand();
    updateSubmitButton();
}

function updateSubmitButton() {
    // Update the submit button's enabled/disabled state
    const submitBtn = gameStatus.querySelector('button');
    if (submitBtn) {
        submitBtn.disabled = selectedCards.length === 0;
    }
}

function submitCards() {
    if (selectedCards.length === 0) return;

    const cardIds = selectedCards.map(c => c.id);

    socket.emit('submitCards', cardIds, (response) => {
        if (response.success) {
            selectedCards = [];
            renderPlayerHand();
        } else {
            showError(response.message);
        }
    });
}

function renderSubmissions(submissions) {
    submissionsGrid.innerHTML = '';

    submissions.forEach(submission => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card white';
        cardEl.style.cursor = 'pointer';

        const text = submission.cards.map(c => c.text).join(' + ');
        cardEl.innerHTML = `<div class="card-text">${text}</div>`;

        cardEl.addEventListener('click', () => selectWinner(submission.playerId));

        submissionsGrid.appendChild(cardEl);
    });
}

function selectWinner(winnerId) {
    socket.emit('selectWinner', winnerId, (response) => {
        if (!response.success) {
            showError(response.message);
        }
    });
}

function updateGameUI() {
    if (!gameState) return;

    // Update round number
    roundNumber.textContent = gameState.currentRound;

    // Update czar
    const czar = gameState.players.find(p => p.id === gameState.currentCzarId);
    czarIndicator.textContent = czar ? `👑 Czar: ${czar.name}` : 'Czar: ---';

    // Update scoreboard
    updateScoreboard(gameState.players);

    // Update black card
    renderBlackCard(gameState.currentBlackCard);

    // Update phase-specific UI
    const isCzar = socket.id === gameState.currentCzarId;

    submissionsSection.style.display = 'none';
    roundWinnerSection.style.display = 'none';
    gameOverSection.style.display = 'none';
    playerHandSection.style.display = 'block';

    switch (gameState.phase) {
        case 'playing':
            phaseIndicator.textContent = isCzar ? 'You are the Card Czar! Wait for players to submit cards.' : 'Pick your funniest card!';

            if (isCzar) {
                gameStatus.textContent = `Waiting for submissions... (${gameState.submissionCount}/${gameState.players.length - 1})`;
                gameStatus.className = 'status-message';
                playerHandSection.style.display = 'none';
            } else {
                gameStatus.innerHTML = `
          <button onclick="submitCards()" ${selectedCards.length === 0 ? 'disabled' : ''}>
            Submit Card${selectedCards.length > 1 ? 's' : ''}
          </button>
        `;
                gameStatus.className = '';
                // Render hand after UI is set up
                if (playerHand.length > 0) {
                    renderPlayerHand();
                }
            }
            break;

        case 'judging':
            phaseIndicator.textContent = isCzar ? 'Pick the funniest answer!' : 'Waiting for czar to judge...';
            submissionsSection.style.display = isCzar ? 'block' : 'none';
            playerHandSection.style.display = 'none';
            gameStatus.textContent = '';
            break;

        case 'roundEnd':
            phaseIndicator.textContent = 'Round Over!';
            roundWinnerSection.style.display = 'block';
            playerHandSection.style.display = 'none';
            gameStatus.textContent = '';
            break;
    }

    // Always re-render the hand when UI updates to fix display issues
    if (playerHand.length > 0 && !isCzar && gameState.phase === 'playing') {
        renderPlayerHand();
    }
}

// Event Listeners
createRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        showError('Please enter your name');
        return;
    }

    playerName = name;

    socket.emit('createRoom', name, (response) => {
        if (response.success) {
            currentRoomCode = response.roomCode;
            displayRoomCode.textContent = currentRoomCode;
            saveSession();
            showScreen(lobbyScreen);
        } else {
            showError(response.message);
        }
    });
});

joinRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!name) {
        showError('Please enter your name');
        return;
    }

    if (!code || code.length !== 4) {
        showError('Please enter a valid 4-character room code');
        return;
    }

    playerName = name;

    socket.emit('joinRoom', code, name, (response) => {
        if (response.success) {
            currentRoomCode = response.roomCode;
            displayRoomCode.textContent = currentRoomCode;
            saveSession();
            showScreen(lobbyScreen);
        } else {
            showError(response.message);
        }
    });
});

startGameBtn.addEventListener('click', () => {
    socket.emit('startGame', (response) => {
        if (response.success) {
            showScreen(gameScreen);
        } else {
            showError(response.message);
        }
    });
});

nextRoundBtn.addEventListener('click', () => {
    socket.emit('nextRound', (response) => {
        if (!response.success) {
            showError(response.message);
        }
    });
});

newGameBtn.addEventListener('click', () => {
    location.reload();
});

// Leave game button
const leaveGameBtn = document.getElementById('leaveGameBtn');
leaveGameBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the game?')) {
        socket.emit('leaveGame');
        // Clear session
        clearSession();
        // Clear local state
        currentRoomCode = null;
        gameState = null;
        playerHand = [];
        selectedCards = [];
        // Return to home screen
        showScreen(homeScreen);
    }
});

// Allow Enter key for inputs
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoomBtn.click();
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoomBtn.click();
});

// Auto-uppercase room code
roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Socket event listeners
socket.on('gameState', (state) => {
    gameState = state;

    if (state.gameStarted) {
        // Game is in progress - show game screen
        showScreen(gameScreen);
        updateGameUI();
    } else {
        // Game not started - show lobby
        showScreen(lobbyScreen);
        updatePlayerList(state.players);
    }
});

socket.on('yourHand', (hand) => {
    playerHand = hand;
    selectedCards = [];
    renderPlayerHand();
});

socket.on('submissions', (submissions) => {
    renderSubmissions(submissions);
});

socket.on('roundWinner', (data) => {
    const winner = gameState.players.find(p => p.id === data.winnerId);
    const winningSubmission = data.submissions.find(s => s.playerId === data.winnerId);

    if (data.gameOver) {
        gameWinnerName.textContent = `${data.winner.name} Wins!`;
        gameOverSection.style.display = 'block';
        playerHandSection.style.display = 'none';
        roundWinnerSection.style.display = 'none';
    } else {
        winnerSubmission.innerHTML = '';

        if (winningSubmission) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card white winner';
            cardEl.style.margin = '0 auto';
            const text = winningSubmission.cards.map(c => c.text).join(' + ');
            cardEl.innerHTML = `<div class="card-text">${text}</div>`;
            winnerSubmission.appendChild(cardEl);
        }

        phaseIndicator.textContent = `${winner?.name || 'Someone'} won this round!`;
    }
});

socket.on('playerJoined', (data) => {
    // Show notification (optional)
    console.log(`${data.playerName} joined the game`);
});

socket.on('playerLeft', (data) => {
    // Player left notification
});

// Make submitCards available globally
window.submitCards = submitCards;
