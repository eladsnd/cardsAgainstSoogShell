#!/usr/bin/env node
/**
 * Migration script to convert decks.json to individual deck files
 *
 * Old structure: server/data/decks.json (single file with all decks)
 * New structure: server/data/decks/[deck_id]/
 *   - meta.json (name, createdAt)
 *   - black.json (de-duplicated black cards)
 *   - white.json (de-duplicated white cards)
 */

const fs = require('fs');
const path = require('path');

const OLD_DECKS_FILE = path.join(__dirname, '../server/data/decks.json');
const NEW_DECKS_DIR = path.join(__dirname, '../server/data/decks');

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

/**
 * Migrate a single deck to the new file structure
 */
function migrateDeck(deckId, deckData) {
  const deckDir = path.join(NEW_DECKS_DIR, deckId);

  // Create deck directory
  if (!fs.existsSync(deckDir)) {
    fs.mkdirSync(deckDir, { recursive: true });
  }

  // De-duplicate cards
  const blackCards = deduplicateCards(deckData.blackCards || []);
  const whiteCards = deduplicateCards(deckData.whiteCards || []);

  // Create meta.json
  const meta = {
    name: deckData.name,
    createdAt: deckData.createdAt
  };
  fs.writeFileSync(
    path.join(deckDir, 'meta.json'),
    JSON.stringify(meta, null, 2)
  );

  // Create black.json
  fs.writeFileSync(
    path.join(deckDir, 'black.json'),
    JSON.stringify(blackCards, null, 2)
  );

  // Create white.json
  fs.writeFileSync(
    path.join(deckDir, 'white.json'),
    JSON.stringify(whiteCards, null, 2)
  );

  const blackDupes = (deckData.blackCards?.length || 0) - blackCards.length;
  const whiteDupes = (deckData.whiteCards?.length || 0) - whiteCards.length;

  console.log(`✓ Migrated "${deckData.name}" (${deckId})`);
  console.log(`  Black: ${deckData.blackCards?.length || 0} → ${blackCards.length} (${blackDupes} duplicates removed)`);
  console.log(`  White: ${deckData.whiteCards?.length || 0} → ${whiteCards.length} (${whiteDupes} duplicates removed)`);
}

/**
 * Main migration function
 */
function migrate() {
  console.log('Starting deck migration...\n');

  // Check if old file exists
  if (!fs.existsSync(OLD_DECKS_FILE)) {
    console.log('No decks.json found. Nothing to migrate.');
    return;
  }

  // Load old decks
  const oldDecks = JSON.parse(fs.readFileSync(OLD_DECKS_FILE, 'utf8'));
  const deckIds = Object.keys(oldDecks);

  if (deckIds.length === 0) {
    console.log('No decks found in decks.json.');
    return;
  }

  console.log(`Found ${deckIds.length} decks to migrate.\n`);

  // Create new decks directory
  if (!fs.existsSync(NEW_DECKS_DIR)) {
    fs.mkdirSync(NEW_DECKS_DIR, { recursive: true });
  }

  // Migrate each deck
  deckIds.forEach(deckId => {
    migrateDeck(deckId, oldDecks[deckId]);
  });

  // Backup old file
  const backupFile = OLD_DECKS_FILE + '.backup';
  fs.copyFileSync(OLD_DECKS_FILE, backupFile);
  console.log(`\n✓ Backed up old decks.json to ${backupFile}`);

  // Remove old file
  fs.unlinkSync(OLD_DECKS_FILE);
  console.log('✓ Removed old decks.json');

  console.log('\n✅ Migration complete!');
}

// Run migration if this script is executed directly
if (require.main === module) {
  try {
    migrate();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

module.exports = { migrate, deduplicateCards };
