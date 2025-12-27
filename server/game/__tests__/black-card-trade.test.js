
const GameEngine = require('../engine');
const { packs } = require('../../../cards-data');

describe('Black Card Trade Feature', () => {
    let game;
    let czarId = 'czar1';
    let playerId = 'player1';

    beforeEach(() => {
        game = new GameEngine('TEST');
        game.addPlayer(czarId, 'Czar');
        game.addPlayer(playerId, 'Player');
        game.startGame(['base']);
        // Ensure czarId is actual czar
        game.currentCzarId = czarId;
        game.phase = 'playing';
    });

    test('Czar can trade black card once per round', () => {
        const initialCard = game.currentBlackCard;
        const initialDeckSize = game.blackCardDeck.length;

        // Perform Trade
        const result = game.tradeBlackCard(czarId);

        expect(result.success).toBe(true);
        expect(result.blackCard).toBeDefined();
        expect(result.blackCard.id).not.toBe(initialCard.id);
        expect(game.currentBlackCard.id).toBe(result.blackCard.id);
        expect(game.blackCardTraded).toBe(true);
        expect(game.blackCardDeck.length).toBe(initialDeckSize - 1);
    });

    test('Czar cannot trade more than once per round', () => {
        // First trade
        game.tradeBlackCard(czarId);
        expect(game.blackCardTraded).toBe(true);

        // Second trade
        const result = game.tradeBlackCard(czarId);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/already traded/);
    });

    test('Non-Czar cannot trade black card', () => {
        const result = game.tradeBlackCard(playerId);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/Only Czar can trade/);
    });

    test('Cannot trade outside of playing phase', () => {
        game.phase = 'judging';
        const result = game.tradeBlackCard(czarId);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/playing phase/);
    });

    test('Trade flag resets on new round', () => {
        game.tradeBlackCard(czarId);
        expect(game.blackCardTraded).toBe(true);

        // Force next round
        game.startNewRound();
        expect(game.blackCardTraded).toBe(false);
    });
});
