/**
 * Test Fixtures for Cards Against Friends
 * Provides mock data for testing
 */

module.exports = {
  mockPlayers: [
    {
      id: 'p1',
      name: 'Alice',
      score: 0,
      hand: [],
      connected: true,
      swapsRemaining: 3
    },
    {
      id: 'p2',
      name: 'Bob',
      score: 1,
      hand: [],
      connected: true,
      swapsRemaining: 3
    },
    {
      id: 'p3',
      name: 'Charlie',
      score: 2,
      hand: [],
      connected: true,
      swapsRemaining: 3
    }
  ],

  mockBlackCard: {
    id: 'b1',
    text: 'Test question with _',
    pick: 1
  },

  mockBlackCardMultiPick: {
    id: 'b2',
    text: 'Test question with _ and _',
    pick: 2
  },

  mockWhiteCards: [
    { id: 'w1', text: 'Answer 1' },
    { id: 'w2', text: 'Answer 2' },
    { id: 'w3', text: 'Answer 3' },
    { id: 'w4', text: 'Answer 4' },
    { id: 'w5', text: 'Answer 5' },
    { id: 'w6', text: 'Answer 6' },
    { id: 'w7', text: 'Answer 7' },
    { id: 'w8', text: 'Answer 8' }
  ],

  mockGameState: {
    roomCode: 'TEST',
    players: [],
    gameStarted: true,
    currentBlackCard: null,
    currentCzarId: 'p1',
    phase: 'playing',
    currentRound: 1,
    roundWinner: null,
    submissionCount: 0,
    submissions: [],
    selectedPacks: ['base']
  }
};
