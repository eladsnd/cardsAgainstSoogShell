const fs = require('fs');
const path = require('path');

const DECKS_DIR = path.join(__dirname, '../data/decks');

/**
 * De-duplicate cards by text content
 * Keeps the first occurrence of each unique card text
 */
function deduplicateCards(cards) {
    const seen = new Set();
    const unique = [];

    for (const card of cards) {
        const key = card.text;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(card);
        }
    }

    return unique;
}

class DeckManager {
    constructor() {
        this.decks = {};
        this.load();
    }

    /**
     * Load all decks from individual deck directories
     */
    load() {
        try {
            // Ensure decks directory exists
            if (!fs.existsSync(DECKS_DIR)) {
                fs.mkdirSync(DECKS_DIR, { recursive: true });
                this.decks = {};
                return;
            }

            // Read all deck directories
            const deckDirs = fs.readdirSync(DECKS_DIR).filter(name => {
                const deckPath = path.join(DECKS_DIR, name);
                return fs.statSync(deckPath).isDirectory();
            });

            this.decks = {};

            deckDirs.forEach(deckId => {
                const deckPath = path.join(DECKS_DIR, deckId);
                const metaPath = path.join(deckPath, 'meta.json');
                const blackPath = path.join(deckPath, 'black.json');
                const whitePath = path.join(deckPath, 'white.json');

                // Verify all required files exist
                if (fs.existsSync(metaPath) && fs.existsSync(blackPath) && fs.existsSync(whitePath)) {
                    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    const blackCards = JSON.parse(fs.readFileSync(blackPath, 'utf8'));
                    const whiteCards = JSON.parse(fs.readFileSync(whitePath, 'utf8'));

                    this.decks[deckId] = {
                        name: meta.name,
                        blackCards: blackCards,
                        whiteCards: whiteCards,
                        createdAt: meta.createdAt
                    };
                } else {
                    console.warn(`[DeckManager] Incomplete deck directory: ${deckId}`);
                }
            });

            console.log(`[DeckManager] Loaded ${Object.keys(this.decks).length} decks`);
        } catch (e) {
            console.error('[DeckManager] Failed to load decks:', e);
            this.decks = {};
        }
    }

    /**
     * Save a single deck to its directory with de-duplication
     */
    save(deckId, deck) {
        try {
            const deckPath = path.join(DECKS_DIR, deckId);

            // Create deck directory
            if (!fs.existsSync(deckPath)) {
                fs.mkdirSync(deckPath, { recursive: true });
            }

            // De-duplicate cards before saving
            const blackCards = deduplicateCards(deck.blackCards || deck.black || []);
            const whiteCards = deduplicateCards(deck.whiteCards || deck.white || []);

            // Save meta.json
            const meta = {
                name: deck.name,
                createdAt: deck.createdAt || Date.now()
            };
            fs.writeFileSync(
                path.join(deckPath, 'meta.json'),
                JSON.stringify(meta, null, 2)
            );

            // Save black.json
            fs.writeFileSync(
                path.join(deckPath, 'black.json'),
                JSON.stringify(blackCards, null, 2)
            );

            // Save white.json
            fs.writeFileSync(
                path.join(deckPath, 'white.json'),
                JSON.stringify(whiteCards, null, 2)
            );

            // Update in-memory cache
            this.decks[deckId] = {
                name: meta.name,
                blackCards: blackCards,
                whiteCards: whiteCards,
                createdAt: meta.createdAt
            };

            return true;
        } catch (e) {
            console.error('[DeckManager] Failed to save deck:', e);
            return false;
        }
    }

    /**
     * Get all decks
     */
    getAll() {
        return this.decks;
    }

    /**
     * Get a specific deck by ID
     */
    get(id) {
        return this.decks[id];
    }

    /**
     * Create or update a deck
     */
    createOrUpdate(id, deck) {
        return this.save(id, deck);
    }

    /**
     * Delete a deck
     */
    delete(id) {
        try {
            const deckPath = path.join(DECKS_DIR, id);

            if (fs.existsSync(deckPath)) {
                // Remove directory and all files
                fs.rmSync(deckPath, { recursive: true, force: true });

                // Remove from cache
                delete this.decks[id];

                return true;
            }
            return false;
        } catch (e) {
            console.error('[DeckManager] Failed to delete deck:', e);
            return false;
        }
    }
}

module.exports = new DeckManager();
