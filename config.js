/**
 * Server configuration constants
 * Centralizes all configuration values for easy maintenance
 */

module.exports = {
    // Server settings
    PORT: process.env.PORT || 3000,

    // Game settings
    MIN_PLAYERS: 3,
    MAX_PLAYERS: 10,
    WINNING_SCORE: 7,
    HAND_SIZE: 10,

    // Room settings
    ROOM_CODE_LENGTH: 4,
    ROOM_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',

    // Session settings
    SESSION_TIMEOUT_MS: 3600000, // 1 hour
};
