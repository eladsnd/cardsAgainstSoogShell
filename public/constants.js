/**
 * Client-side constants
 * Centralizes all client configuration values
 */

// Local storage keys
const STORAGE_KEYS = {
    SESSION: 'cardsAgainstSoogSession',
    DECKS: 'cardsAgainstSoogDecks',
    CUSTOM_CARDS: 'customCardsAgainstSoog',
};

// Game phases
const GAME_PHASES = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    JUDGING: 'judging',
    ROUND_END: 'roundEnd',
};

// Unicode ranges for text direction
const UNICODE_RANGES = {
    HEBREW: /[\u0590-\u05FF]/,
};

// UI constants
const UI_CONSTANTS = {
    MAX_PLAYER_NAME_LENGTH: 20,
    MAX_CARD_TEXT_LENGTH: 200,
    ERROR_DISPLAY_DURATION_MS: 4000,
    SUCCESS_DISPLAY_DURATION_MS: 2000,
};

// Session settings
const SESSION_CONFIG = {
    TIMEOUT_MS: 3600000, // 1 hour
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE_KEYS,
        GAME_PHASES,
        UNICODE_RANGES,
        UI_CONSTANTS,
        SESSION_CONFIG,
    };
}
