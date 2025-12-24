/**
 * @jest-environment jsdom
 */

// Mock socket.io-client before importing SocketClient
const mockSocketInstance = {
  id: 'mock-socket-id',
  on: jest.fn(),
  emit: jest.fn(),
  onAny: jest.fn()
};

global.io = jest.fn(() => mockSocketInstance);

import { SocketClient } from '../socket-client.js';

describe('SocketClient', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SocketClient();
  });

  describe('Construction', () => {
    test('should create socket instance via io()', () => {
      expect(global.io).toHaveBeenCalled();
      expect(client.socket).toBe(mockSocketInstance);
    });

    test('should initialize callbacks Map', () => {
      expect(client.callbacks).toBeInstanceOf(Map);
      expect(client.callbacks.size).toBe(0);
    });

    test('should set up connect and disconnect listeners', () => {
      expect(mockSocketInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocketInstance.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    test('should set up generic event handler with onAny', () => {
      expect(mockSocketInstance.onAny).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('on', () => {
    test('should register callback for event', () => {
      const callback = jest.fn();

      client.on('gameState', callback);

      expect(client.callbacks.has('gameState')).toBe(true);
      expect(client.callbacks.get('gameState')).toContain(callback);
    });

    test('should allow multiple callbacks for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      client.on('gameState', callback1);
      client.on('gameState', callback2);

      const callbacks = client.callbacks.get('gameState');
      expect(callbacks).toHaveLength(2);
      expect(callbacks).toContain(callback1);
      expect(callbacks).toContain(callback2);
    });

    test('should create new array for first callback', () => {
      const callback = jest.fn();

      client.on('newEvent', callback);

      expect(client.callbacks.has('newEvent')).toBe(true);
      expect(client.callbacks.get('newEvent')).toEqual([callback]);
    });
  });

  describe('emit', () => {
    test('should emit event through socket', () => {
      client.emit('joinRoom', 'TEST', 'Alice');

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('joinRoom', 'TEST', 'Alice');
    });

    test('should emit event with callback', () => {
      const callback = jest.fn();

      client.emit('startGame', callback);

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('startGame', callback);
    });

    test('should handle multiple arguments', () => {
      client.emit('submitCards', ['w1', 'w2'], jest.fn());

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('submitCards', ['w1', 'w2'], expect.any(Function));
    });

    test('should emit event with no arguments', () => {
      client.emit('leaveGame');

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leaveGame');
    });
  });

  describe('getId', () => {
    test('should return socket ID', () => {
      expect(client.getId()).toBe('mock-socket-id');
    });

    test('should return updated socket ID if it changes', () => {
      mockSocketInstance.id = 'new-socket-id';

      expect(client.getId()).toBe('new-socket-id');
    });
  });

  describe('Event handling via onAny', () => {
    test('should call registered callbacks when event is received', () => {
      const callback = jest.fn();
      client.on('gameState', callback);

      // Get the onAny handler
      const onAnyHandler = mockSocketInstance.onAny.mock.calls[0][0];

      // Simulate receiving gameState event
      onAnyHandler('gameState', { roomCode: 'TEST' });

      expect(callback).toHaveBeenCalledWith({ roomCode: 'TEST' });
    });

    test('should call all registered callbacks for an event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      client.on('playerJoined', callback1);
      client.on('playerJoined', callback2);

      const onAnyHandler = mockSocketInstance.onAny.mock.calls[0][0];
      onAnyHandler('playerJoined', { playerName: 'Bob' });

      expect(callback1).toHaveBeenCalledWith({ playerName: 'Bob' });
      expect(callback2).toHaveBeenCalledWith({ playerName: 'Bob' });
    });

    test('should handle events with multiple arguments', () => {
      const callback = jest.fn();
      client.on('roundWinner', callback);

      const onAnyHandler = mockSocketInstance.onAny.mock.calls[0][0];
      onAnyHandler('roundWinner', { winnerId: 'p1' }, { gameOver: false });

      expect(callback).toHaveBeenCalledWith({ winnerId: 'p1' }, { gameOver: false });
    });

    test('should not throw error for unregistered events', () => {
      const onAnyHandler = mockSocketInstance.onAny.mock.calls[0][0];

      expect(() => {
        onAnyHandler('unknownEvent', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Connection events', () => {
    test('should log on connect', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const connectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];

      connectHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Connected to server');

      consoleSpy.mockRestore();
    });

    test('should log on disconnect', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const disconnectHandler = mockSocketInstance.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      disconnectHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Disconnected from server');

      consoleSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    test('should handle full game flow event sequence', () => {
      const gameStateCallback = jest.fn();
      const handCallback = jest.fn();
      const roundWinnerCallback = jest.fn();

      client.on('gameState', gameStateCallback);
      client.on('yourHand', handCallback);
      client.on('roundWinner', roundWinnerCallback);

      const onAnyHandler = mockSocketInstance.onAny.mock.calls[0][0];

      // Simulate game state update
      onAnyHandler('gameState', { phase: 'playing' });
      expect(gameStateCallback).toHaveBeenCalledWith({ phase: 'playing' });

      // Simulate receiving hand
      onAnyHandler('yourHand', [{ id: 'w1', text: 'Card 1' }]);
      expect(handCallback).toHaveBeenCalledWith([{ id: 'w1', text: 'Card 1' }]);

      // Simulate round winner
      onAnyHandler('roundWinner', { winnerId: 'p1' });
      expect(roundWinnerCallback).toHaveBeenCalledWith({ winnerId: 'p1' });
    });

    test('should emit and receive events independently', () => {
      const callback = jest.fn();
      client.on('gameState', callback);

      // Emit event
      client.emit('submitCards', ['w1']);
      expect(mockSocketInstance.emit).toHaveBeenCalledWith('submitCards', ['w1']);

      // Receive event
      const onAnyHandler = mockSocketInstance.onAny.mock.calls[0][0];
      onAnyHandler('gameState', { phase: 'judging' });
      expect(callback).toHaveBeenCalledWith({ phase: 'judging' });
    });
  });
});
