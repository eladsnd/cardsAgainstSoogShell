const { packs, shuffleArray } = require('../../cards-data');
const config = require('../../config');

/**
 * Game Engine class managing Cards Against Humanity game logic
 * Refactored from game-logic.js
 */
class GameEngine {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = [];
        this.gameStarted = false;
        this.currentBlackCard = null;
        this.currentCzarId = null;
        this.submissions = new Map(); // playerId -> whiteCardIds
        this.roundWinner = null;
        this.selectedPacks = ['base']; // Default to base pack
        this.blackCardDeck = [];
        this.whiteCardDeck = [];
        this.discardedWhiteCards = [];
        this.currentRound = 0;
        this.phase = 'lobby'; // lobby, playing, judging, roundEnd, gameOver
        this.finalWinner = null;
        this.finalLeaderboard = null;
    }

    addPlayer(playerId, playerName) {
        // Check if player with same name already exists (reconnection)
        const existingPlayer = this.players.find(p => p.name === playerName);

        if (existingPlayer) {
            console.log(`[Engine] Reconnecting player: ${playerName} (${existingPlayer.id} -> ${playerId})`);
            const oldId = existingPlayer.id;
            existingPlayer.id = playerId;
            existingPlayer.connected = true;

            // Update Czar ID if they were the Czar
            if (this.currentCzarId === oldId) {
                this.currentCzarId = playerId;
            }

            // Update submissions if they had one
            if (this.submissions.has(oldId)) {
                const sub = this.submissions.get(oldId);
                this.submissions.delete(oldId);
                this.submissions.set(playerId, sub);
            }

            return true;
        }

        if (this.players.find(p => p.id === playerId)) {
            return false;
        }

        const player = {
            id: playerId,
            name: playerName,
            hand: [],
            score: 0,
            connected: true,
            swapsRemaining: 3,
        };

        // If game already started, deal cards to new player
        if (this.gameStarted) {
            console.log(`[Engine] Dealing cards to new player joining mid-game: ${playerName}`);
            this.dealCards(player, config.HAND_SIZE);
        }

        this.players.push(player);
        return true;
    }

    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            return true;
        }
        return false;
    }

    startGame(packIds = []) {
        if (this.gameStarted) {
            return { success: false, message: 'Game already started' };
        }

        if (this.players.length < config.MIN_PLAYERS) {
            return { success: false, message: `Need at least ${config.MIN_PLAYERS} players to start` };
        }

        // Use provided packs or fall back to current selection or base
        const packsToUse = packIds.length > 0 ? packIds : (this.selectedPacks.length > 0 ? this.selectedPacks : ['base']);
        this.selectedPacks = packsToUse;

        // Filter and merge cards
        let allBlackCards = [];
        let allWhiteCards = [];

        // 1. Built-in packs
        const builtInPacks = packs.filter(p => packsToUse.includes(p.id));
        builtInPacks.forEach(pack => {
            allBlackCards = [...allBlackCards, ...pack.black];
            allWhiteCards = [...allWhiteCards, ...pack.white];
        });

        // 2. Custom decks
        const deckManager = require('./deck-manager');
        deckManager.load(); // Reload from disk to pick up manual edits
        const customDecks = deckManager.getAll();

        console.log(`[Engine] Packs to use: ${packsToUse.join(', ')}`);
        console.log(`[Engine] Available custom decks: ${Object.keys(customDecks).join(', ')}`);

        packsToUse.forEach(id => {
            if (customDecks[id]) {
                console.log(`[Engine] Adding custom deck: ${id}`);
                // Ensure custom cards have IDs
                // Support both 'black' and 'blackCards' keys
                const blackCards = customDecks[id].black || customDecks[id].blackCards || [];
                const whiteCards = customDecks[id].white || customDecks[id].whiteCards || [];

                const blackWithIds = blackCards.map((c, i) => ({
                    ...c,
                    id: c.id || `custom_${id}_black_${i}`
                }));
                const whiteWithIds = whiteCards.map((c, i) => ({
                    ...c,
                    id: c.id || `custom_${id}_white_${i}`
                }));

                allBlackCards = [...allBlackCards, ...blackWithIds];
                allWhiteCards = [...allWhiteCards, ...whiteWithIds];
            } else if (id.startsWith('deck_')) {
                console.warn(`[Engine] Custom deck ${id} not found in manager!`);
            }
        });

        if (allBlackCards.length === 0 || allWhiteCards.length === 0) {
            console.error(`[Engine] No cards found! Black: ${allBlackCards.length}, White: ${allWhiteCards.length}`);
            return { success: false, message: 'No cards in selected packs' };
        }

        // Final safety pass: ensure every card has a unique string ID
        const timestamp = Date.now();
        allBlackCards = allBlackCards.map((c, i) => ({
            ...c,
            id: String((c.id !== undefined && c.id !== null) ? c.id : `b_${i}_${timestamp}_${Math.random().toString(36).substr(2, 5)}`),
            pick: Number(c.pick || 1)
        }));
        allWhiteCards = allWhiteCards.map((c, i) => ({
            ...c,
            id: String((c.id !== undefined && c.id !== null) ? c.id : `w_${i}_${timestamp}_${Math.random().toString(36).substr(2, 5)}`)
        }));

        console.log(`[Engine] Starting game with ${allBlackCards.length} black and ${allWhiteCards.length} white cards.`);

        this.blackCardDeck = shuffleArray(allBlackCards);
        this.whiteCardDeck = shuffleArray(allWhiteCards);

        this.gameStarted = true;
        this.currentRound = 0;

        // Deal initial hands to all players
        this.players.forEach(player => {
            player.hand = []; // Clear any existing cards
            this.dealCards(player, config.HAND_SIZE);
        });

        // Start first round
        this.startNewRound();

        return { success: true };
    }

    dealCards(player, count) {
        console.log(`[Engine] Dealing ${count} cards to ${player.name}. Current hand size: ${player.hand.length}`);
        for (let i = 0; i < count; i++) {
            if (this.whiteCardDeck.length === 0) {
                console.log('[Engine] White card deck empty! Reshuffling discard pile...');
                this.whiteCardDeck = shuffleArray(this.discardedWhiteCards);
                this.discardedWhiteCards = [];
            }

            if (this.whiteCardDeck.length > 0) {
                player.hand.push(this.whiteCardDeck.pop());
            }
        }
        console.log(`[Engine] New hand size for ${player.name}: ${player.hand.length}`);
    }

    startNewRound() {
        this.currentRound++;
        this.submissions.clear();
        this.roundWinner = null;
        this.phase = 'playing';

        // Reset swaps for all players
        this.players.forEach(p => p.swapsRemaining = 3);

        // Pick a black card
        if (this.blackCardDeck.length === 0) {
            console.log('[Engine] Black card deck empty. Game over.');
            this.endGame();
            return false;
        }
        this.currentBlackCard = this.blackCardDeck.pop();

        // Rotate card czar
        const currentCzarIndex = this.players.findIndex(p => p.id === this.currentCzarId);
        // Handle edge case where czar was removed (-1 index)
        const nextCzarIndex = currentCzarIndex === -1 ? 0 : (currentCzarIndex + 1) % this.players.length;
        this.currentCzarId = this.players[nextCzarIndex].id;
        return true;
    }

    submitCard(playerId, cardIds) {
        console.log(`[Engine] submitCard from ${playerId}:`, cardIds);
        if (this.phase !== 'playing') {
            return { success: false, message: 'Not in playing phase' };
        }

        if (playerId === this.currentCzarId) {
            return { success: false, message: 'Czar cannot submit cards' };
        }

        if (this.submissions.has(playerId)) {
            return { success: false, message: 'Already submitted' };
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: 'Player not found' };
        }

        // Validate number of cards
        if (!this.currentBlackCard || cardIds.length !== this.currentBlackCard.pick) {
            const required = this.currentBlackCard ? this.currentBlackCard.pick : 1;
            return { success: false, message: `Must select ${required} cards` };
        }

        // Validate cards are in player's hand
        // Use robust string comparison for IDs
        const cardsToSubmit = [];
        const handIds = player.hand.map(c => String(c.id));

        for (const id of cardIds) {
            const idStr = String(id);
            const card = player.hand.find(c => String(c.id) === idStr);
            if (!card) {
                console.error(`[Engine] Card ${idStr} not found in ${player.name}'s hand. Hand IDs:`, handIds);
                return {
                    success: false,
                    message: `Card ${idStr} not in hand. Your hand: ${handIds.join(', ')}`
                };
            }
            cardsToSubmit.push(card);
        }

        // Store submission
        this.submissions.set(playerId, cardsToSubmit);

        // Remove cards from hand - use robust comparison
        const cardIdStrings = cardIds.map(id => String(id));
        player.hand = player.hand.filter(card => !cardIdStrings.includes(String(card.id)));

        // Add to discard pile
        this.discardedWhiteCards.push(...cardsToSubmit);

        // Check if all non-czar players have submitted
        // Only count connected players to prevent game freeze when players disconnect
        const nonCzarPlayers = this.players.filter(p => p.id !== this.currentCzarId && p.connected);
        if (this.submissions.size === nonCzarPlayers.length) {
            this.phase = 'judging';
        }

        return { success: true };
    }

    swapCards(playerId, cardIds) {
        if (this.phase !== 'playing') {
            return { success: false, message: 'Can only swap during playing phase' };
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: 'Player not found' };
        }

        if (playerId === this.currentCzarId) {
            return { success: false, message: 'Czar cannot swap cards' };
        }

        if (player.swapsRemaining < cardIds.length) {
            return { success: false, message: `Not enough swaps remaining (have ${player.swapsRemaining})` };
        }

        // Validate cards are in hand
        const cardIdStrings = cardIds.map(id => String(id));
        const cardsToSwap = player.hand.filter(card => cardIdStrings.includes(String(card.id)));

        if (cardsToSwap.length !== cardIds.length) {
            return { success: false, message: 'Some cards not found in hand' };
        }

        // Remove from hand
        player.hand = player.hand.filter(card => !cardIdStrings.includes(String(card.id)));

        // Add to discard pile
        this.discardedWhiteCards.push(...cardsToSwap);

        // Deal new cards
        this.dealCards(player, cardsToSwap.length);

        // Decrement swaps
        player.swapsRemaining -= cardIds.length;

        console.log(`[Engine] ${player.name} swapped ${cardIds.length} cards. Swaps left: ${player.swapsRemaining}`);

        return { success: true, hand: player.hand, swapsRemaining: player.swapsRemaining };
    }

    selectWinner(czarId, winnerId) {
        if (this.phase !== 'judging') {
            return { success: false, message: 'Not in judging phase' };
        }

        if (czarId !== this.currentCzarId) {
            return { success: false, message: 'Only czar can select winner' };
        }

        if (!this.submissions.has(winnerId)) {
            return { success: false, message: 'Invalid winner' };
        }

        const winner = this.players.find(p => p.id === winnerId);
        if (winner) {
            winner.score++;
            this.roundWinner = winnerId;
            this.phase = 'roundEnd';

            // Check for game winner
            if (winner.score >= config.WINNING_SCORE) {
                this.endGame(winner);
                return { success: true, gameOver: true, winner: this.finalWinner, leaderboard: this.finalLeaderboard };
            }
        }

        return { success: true, gameOver: false };
    }

    nextRound() {
        if (this.phase !== 'roundEnd') {
            return { success: false, message: 'Not at round end' };
        }

        // Deal replacement cards to players who submitted
        this.submissions.forEach((cards, playerId) => {
            const player = this.players.find(p => p.id === playerId);
            if (player) {
                this.dealCards(player, cards.length);
            }
        });

        const roundStarted = this.startNewRound();
        if (!roundStarted) {
            // Game over because deck is empty
            return {
                success: true,
                gameOver: true,
                winner: this.finalWinner,
                leaderboard: this.finalLeaderboard
            };
        }

        return { success: true, gameOver: false };
    }

    endGame(winner = null) {
        this.phase = 'gameOver';
        const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
        this.finalLeaderboard = sortedPlayers.map(p => ({ name: p.name, score: p.score }));
        this.finalWinner = winner || sortedPlayers[0];
        console.log(`[Engine] Game Over. Winner: ${this.finalWinner.name}`);
    }

    getGameState() {
        return {
            roomCode: this.roomCode,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                connected: p.connected,
                swapsRemaining: p.swapsRemaining,
            })),
            gameStarted: this.gameStarted,
            currentBlackCard: this.currentBlackCard,
            currentCzarId: this.currentCzarId,
            phase: this.phase,
            currentRound: this.currentRound,
            roundWinner: this.roundWinner,
            submissionCount: this.submissions.size,
            submissions: (this.phase === 'judging' || this.phase === 'roundEnd') ? this.getSubmissions() : [],
            selectedPacks: this.selectedPacks,
            availablePacks: this.getAvailablePacks(),
            winner: this.finalWinner,
            leaderboard: this.finalLeaderboard
        };
    }

    getPlayerHand(playerId) {
        const player = this.players.find(p => p.id === playerId);
        return player ? player.hand : [];
    }

    getSubmissions() {
        // Return submissions as array without revealing player IDs
        const submissions = [];
        this.submissions.forEach((cards, playerId) => {
            submissions.push({
                playerId,
                cards,
            });
        });
        // Shuffle so czar can't guess based on order
        return shuffleArray(submissions);
    }

    getAvailablePacks() {
        const builtInPacks = packs.map(p => ({ id: p.id, name: p.name }));

        // Add custom decks
        const customDecks = require('./deck-manager').getAll();
        const customPackList = Object.keys(customDecks).map(id => ({
            id: id,
            name: customDecks[id].name + ' (Custom)',
            isCustom: true
        }));

        return [...builtInPacks, ...customPackList];
    }

    updateSettings(settings) {
        if (settings.packs) {
            this.selectedPacks = settings.packs;
        }
        return { success: true };
    }
}

module.exports = GameEngine;
