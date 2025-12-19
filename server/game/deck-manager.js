const fs = require('fs');
const path = require('path');

const DECKS_FILE = path.join(__dirname, '../data/decks.json');

class DeckManager {
    constructor() {
        this.decks = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DECKS_FILE)) {
                const data = fs.readFileSync(DECKS_FILE, 'utf8');
                this.decks = JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load decks:', e);
            this.decks = {};
        }
    }

    save() {
        try {
            // Ensure directory exists
            const dir = path.dirname(DECKS_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(DECKS_FILE, JSON.stringify(this.decks, null, 2));
            return true;
        } catch (e) {
            console.error('Failed to save decks:', e);
            return false;
        }
    }

    getAll() {
        return this.decks;
    }

    get(id) {
        return this.decks[id];
    }

    createOrUpdate(id, deck) {
        this.decks[id] = deck;
        return this.save();
    }

    delete(id) {
        if (this.decks[id]) {
            delete this.decks[id];
            return this.save();
        }
        return false;
    }
}

module.exports = new DeckManager();
