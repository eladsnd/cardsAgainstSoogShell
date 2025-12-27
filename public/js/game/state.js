/**
 * Game State Manager
 * Handles client-side state
 */

export class GameState {
    constructor() {
        this.roomCode = null;
        this.playerName = null;
        this.isCzar = false;
        this.hand = [];
        this.selectedCards = [];
        this.gameData = null;
        this.swapsRemaining = 3;
    }

    update(serverState) {
        this.gameData = serverState;
        this.roomCode = serverState?.roomCode;

        // Find self in players list
        // Note: Socket ID check needs to be done in controller
    }

    get currentPhase() {
        return this.gameData?.phase || 'lobby';
    }

    get pickCount() {
        return this.gameData?.currentBlackCard?.pick || 1;
    }

    get timerEnabled() { return this.gameData?.timerEnabled || false; }
    get timerDuration() { return this.gameData?.timerDuration || 40; }
    get timerRemaining() { return this.gameData?.timerRemaining || 0; }
    get timerRunning() { return this.gameData?.timerRunning || false; }
    get phase() { return this.gameData?.phase || 'lobby'; }
}
