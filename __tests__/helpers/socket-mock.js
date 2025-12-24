/**
 * Socket.IO Mock Helpers
 * Provides mock socket and io instances for testing
 */

function createMockSocket(id = 'socket1') {
  return {
    id,
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    data: {}
  };
}

function createMockIo() {
  const toMock = {
    emit: jest.fn()
  };

  return {
    on: jest.fn(),
    to: jest.fn().mockReturnValue(toMock),
    emit: jest.fn()
  };
}

module.exports = {
  createMockSocket,
  createMockIo
};
