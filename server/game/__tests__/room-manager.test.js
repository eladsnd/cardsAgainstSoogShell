const roomManager = require('../room-manager');
const GameEngine = require('../engine');

// Mock dependencies
jest.mock('../../../config', () => ({
  MIN_PLAYERS: 3,
  HAND_SIZE: 7,
  WINNING_SCORE: 5,
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
}));

jest.mock('../../../cards-data', () => ({
  packs: [
    {
      id: 'base',
      name: 'Base Pack',
      black: [{ id: 'b1', text: 'Test _', pick: 1 }],
      white: [{ id: 'w1', text: 'Answer 1' }]
    }
  ],
  shuffleArray: (arr) => [...arr]
}));

jest.mock('../deck-manager', () => ({
  load: jest.fn(),
  getAll: jest.fn(() => ({})),
  save: jest.fn()
}));

describe('RoomManager', () => {
  beforeEach(() => {
    // Clear all games before each test
    roomManager.games.clear();
  });

  describe('createRoom', () => {
    test('should create a new room with generated code', () => {
      const result = roomManager.createRoom('Alice', 'socket1');

      expect(result.roomCode).toBeTruthy();
      expect(result.roomCode).toHaveLength(4);
      expect(result.game).toBeInstanceOf(GameEngine);
      expect(result.game.roomCode).toBe(result.roomCode);
    });

    test('should add creator as first player', () => {
      const result = roomManager.createRoom('Alice', 'socket1');

      expect(result.game.players).toHaveLength(1);
      expect(result.game.players[0]).toMatchObject({
        id: 'socket1',
        name: 'Alice'
      });
    });

    test('should store game in games map', () => {
      const result = roomManager.createRoom('Alice', 'socket1');

      expect(roomManager.games.has(result.roomCode)).toBe(true);
      expect(roomManager.games.get(result.roomCode)).toBe(result.game);
    });

    test('should generate unique room codes', () => {
      const room1 = roomManager.createRoom('Alice', 'socket1');
      const room2 = roomManager.createRoom('Bob', 'socket2');

      expect(room1.roomCode).not.toBe(room2.roomCode);
    });

    test('should regenerate code if collision occurs', () => {
      // Mock generateRoomCode to return same code twice then different
      let callCount = 0;
      const originalGenerateRoomCode = roomManager.createRoom;

      // Create first room
      const room1 = roomManager.createRoom('Alice', 'socket1');

      // Create second room - should get different code
      const room2 = roomManager.createRoom('Bob', 'socket2');

      expect(room1.roomCode).not.toBe(room2.roomCode);
      expect(roomManager.games.size).toBe(2);
    });
  });

  describe('getGame', () => {
    test('should retrieve game by room code', () => {
      const { roomCode, game } = roomManager.createRoom('Alice', 'socket1');

      const retrieved = roomManager.getGame(roomCode);

      expect(retrieved).toBe(game);
    });

    test('should return undefined for non-existent room', () => {
      const retrieved = roomManager.getGame('XXXX');

      expect(retrieved).toBeUndefined();
    });

    test('should handle case-insensitive room codes', () => {
      const { roomCode, game } = roomManager.createRoom('Alice', 'socket1');

      const retrieved = roomManager.getGame(roomCode.toLowerCase());

      expect(retrieved).toBe(game);
    });

    test('should handle null or undefined room code', () => {
      expect(roomManager.getGame(null)).toBeUndefined();
      expect(roomManager.getGame(undefined)).toBeUndefined();
    });
  });

  describe('removeGame', () => {
    test('should remove game from map', () => {
      const { roomCode } = roomManager.createRoom('Alice', 'socket1');

      roomManager.removeGame(roomCode);

      expect(roomManager.games.has(roomCode)).toBe(false);
    });

    test('should not throw error when removing non-existent game', () => {
      expect(() => {
        roomManager.removeGame('XXXX');
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    test('should handle full room lifecycle', () => {
      // Create room
      const { roomCode, game } = roomManager.createRoom('Alice', 'socket1');
      expect(roomManager.games.size).toBe(1);

      // Add more players
      game.addPlayer('socket2', 'Bob');
      game.addPlayer('socket3', 'Charlie');

      // Verify game state
      const retrieved = roomManager.getGame(roomCode);
      expect(retrieved.players).toHaveLength(3);

      // Remove game
      roomManager.removeGame(roomCode);
      expect(roomManager.games.size).toBe(0);
    });

    test('should handle multiple rooms simultaneously', () => {
      const room1 = roomManager.createRoom('Alice', 'socket1');
      const room2 = roomManager.createRoom('Bob', 'socket2');
      const room3 = roomManager.createRoom('Charlie', 'socket3');

      expect(roomManager.games.size).toBe(3);

      roomManager.removeGame(room2.roomCode);
      expect(roomManager.games.size).toBe(2);

      expect(roomManager.getGame(room1.roomCode)).toBe(room1.game);
      expect(roomManager.getGame(room2.roomCode)).toBeUndefined();
      expect(roomManager.getGame(room3.roomCode)).toBe(room3.game);
    });
  });
});
