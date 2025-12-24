const GameEngine = require('../engine');
const { mockPlayers, mockWhiteCards } = require('../../../__tests__/fixtures/game-data');

// Mock dependencies
jest.mock('../../../cards-data', () => ({
  packs: [
    {
      id: 'base',
      name: 'Base Pack',
      black: [
        { id: 'b1', text: 'Test question _', pick: 1 },
        { id: 'b2', text: 'Multi _ and _', pick: 2 },
        { id: 'b3', text: 'Another _', pick: 1 }
      ],
      white: [
        { id: 'w1', text: 'Answer 1' },
        { id: 'w2', text: 'Answer 2' },
        { id: 'w3', text: 'Answer 3' },
        { id: 'w4', text: 'Answer 4' },
        { id: 'w5', text: 'Answer 5' },
        { id: 'w6', text: 'Answer 6' },
        { id: 'w7', text: 'Answer 7' },
        { id: 'w8', text: 'Answer 8' },
        { id: 'w9', text: 'Answer 9' },
        { id: 'w10', text: 'Answer 10' },
        { id: 'w11', text: 'Answer 11' },
        { id: 'w12', text: 'Answer 12' },
        { id: 'w13', text: 'Answer 13' },
        { id: 'w14', text: 'Answer 14' },
        { id: 'w15', text: 'Answer 15' },
        { id: 'w16', text: 'Answer 16' },
        { id: 'w17', text: 'Answer 17' },
        { id: 'w18', text: 'Answer 18' },
        { id: 'w19', text: 'Answer 19' },
        { id: 'w20', text: 'Answer 20' },
        { id: 'w21', text: 'Answer 21' },
        { id: 'w22', text: 'Answer 22' },
        { id: 'w23', text: 'Answer 23' },
        { id: 'w24', text: 'Answer 24' },
        { id: 'w25', text: 'Answer 25' }
      ]
    }
  ],
  shuffleArray: (arr) => [...arr]  // Don't shuffle in tests for predictability
}));

jest.mock('../../../config', () => ({
  MIN_PLAYERS: 3,
  HAND_SIZE: 7,
  WINNING_SCORE: 5,
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
}));

jest.mock('../deck-manager', () => ({
  load: jest.fn(),
  getAll: jest.fn(() => ({})),
  save: jest.fn()
}));

