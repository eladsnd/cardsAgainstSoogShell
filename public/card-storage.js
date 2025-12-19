// Enhanced Card Creator with localStorage persistence
// This script adds save/load functionality to the card creator

// Load cards from localStorage when page loads
(function () {
    const STORAGE_KEY = 'customCardsAgainstSoog';

    // Check if we're on the creator page
    if (!document.getElementById('blackCardInput')) return;

    // Save cards to localStorage
    window.saveCardsToStorage = function (black, white) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                blackCards: black,
                whiteCards: white,
                savedAt: new Date().toISOString()
            }));
            console.log('Cards saved to localStorage');
        } catch (e) {
            console.error('Failed to save cards:', e);
        }
    };

    // Load cards from localStorage
    window.loadCardsFromStorage = function () {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                return {
                    blackCards: data.blackCards || [],
                    whiteCards: data.whiteCards || []
                };
            }
        } catch (e) {
            console.error('Failed to load cards:', e);
        }
        return { blackCards: [], whiteCards: [] };
    };

    // Clear saved cards
    window.clearSavedCards = function () {
        localStorage.removeItem(STORAGE_KEY);
        console.log('Cleared saved cards');
    };

    console.log('Card storage functions initialized');
})();
