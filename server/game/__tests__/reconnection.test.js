const GameEngine = require('../engine');

// Mock deck-manager
jest.mock('../deck-manager', () => ({
    load: jest.fn(),
    getAll: jest.fn(() => ({}))
}));

describe('GameEngine Reconnection', () => {
    let game;

    beforeEach(() => {
        game = new GameEngine('TEST');
    });

    test('should preserve player state on reconnection', () => {
        game.addPlayer('p1', 'Alice');
        game.players[0].score = 5;
        game.players[0].hand = [{ id: 'w1', text: 'Card 1' }];

        // Disconnect
        game.players[0].connected = false;

        // Reconnect with new socket ID
        game.addPlayer('p2', 'Alice');

        expect(game.players).toHaveLength(1);
        expect(game.players[0].id).toBe('p2');
        expect(game.players[0].score).toBe(5);
        expect(game.players[0].hand).toHaveLength(1);
        expect(game.players[0].connected).toBe(true);
    });

    test('should preserve Czar status on reconnection', () => {
        game.addPlayer('p1', 'Alice');
        game.addPlayer('p2', 'Bob');
        // Manually setup game start state to avoid complex deck mocking
        game.gameStarted = true;
        game.currentCzarId = 'p1';

        // Disconnect Alice
        game.players[0].connected = false;

        // Reconnect Alice with new ID
        game.addPlayer('p3', 'Alice');

        expect(game.currentCzarId).toBe('p3');
    });

    test('should update submissions on reconnection', () => {
        game.addPlayer('p1', 'Alice');
        game.submissions.set('p1', [{ id: 'w1' }]);

        // Reconnect Alice
        game.addPlayer('p2', 'Alice');

        expect(game.submissions.has('p1')).toBe(false);
        expect(game.submissions.has('p2')).toBe(true);
        expect(game.submissions.get('p2')).toEqual([{ id: 'w1' }]);
    });
});