describe('GameEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new GameEngine('TEST');
  });

  describe('Construction', () => {
    test('should initialize with correct default state', () => {
      expect(engine.roomCode).toBe('TEST');
      expect(engine.players).toEqual([]);
      expect(engine.gameStarted).toBe(false);
      expect(engine.currentBlackCard).toBeNull();
      expect(engine.currentCzarId).toBeNull();
      expect(engine.submissions).toBeInstanceOf(Map);
      expect(engine.submissions.size).toBe(0);
      expect(engine.phase).toBe('lobby');
      expect(engine.currentRound).toBe(0);
      expect(engine.selectedPacks).toEqual(['base']);
    });
  });

  describe('addPlayer', () => {
    test('should add new player successfully', () => {
      const result = engine.addPlayer('player1', 'Alice');

      expect(result).toBe(true);
      expect(engine.players).toHaveLength(1);
      expect(engine.players[0]).toMatchObject({
        id: 'player1',
        name: 'Alice',
        score: 0,
        connected: true,
        swapsRemaining: 3
      });
      expect(engine.players[0].hand).toEqual([]);
    });

    test('should handle player reconnection by name', () => {
      engine.addPlayer('player1', 'Alice');
      const oldId = 'player1';
      const newId = 'player2';

      const result = engine.addPlayer(newId, 'Alice');

      expect(result).toBe(true);
      expect(engine.players).toHaveLength(1);
      expect(engine.players[0].id).toBe(newId);
      expect(engine.players[0].name).toBe('Alice');
    });

    test('should update czar ID on reconnection if player was czar', () => {
      engine.addPlayer('player1', 'Alice');
      engine.currentCzarId = 'player1';

      engine.addPlayer('player2', 'Alice');

      expect(engine.currentCzarId).toBe('player2');
    });

    test('should update submissions on reconnection if player had submitted', () => {
      engine.addPlayer('player1', 'Alice');
      const card = { id: 'w1', text: 'Answer' };
      engine.submissions.set('player1', [card]);

      engine.addPlayer('player2', 'Alice');

      expect(engine.submissions.has('player1')).toBe(false);
      expect(engine.submissions.has('player2')).toBe(true);
      expect(engine.submissions.get('player2')).toEqual([card]);
    });

    test('should not add duplicate player with same ID', () => {
      engine.addPlayer('player1', 'Alice');
      const result = engine.addPlayer('player1', 'Bob');

      expect(result).toBe(false);
      expect(engine.players).toHaveLength(1);
    });

    test('should deal cards to player joining mid-game', () => {
      engine.gameStarted = true;
      engine.whiteCardDeck = [
        { id: 'w1', text: 'Card 1' },
        { id: 'w2', text: 'Card 2' },
        { id: 'w3', text: 'Card 3' },
        { id: 'w4', text: 'Card 4' },
        { id: 'w5', text: 'Card 5' },
        { id: 'w6', text: 'Card 6' },
        { id: 'w7', text: 'Card 7' }
      ];

      engine.addPlayer('player1', 'Alice');

      expect(engine.players[0].hand).toHaveLength(7);
    });
  });

  describe('removePlayer', () => {
    test('should remove player successfully', () => {
      engine.addPlayer('player1', 'Alice');
      const result = engine.removePlayer('player1');

      expect(result).toBe(true);
      expect(engine.players).toHaveLength(0);
    });

    test('should return false if player not found', () => {
      const result = engine.removePlayer('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('startGame', () => {
    beforeEach(() => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
    });

    test('should start game successfully with minimum players', () => {
      const result = engine.startGame(['base']);

      expect(result.success).toBe(true);
      expect(engine.gameStarted).toBe(true);
      expect(engine.currentRound).toBe(1);
      expect(engine.phase).toBe('playing');
      expect(engine.currentBlackCard).toBeTruthy();
      expect(engine.currentCzarId).toBeTruthy();
    });

    test('should fail if game already started', () => {
      engine.startGame(['base']);
      const result = engine.startGame(['base']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Game already started');
    });

    test('should fail if not enough players', () => {
      const smallEngine = new GameEngine('TEST2');
      smallEngine.addPlayer('p1', 'Alice');

      const result = smallEngine.startGame(['base']);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Need at least');
    });

    test('should deal cards to all players', () => {
      engine.startGame(['base']);

      engine.players.forEach(player => {
        expect(player.hand).toHaveLength(7);
      });
    });

    test('should assign first czar', () => {
      engine.startGame(['base']);

      expect(engine.currentCzarId).toBe('p1');
    });
  });

  describe('dealCards', () => {
    beforeEach(() => {
      engine.whiteCardDeck = [
        { id: 'w1', text: 'Card 1' },
        { id: 'w2', text: 'Card 2' },
        { id: 'w3', text: 'Card 3' }
      ];
      engine.addPlayer('p1', 'Alice');
    });

    test('should deal specified number of cards', () => {
      const player = engine.players[0];
      engine.dealCards(player, 2);

      expect(player.hand).toHaveLength(2);
      expect(engine.whiteCardDeck).toHaveLength(1);
    });

    test('should reshuffle discard pile when deck is empty', () => {
      const player = engine.players[0];
      engine.whiteCardDeck = [];
      engine.discardedWhiteCards = [
        { id: 'w4', text: 'Card 4' },
        { id: 'w5', text: 'Card 5' }
      ];

      engine.dealCards(player, 1);

      expect(player.hand).toHaveLength(1);
      expect(engine.whiteCardDeck).toHaveLength(1);
      expect(engine.discardedWhiteCards).toHaveLength(0);
    });
  });

  describe('submitCard', () => {
    beforeEach(() => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
      engine.startGame(['base']);
      engine.currentCzarId = 'p1';
    });

    test('should accept valid card submission', () => {
      const player = engine.players.find(p => p.id === 'p2');
      const cardId = player.hand[0].id;

      const result = engine.submitCard('p2', [cardId]);

      expect(result.success).toBe(true);
      expect(engine.submissions.has('p2')).toBe(true);
    });

    test('should fail if not in playing phase', () => {
      engine.phase = 'judging';
      const result = engine.submitCard('p2', ['w1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Not in playing phase');
    });

    test('should fail if czar tries to submit', () => {
      const result = engine.submitCard('p1', ['w1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Czar cannot submit cards');
    });

    test('should fail if already submitted', () => {
      const player = engine.players.find(p => p.id === 'p2');
      const cardId = player.hand[0].id;

      engine.submitCard('p2', [cardId]);
      const result = engine.submitCard('p2', [cardId]);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Already submitted');
    });

    test('should fail if wrong number of cards', () => {
      const player = engine.players.find(p => p.id === 'p2');
      const cardIds = [player.hand[0].id, player.hand[1].id];

      const result = engine.submitCard('p2', cardIds);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Must select');
    });

    test('should transition to judging when all players submit', () => {
      const p2 = engine.players.find(p => p.id === 'p2');
      const p3 = engine.players.find(p => p.id === 'p3');

      engine.submitCard('p2', [p2.hand[0].id]);
      expect(engine.phase).toBe('playing');

      engine.submitCard('p3', [p3.hand[0].id]);
      expect(engine.phase).toBe('judging');
    });

    test('should only count connected players for submission completion', () => {
      const p2 = engine.players.find(p => p.id === 'p2');
      const p3 = engine.players.find(p => p.id === 'p3');

      // Disconnect p3
      p3.connected = false;

      // Only p2 needs to submit now
      engine.submitCard('p2', [p2.hand[0].id]);

      expect(engine.phase).toBe('judging');
    });

    test('should remove cards from hand after submission', () => {
      const player = engine.players.find(p => p.id === 'p2');
      const initialHandSize = player.hand.length;
      const cardId = player.hand[0].id;

      engine.submitCard('p2', [cardId]);

      expect(player.hand).toHaveLength(initialHandSize - 1);
      expect(player.hand.find(c => c.id === cardId)).toBeUndefined();
    });

    test('should handle string and number card IDs', () => {
      const player = engine.players.find(p => p.id === 'p2');
      const cardId = String(player.hand[0].id);

      const result = engine.submitCard('p2', [cardId]);

      expect(result.success).toBe(true);
    });
  });

  describe('swapCards', () => {
    beforeEach(() => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
      engine.startGame(['base']);
      engine.currentCzarId = 'p1';
    });

    test('should swap cards successfully', () => {
      const player = engine.players.find(p => p.id === 'p2');
      const cardToSwap = player.hand[0].id;
      const initialSwaps = player.swapsRemaining;

      const result = engine.swapCards('p2', [cardToSwap]);

      expect(result.success).toBe(true);
      expect(player.swapsRemaining).toBe(initialSwaps - 1);
      expect(result.hand).toBeTruthy();
    });

    test('should fail if not in playing phase', () => {
      engine.phase = 'judging';
      const result = engine.swapCards('p2', ['w1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Can only swap during playing phase');
    });

    test('should fail if czar tries to swap', () => {
      const result = engine.swapCards('p1', ['w1']);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Czar cannot swap cards');
    });

    test('should fail if not enough swaps remaining', () => {
      const player = engine.players.find(p => p.id === 'p2');
      player.swapsRemaining = 0;

      const result = engine.swapCards('p2', [player.hand[0].id]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough swaps');
    });

    test('should deal new cards to replace swapped ones', () => {
      const player = engine.players.find(p => p.id === 'p2');
      const initialHandSize = player.hand.length;
      const cardToSwap = player.hand[0].id;

      engine.swapCards('p2', [cardToSwap]);

      expect(player.hand).toHaveLength(initialHandSize);
      expect(player.hand.find(c => c.id === cardToSwap)).toBeUndefined();
    });
  });

  describe('selectWinner', () => {
    beforeEach(() => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
      engine.startGame(['base']);
      engine.currentCzarId = 'p1';
      engine.phase = 'judging';

      const p2 = engine.players.find(p => p.id === 'p2');
      const p3 = engine.players.find(p => p.id === 'p3');
      engine.submissions.set('p2', [{ id: 'w1', text: 'Answer' }]);
      engine.submissions.set('p3', [{ id: 'w2', text: 'Answer' }]);
    });

    test('should select winner successfully', () => {
      const result = engine.selectWinner('p1', 'p2');

      expect(result.success).toBe(true);
      expect(engine.roundWinner).toBe('p2');
      expect(engine.phase).toBe('roundEnd');

      const winner = engine.players.find(p => p.id === 'p2');
      expect(winner.score).toBe(1);
    });

    test('should fail if not in judging phase', () => {
      engine.phase = 'playing';
      const result = engine.selectWinner('p1', 'p2');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Not in judging phase');
    });

    test('should fail if not czar', () => {
      const result = engine.selectWinner('p2', 'p3');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Only czar can select winner');
    });

    test('should fail if invalid winner ID', () => {
      const result = engine.selectWinner('p1', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid winner');
    });

    test('should end game when winner reaches winning score', () => {
      const winner = engine.players.find(p => p.id === 'p2');
      winner.score = 4;  // One away from winning

      const result = engine.selectWinner('p1', 'p2');

      expect(result.success).toBe(true);
      expect(result.gameOver).toBe(true);
      expect(engine.phase).toBe('gameOver');
      expect(engine.finalWinner).toBeTruthy();
      expect(engine.finalLeaderboard).toBeTruthy();
    });
  });

  describe('nextRound', () => {
    beforeEach(() => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
      engine.startGame(['base']);
      engine.currentCzarId = 'p1';
      engine.phase = 'roundEnd';

      const p2 = engine.players.find(p => p.id === 'p2');
      const p3 = engine.players.find(p => p.id === 'p3');
      engine.submissions.set('p2', [{ id: 'w1', text: 'Answer' }]);
      engine.submissions.set('p3', [{ id: 'w2', text: 'Answer' }]);
    });

    test('should start next round successfully', () => {
      const initialRound = engine.currentRound;
      const result = engine.nextRound();

      expect(result.success).toBe(true);
      expect(result.gameOver).toBe(false);
      expect(engine.currentRound).toBe(initialRound + 1);
      expect(engine.phase).toBe('playing');
      expect(engine.submissions.size).toBe(0);
    });

    test('should fail if not at round end', () => {
      engine.phase = 'playing';
      const result = engine.nextRound();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Not at round end');
    });

    test('should deal replacement cards to players who submitted', () => {
      const p2 = engine.players.find(p => p.id === 'p2');
      const p3 = engine.players.find(p => p.id === 'p3');
      const p2HandSize = p2.hand.length;
      const p3HandSize = p3.hand.length;

      engine.nextRound();

      expect(p2.hand.length).toBe(p2HandSize + 1);
      expect(p3.hand.length).toBe(p3HandSize + 1);
    });

    test('should rotate czar to next player', () => {
      const initialCzar = engine.currentCzarId;
      engine.nextRound();

      expect(engine.currentCzarId).not.toBe(initialCzar);
      expect(engine.currentCzarId).toBe('p2');
    });

    test('should reset swaps for all players', () => {
      engine.players.forEach(p => p.swapsRemaining = 1);
      engine.nextRound();

      engine.players.forEach(p => {
        expect(p.swapsRemaining).toBe(3);
      });
    });
  });

  describe('forceEndGame', () => {
    beforeEach(() => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
      engine.startGame(['base']);
    });

    test('should force end game successfully', () => {
      const result = engine.forceEndGame();

      expect(result.success).toBe(true);
      expect(result.gameOver).toBe(true);
      expect(engine.phase).toBe('gameOver');
      expect(result.winner).toBeTruthy();
      expect(result.leaderboard).toBeTruthy();
    });

    test('should fail if game already over', () => {
      engine.phase = 'gameOver';
      const result = engine.forceEndGame();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Game already over');
    });

    test('should generate correct leaderboard sorted by score', () => {
      engine.players[0].score = 2;
      engine.players[1].score = 5;
      engine.players[2].score = 3;

      const result = engine.forceEndGame();

      expect(result.leaderboard[0].score).toBe(5);
      expect(result.leaderboard[1].score).toBe(3);
      expect(result.leaderboard[2].score).toBe(2);
    });
  });

  describe('getGameState', () => {
    beforeEach(() => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
    });

    test('should return complete game state', () => {
      const state = engine.getGameState();

      expect(state).toMatchObject({
        roomCode: 'TEST',
        gameStarted: false,
        phase: 'lobby',
        currentRound: 0
      });
      expect(state.players).toHaveLength(2);
      expect(state.availablePacks).toBeTruthy();
    });

    test('should include submissions only in judging or roundEnd phase', () => {
      engine.phase = 'playing';
      let state = engine.getGameState();
      expect(state.submissions).toEqual([]);

      engine.phase = 'judging';
      state = engine.getGameState();
      expect(Array.isArray(state.submissions)).toBe(true);
    });
  });

  describe('Edge Cases and Bug Regression Tests', () => {
    test('should handle czar rotation when current czar index is -1', () => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
      engine.startGame(['base']);

      // Simulate czar was removed
      engine.currentCzarId = 'nonexistent';
      engine.blackCardDeck = [{ id: 'b1', text: 'Test _', pick: 1 }];

      const result = engine.startNewRound();

      expect(result).toBe(true);
      expect(engine.currentCzarId).toBe('p1');  // Should default to first player
    });

    test('should end game when black card deck is empty', () => {
      engine.addPlayer('p1', 'Alice');
      engine.addPlayer('p2', 'Bob');
      engine.addPlayer('p3', 'Charlie');
      engine.startGame(['base']);

      engine.blackCardDeck = [];
      const result = engine.startNewRound();

      expect(result).toBe(false);
      expect(engine.phase).toBe('gameOver');
    });
  });
});
