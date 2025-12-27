/** @jest-environment node */
const GameEngine = require('../engine');

// Mock deck-manager
jest.mock('../deck-manager', () => ({
    load: jest.fn(),
    getAll: jest.fn(() => ({
        '1': { id: '1', name: 'Test Pack', white: [{ id: 'w1', text: 'W1' }], black: [{ id: 'b1', text: 'B1', pick: 1 }] }
    }))
}));

describe('GameEngine Timer', () => {
    let game;
    let mockIo;

    beforeEach(() => {
        game = new GameEngine('TEST');
        game.timerEnabled = true;
        game.timerDuration = 10;

        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should NOT start automatically at round start', () => {
        game.addPlayer('p1', 'Alice');
        game.gameStarted = true;
        game.startNewRound();

        expect(game.timerRunning).toBe(false);
        expect(game.timerInterval).toBeNull();
    });

    test('should be toggleable by Czar', () => {
        game.addPlayer('p1', 'Alice'); // Czar
        game.currentCzarId = 'p1';
        game.gameStarted = true;
        game.phase = 'playing';

        game.toggleTimer(mockIo, 'TEST', 'p1');
        expect(game.timerRunning).toBe(true);
        expect(game.timerInterval).not.toBeNull();

        game.toggleTimer(mockIo, 'TEST', 'p1');
        expect(game.timerRunning).toBe(false);
        expect(game.timerInterval).toBeNull();
    });

    test('should decrease timerRemaining every second when running', () => {
        game.addPlayer('p1', 'Alice');
        game.currentCzarId = 'p1';
        game.gameStarted = true;
        game.phase = 'playing';
        game.timerRemaining = 10;
        game.toggleTimer(mockIo, 'TEST', 'p1');

        expect(game.timerRemaining).toBe(10);

        jest.advanceTimersByTime(1000);
        expect(game.timerRemaining).toBe(9);
    });

    test('should auto-submit ONLY in playing phase when expires', () => {
        game.addPlayer('p1', 'Alice'); // Czar
        game.addPlayer('p2', 'Bob');
        game.currentCzarId = 'p1';
        game.gameStarted = true;
        game.phase = 'playing';
        game.players[1].hand = [{ id: 'w1', text: 'Card 1' }];
        game.currentBlackCard = { id: 'b1', text: 'Q1', pick: 1 };

        game.toggleTimer(mockIo, 'TEST', 'p1');

        // Advance time to expiration
        jest.advanceTimersByTime(10000);

        expect(game.phase).toBe('judging');
        expect(game.timerRunning).toBe(false);
    });

    test('should NOT have timer in judging phase', () => {
        game.addPlayer('p1', 'Alice'); // Czar
        game.currentCzarId = 'p1';
        game.gameStarted = true;
        game.phase = 'judging';

        const result = game.toggleTimer(mockIo, 'TEST', 'p1');
        expect(result.success).toBe(false);
        expect(game.timerRunning).toBe(false);
    });

    test('should stop timer when everyone submits', () => {
        game.addPlayer('p1', 'Alice');
        game.addPlayer('p2', 'Bob');
        game.gameStarted = true;
        game.currentCzarId = 'p1';
        game.phase = 'playing';
        game.players[1].hand = [{ id: 'w1', text: 'Card 1' }];
        game.currentBlackCard = { id: 'b1', text: 'Q1', pick: 1 };

        game.startTimer(mockIo, 'TEST');
        const stopSpy = jest.spyOn(game, 'stopTimer');

        game.submitCard('p2', ['w1']);

        expect(stopSpy).toHaveBeenCalled();
        expect(game.timerInterval).toBeNull();
    });
});
