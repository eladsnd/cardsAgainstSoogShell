const { blackCards, whiteCards, shuffleArray } = require('./cards-data');

const CARDS_PER_HAND = 7;
const WINNING_SCORE = 5;

class Game {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = [];
        this.gameStarted = false;
        this.currentBlackCard = null;
        this.currentCzarId = null;
        this.submissions = new Map(); // playerId -> whiteCardIds
        this.roundWinner = null;
        this.blackCardDeck = shuffleArray(blackCards);
        this.whiteCardDeck = shuffleArray(whiteCards);
        this.discardedWhiteCards = [];
        this.currentRound = 0;
        this.phase = 'lobby'; // lobby, playing, judging, roundEnd
    }

    addPlayer(playerId, playerName) {
        if (this.players.find(p => p.id === playerId)) {
            return false;
        }

        const player = {
            id: playerId,
            name: playerName,
            hand: [],
            score: 0,
            connected: true,
        };

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

    startGame() {
        if (this.players.length < 3) {
            return { success: false, message: 'Need at least 3 players to start' };
        }

        this.gameStarted = true;
        this.currentRound = 0;

        // Deal initial hands to all players
        this.players.forEach(player => {
            this.dealCards(player, CARDS_PER_HAND);
        });

        // Start first round
        this.startNewRound();

        return { success: true };
    }

    dealCards(player, count) {
        for (let i = 0; i < count; i++) {
            if (this.whiteCardDeck.length === 0) {
                // Reshuffle discarded cards if deck is empty
                this.whiteCardDeck = shuffleArray(this.discardedWhiteCards);
                this.discardedWhiteCards = [];
            }

            if (this.whiteCardDeck.length > 0) {
                player.hand.push(this.whiteCardDeck.pop());
            }
        }
    }

    startNewRound() {
        this.currentRound++;
        this.submissions.clear();
        this.roundWinner = null;
        this.phase = 'playing';

        // Pick a black card
        if (this.blackCardDeck.length === 0) {
            this.blackCardDeck = shuffleArray(blackCards);
        }
        this.currentBlackCard = this.blackCardDeck.pop();

        // Rotate card czar
        const currentCzarIndex = this.players.findIndex(p => p.id === this.currentCzarId);
        const nextCzarIndex = (currentCzarIndex + 1) % this.players.length;
        this.currentCzarId = this.players[nextCzarIndex].id;
    }

    submitCard(playerId, cardIds) {
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

        // Validate cards are in player's hand
        const cardsToSubmit = cardIds.map(id =>
            player.hand.find(card => card.id === id)
        );

        if (cardsToSubmit.some(card => !card)) {
            return { success: false, message: 'Invalid cards' };
        }

        // Store submission
        this.submissions.set(playerId, cardsToSubmit);

        // Remove cards from hand
        player.hand = player.hand.filter(card => !cardIds.includes(card.id));

        // Add to discard pile
        this.discardedWhiteCards.push(...cardsToSubmit);

        // Check if all non-czar players have submitted
        const nonCzarPlayers = this.players.filter(p => p.id !== this.currentCzarId);
        if (this.submissions.size === nonCzarPlayers.length) {
            this.phase = 'judging';
        }

        return { success: true };
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
            if (winner.score >= WINNING_SCORE) {
                return { success: true, gameOver: true, winner };
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

        this.startNewRound();
        return { success: true };
    }

    getGameState() {
        return {
            roomCode: this.roomCode,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                connected: p.connected,
            })),
            gameStarted: this.gameStarted,
            currentBlackCard: this.currentBlackCard,
            currentCzarId: this.currentCzarId,
            phase: this.phase,
            currentRound: this.currentRound,
            roundWinner: this.roundWinner,
            submissionCount: this.submissions.size,
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
}

module.exports = Game;
