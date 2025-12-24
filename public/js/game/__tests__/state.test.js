import { GameState } from '../state.js';

describe('GameState', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  describe('Construction', () => {
    test('should initialize with correct default values', () => {
      expect(state.roomCode).toBeNull();
      expect(state.playerName).toBeNull();
      expect(state.isCzar).toBe(false);
      expect(state.hand).toEqual([]);
      expect(state.selectedCards).toEqual([]);
      expect(state.gameData).toBeNull();
      expect(state.swapsRemaining).toBe(3);
    });
  });

  describe('update', () => {
    test('should update state with server data', () => {
      const serverState = {
        roomCode: 'TEST',
        players: [
          { id: 'p1', name: 'Alice', score: 0 },
          { id: 'p2', name: 'Bob', score: 1 }
        ],
        gameStarted: true,
        currentBlackCard: { id: 'b1', text: 'Test question _', pick: 1 },
        currentCzarId: 'p1',
        phase: 'playing',
        currentRound: 1
      };

      state.update(serverState);

      expect(state.gameData).toBe(serverState);
      expect(state.roomCode).toBe('TEST');
    });

    test('should handle null server state gracefully', () => {
      state.update(null);

      expect(state.gameData).toBeNull();
    });

    test('should overwrite previous state on update', () => {
      const state1 = {
        roomCode: 'TEST1',
        phase: 'lobby'
      };

      const state2 = {
        roomCode: 'TEST2',
        phase: 'playing'
      };

      state.update(state1);
      expect(state.roomCode).toBe('TEST1');

      state.update(state2);
      expect(state.roomCode).toBe('TEST2');
      expect(state.gameData).toBe(state2);
    });
  });

  describe('currentPhase', () => {
    test('should return "lobby" when gameData is null', () => {
      expect(state.currentPhase).toBe('lobby');
    });

    test('should return phase from gameData', () => {
      state.update({ phase: 'playing' });

      expect(state.currentPhase).toBe('playing');
    });

    test('should return "lobby" when gameData exists but has no phase', () => {
      state.update({ roomCode: 'TEST' });

      expect(state.currentPhase).toBe('lobby');
    });

    test('should handle all game phases', () => {
      const phases = ['lobby', 'playing', 'judging', 'roundEnd', 'gameOver'];

      phases.forEach(phase => {
        state.update({ phase });
        expect(state.currentPhase).toBe(phase);
      });
    });
  });

  describe('pickCount', () => {
    test('should return 1 when gameData is null', () => {
      expect(state.pickCount).toBe(1);
    });

    test('should return 1 when currentBlackCard is null', () => {
      state.update({ currentBlackCard: null });

      expect(state.pickCount).toBe(1);
    });

    test('should return pick count from currentBlackCard', () => {
      state.update({
        currentBlackCard: { id: 'b1', text: 'Test _ and _', pick: 2 }
      });

      expect(state.pickCount).toBe(2);
    });

    test('should handle single pick cards', () => {
      state.update({
        currentBlackCard: { id: 'b1', text: 'Test _', pick: 1 }
      });

      expect(state.pickCount).toBe(1);
    });

    test('should handle multi-pick cards', () => {
      state.update({
        currentBlackCard: { id: 'b1', text: '_ + _ = _', pick: 3 }
      });

      expect(state.pickCount).toBe(3);
    });

    test('should default to 1 if pick is undefined', () => {
      state.update({
        currentBlackCard: { id: 'b1', text: 'Test _' }
      });

      expect(state.pickCount).toBe(1);
    });
  });

  describe('Integration scenarios', () => {
    test('should track game progression through phases', () => {
      // Start in lobby
      expect(state.currentPhase).toBe('lobby');

      // Game starts
      state.update({
        roomCode: 'TEST',
        phase: 'playing',
        currentBlackCard: { id: 'b1', text: 'Test _', pick: 1 }
      });

      expect(state.currentPhase).toBe('playing');
      expect(state.pickCount).toBe(1);

      // Move to judging
      state.update({
        roomCode: 'TEST',
        phase: 'judging',
        currentBlackCard: { id: 'b1', text: 'Test _', pick: 1 }
      });

      expect(state.currentPhase).toBe('judging');

      // Move to round end
      state.update({
        roomCode: 'TEST',
        phase: 'roundEnd'
      });

      expect(state.currentPhase).toBe('roundEnd');

      // Game over
      state.update({
        roomCode: 'TEST',
        phase: 'gameOver'
      });

      expect(state.currentPhase).toBe('gameOver');
    });

    test('should handle black card changes between rounds', () => {
      state.update({
        currentBlackCard: { id: 'b1', text: 'First _', pick: 1 }
      });

      expect(state.pickCount).toBe(1);

      state.update({
        currentBlackCard: { id: 'b2', text: 'Second _ and _', pick: 2 }
      });

      expect(state.pickCount).toBe(2);
    });
  });
});
