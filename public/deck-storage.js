// Deck Storage Utility for Cards Against Soog
// Provides centralized deck management functions using Server API

const API_URL = '/api/decks';

// Get all decks from server
async function getAllDecks() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Failed to fetch decks');
        return await res.json();
    } catch (e) {
        console.error('Failed to load decks:', e);
        return {};
    }
}

// Save a specific deck to server
async function saveDeck(id, deck) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, deck })
        });
        return res.ok;
    } catch (e) {
        console.error('Failed to save deck:', e);
        return false;
    }
}

// Delete a deck from server
async function deleteDeck(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        return res.ok;
    } catch (e) {
        console.error('Failed to delete deck:', e);
        return false;
    }
}

// Get a specific deck by ID
async function getDeck(deckId) {
    const decks = await getAllDecks();
    return decks[deckId] || null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAllDecks,
        saveDeck,
        deleteDeck,
        getDeck
    };
} else {
    // Browser global
    window.DeckStorage = {
        getAllDecks,
        saveDeck,
        deleteDeck,
        getDeck
    };
}
