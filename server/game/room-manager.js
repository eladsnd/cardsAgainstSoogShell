const config = require('../../config');
const GameEngine = require('./engine');

// Store active games
const games = new Map(); // roomCode -> GameEngine

/**
 * Generate a random room code
 * @returns {string} Random room code
 */
function generateRoomCode() {
    const chars = config.ROOM_CODE_CHARS;
    let code = '';
    for (let i = 0; i < config.ROOM_CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Create a new game room
 * @param {string} playerName - Name of the creator
 * @param {string} socketId - Socket ID of the creator
 * @returns {Object} { roomCode, game }
 */
function createRoom(playerName, socketId) {
    let roomCode = generateRoomCode();
    while (games.has(roomCode)) {
        roomCode = generateRoomCode();
    }

    const game = new GameEngine(roomCode);
    game.addPlayer(socketId, playerName);
    games.set(roomCode, game);

    return { roomCode, game };
}

/**
 * Get a game by room code
 * @param {string} roomCode 
 * @returns {GameEngine|undefined}
 */
function getGame(roomCode) {
    return games.get(roomCode ? roomCode.toUpperCase() : '');
}

/**
 * Remove a game
 * @param {string} roomCode 
 */
function removeGame(roomCode) {
    games.delete(roomCode);
}

module.exports = {
    games,
    createRoom,
    getGame,
    removeGame
};
