// Deck Storage Utility for Cards Against Soog
// Provides centralized deck management functions for localStorage

const DECK_STORAGE_KEY = 'cardsAgainstSoogDecks';

// Get all decks from localStorage
function getAllDecks() {
    try {
        const saved = localStorage.getItem(DECK_STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load decks:', e);
    }

    // Return default deck if nothing saved
    return {
        'default': {
            name: 'Default Deck',
            blackCards: [],
            whiteCards: [],
            createdAt: Date.now()
        }
    };
}

// Save all decks to localStorage
function saveAllDecks(decks) {
    try {
        localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(decks));
        return true;
    } catch (e) {
        console.error('Failed to save decks:', e);
        return false;
    }
}

// Get a specific deck by ID
function getDeck(deckId) {
    const decks = getAllDecks();
    return decks[deckId] || null;
}

// Get deck list for dropdown
function getDeckList() {
    const decks = getAllDecks();
    return Object.keys(decks).map(id => ({
        id,
        name: decks[id].name,
        blackCount: decks[id].blackCards.length,
        whiteCount: decks[id].whiteCards.length
    }));
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAllDecks,
        saveAllDecks,
        getDeck,
        getDeckList
    };
}
