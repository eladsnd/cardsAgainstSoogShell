import { App } from '../main.js';

// Mock dependencies to isolate UI logic
jest.mock('../utils/socket-client.js', () => ({
    SocketClient: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        emit: jest.fn(),
        getId: jest.fn().mockReturnValue('host-id')
    }))
}));

jest.mock('../ui/renderer.js', () => ({
    UIRenderer: jest.fn().mockImplementation(() => ({
        updatePlayerList: jest.fn(),
        renderPackSelection: jest.fn(),
        renderWinningScore: jest.fn(),
        renderTimerSettings: jest.fn(),
        clearSubmissions: jest.fn(),
        updateRoomCode: jest.fn(),
        updateTimer: jest.fn(),
        renderBlackCard: jest.fn(),
        updateSwapsDisplay: jest.fn(),
        updateGameInfo: jest.fn(),
        updateScoreboard: jest.fn()
    }))
}));

jest.mock('../game/state.js', () => ({
    GameState: jest.fn().mockImplementation(() => ({
        update: jest.fn(),
        currentPhase: 'lobby'
    }))
}));

describe('Lobby UI Regression Test', () => {
    let app;

    beforeEach(() => {
        // Setup minimal DOM for main.js onGameState and bindEvents
        document.body.innerHTML = `
            <div id="gameSettingsSection" style="display: none;"></div>
            <div id="playerHandSection"></div>
            <div id="submissionsSection"></div>
            <div id="roundWinnerSection"></div>
            <div id="gameOverSection"></div>
            <div id="phaseIndicator"></div>
            <div id="endGameBtn"></div>
            <div id="displayRoomCode"></div>
            <div id="playerCount"></div>
            <div id="playerList"></div>
            
            <!-- bindEvents requirements -->
            <button id="createRoomBtn"></button>
            <button id="joinRoomBtn"></button>
            <button id="startGameBtn"></button>
            <button id="submitCardsBtn"></button>
            <button id="swapCardsBtn"></button>
            <button id="leaveGameBtn"></button>
            <button id="leaveLobbyBtn"></button>
            <button id="newGameBtn"></button>
            <button id="toggleTimerBtn"></button>
            
            <!-- Input requirements -->
            <input id="playerNameInput" value="Test Player">
            <input id="roomCodeInput" value="ABCD">
        `;
        app = new App();
    });

    test('Lobby settings section becomes visible in lobby phase', () => {
        const lobbyState = {
            phase: 'lobby',
            players: [{ id: 'host-id', name: 'Host' }],
            availablePacks: [],
            selectedPacks: [],
            winningScore: 7,
            timerEnabled: false,
            timerDuration: 40
        };

        app.onGameState(lobbyState);

        const settingsSection = document.getElementById('gameSettingsSection');
        expect(settingsSection.style.display).toBe('block');
    });

    test('Lobby settings are prioritized and rendered in lobby phase', () => {
        const lobbyState = {
            phase: 'lobby',
            players: [{ id: 'host-id', name: 'Host' }],
            availablePacks: [{ id: 'base', name: 'Base' }],
            selectedPacks: ['base'],
            winningScore: 10,
            timerEnabled: true,
            timerDuration: 60
        };

        app.onGameState(lobbyState);

        // Verify renderer calls
        expect(app.ui.renderPackSelection).toHaveBeenCalledWith(
            expect.any(Array),
            expect.arrayContaining(['base']),
            true,
            expect.any(Function)
        );
        expect(app.ui.renderWinningScore).toHaveBeenCalledWith(10, true, expect.any(Function));
        expect(app.ui.renderTimerSettings).toHaveBeenCalledWith(true, 60, true, expect.any(Function), expect.any(Function));
    });
});
