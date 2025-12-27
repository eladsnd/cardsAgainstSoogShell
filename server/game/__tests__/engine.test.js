const GameEngine = require('../engine');
const config = require('../../config');

// Mock deck-manager
jest.mock('../deck-manager', () => ({
  load: jest.fn(),
  getAll: jest.fn(() => ({}))
}));

describe('GameEngine', () => {
  let game;
  const roomCode = 'TEST';

  beforeEach(() => {
    game = new GameEngine(roomCode);
    jest.clearAllMocks();
  });

  test('should initialize correctly', () => {
    expect(game.roomCode).toBe(roomCode);
    expect(game.players).toHaveLength(0);
    expect(game.phase).toBe('lobby');
  });

  test('should add players', () => {
    game.addPlayer('p1', 'Alice');
    expect(game.players).toHaveLength(1);
    expect(game.players[0].name).toBe('Alice');
    expect(game.players[0].connected).toBe(true);
  });

  test('should handle reconnection by name', () => {
    game.addPlayer('p1', 'Alice');
    game.players[0].connected = false;

    game.addPlayer('p2', 'Alice');
    expect(game.players).toHaveLength(1);
    expect(game.players[0].id).toBe('p2');
    expect(game.players[0].connected).toBe(true);
  });

  test('should start game with enough players', () => {
    game.addPlayer('p1', 'Alice');
    game.addPlayer('p2', 'Bob');

    const result = game.startGame(['base']);
    expect(result.success).toBe(true);
    expect(game.gameStarted).toBe(true);
    expect(game.phase).toBe('playing');
    expect(game.currentRound).toBe(1);
    expect(game.currentCzarId).toBeDefined();
  });

  test('should not start game with too few players', () => {
    game.addPlayer('p1', 'Alice');

    const result = game.startGame(['base']);
    expect(result.success).toBe(false);
    expect(game.gameStarted).toBe(false);
  });

  test('should handle card submission', () => {
    game.addPlayer('p1', 'Alice');
    game.addPlayer('p2', 'Bob');
    game.startGame(['base']);

    const czarId = game.currentCzarId;
    const submitter = game.players.find(p => p.id !== czarId);
    const cardIds = [submitter.hand[0].id];

    const result = game.submitCard(submitter.id, cardIds);
    expect(result.success).toBe(true);
    expect(game.submissions.has(submitter.id)).toBe(true);
    expect(submitter.hand).toHaveLength(config.HAND_SIZE - 1);
  });

  test('should transition to judging when all players submit', () => {
    game.addPlayer('p1', 'Alice');
    game.addPlayer('p2', 'Bob');
    game.startGame(['base']);

    const czarId = game.currentCzarId;
    const submitter = game.players.find(p => p.id !== czarId);
    game.submitCard(submitter.id, [submitter.hand[0].id]);

    expect(game.phase).toBe('judging');
  });

  test('should allow czar to select winner', () => {
    game.addPlayer('p1', 'Alice');
    game.addPlayer('p2', 'Bob');
    game.startGame(['base']);

    const czarId = game.currentCzarId;
    const submitter = game.players.find(p => p.id !== czarId);
    game.submitCard(submitter.id, [submitter.hand[0].id]);

    const result = game.selectWinner(czarId, submitter.id);
    expect(result.success).toBe(true);
    expect(game.phase).toBe('roundEnd');
    expect(submitter.score).toBe(1);
  });
});
