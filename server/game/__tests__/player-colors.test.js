const GameEngine = require('../engine');

describe('Player Neon Colors', () => {
    let engine;

    beforeEach(() => {
        engine = new GameEngine('TEST');
    });

    test('assigns unique colors to players when they join', () => {
        engine.addPlayer('player1', 'Alice');
        engine.addPlayer('player2', 'Bob');
        engine.addPlayer('player3', 'Charlie');

        const players = engine.getGameState().players;

        expect(players[0].color).toBeDefined();
        expect(players[1].color).toBeDefined();
        expect(players[2].color).toBeDefined();

        // All players should have different colors
        expect(players[0].color).not.toBe(players[1].color);
        expect(players[1].color).not.toBe(players[2].color);
    });

    test('assigns colors from the neon palette', () => {
        engine.addPlayer('player1', 'Alice');

        const player = engine.getGameState().players[0];

        // Color should be HSL format
        expect(player.color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    test('cycles through colors when more than 18 players join', () => {
        // Add 19 players
        for (let i = 1; i <= 19; i++) {
            engine.addPlayer(`player${i}`, `Player${i}`);
        }

        const players = engine.getGameState().players;

        // First and 19th player should have the same color (round-robin)
        expect(players[0].color).toBe(players[18].color);
    });

    test('preserves color on reconnection', () => {
        engine.addPlayer('socket1', 'Alice');

        const originalColor = engine.getGameState().players[0].color;

        // Simulate disconnection and reconnection
        engine.players[0].connected = false;
        engine.addPlayer('socket2', 'Alice');

        const reconnectedColor = engine.getGameState().players[0].color;

        expect(reconnectedColor).toBe(originalColor);
    });

    test('includes color in game state', () => {
        engine.addPlayer('player1', 'Alice');

        const gameState = engine.getGameState();

        expect(gameState.players).toHaveLength(1);
        expect(gameState.players[0]).toHaveProperty('color');
        expect(typeof gameState.players[0].color).toBe('string');
    });

    test('color assignment is consistent across game start', () => {
        engine.addPlayer('player1', 'Alice');
        engine.addPlayer('player2', 'Bob');

        const colorBeforeStart = engine.getGameState().players[0].color;

        engine.startGame();

        const colorAfterStart = engine.getGameState().players[0].color;

        expect(colorAfterStart).toBe(colorBeforeStart);
    });
});
