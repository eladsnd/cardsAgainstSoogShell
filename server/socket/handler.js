const roomManager = require('../game/room-manager');

const DISCONNECT_TIMEOUT = 30000; // 30 seconds
const reconnectionTimeouts = new Map(); // "roomCode:playerName" -> { timeoutId, socketId }

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Create a new game room
        socket.on('createRoom', (playerName, callback) => {
            const { roomCode, game } = roomManager.createRoom(playerName, socket.id);

            socket.join(roomCode);
            socket.data.roomCode = roomCode;
            socket.data.playerName = playerName;

            callback({ success: true, roomCode });

            // Send initial game state
            io.to(roomCode).emit('gameState', game.getGameState());
        });

        // Join an existing room
        socket.on('joinRoom', (roomCode, playerName, callback) => {
            const game = roomManager.getGame(roomCode);

            if (!game) {
                callback({ success: false, message: 'Room not found' });
                return;
            }

            // Clear any pending disconnect timeout for this player
            const timeoutKey = `${roomCode}:${playerName}`;
            if (reconnectionTimeouts.has(timeoutKey)) {
                clearTimeout(reconnectionTimeouts.get(timeoutKey).timeoutId);
                reconnectionTimeouts.delete(timeoutKey);
                console.log(`[Socket] Reconnection grace period cancelled for ${playerName}`);
            }

            const success = game.addPlayer(socket.id, playerName);
            if (!success) {
                callback({ success: false, message: 'Failed to join room' });
                return;
            }

            // Set socket data
            socket.data.roomCode = roomCode;
            socket.data.playerName = playerName;
            socket.join(roomCode);

            console.log(`[Socket] ${playerName} joined/reconnected to room: ${roomCode} (ID: ${socket.id})`);

            callback({ success: true, roomCode });

            // Send current game state to the player who just joined
            socket.emit('gameState', game.getGameState());

            // If game started, send them their hand (new or reconnected)
            if (game.gameStarted) {
                const hand = game.getPlayerHand(socket.id);
                console.log(`[Socket] Sending hand to ${playerName} (${hand.length} cards)`);
                socket.emit('yourHand', hand);
            }

            // Broadcast updated game state to everyone
            io.to(roomCode).emit('playerJoined', { playerName });
            io.to(roomCode).emit('gameState', game.getGameState());
        });

        // Update game settings (packs)
        socket.on('updateGameSettings', (settings, callback) => {
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) {
                callback({ success: false, message: 'Room not found' });
                return;
            }

            const result = game.updateSettings(settings);
            callback(result);

            if (result.success) {
                // Broadcast new settings to all players in room
                io.to(game.roomCode).emit('gameState', game.getGameState());
            }
        });

        // Start the game
        socket.on('startGame', (callback) => {
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) {
                callback({ success: false, message: 'Room not found' });
                return;
            }

            const result = game.startGame();
            callback(result);

            if (result.success) {
                io.to(game.roomCode).emit('gameState', game.getGameState());
                game.players.forEach(player => {
                    io.to(player.id).emit('yourHand', game.getPlayerHand(player.id));
                });
            }
        });

        // Submit cards
        socket.on('submitCards', (cardIds, callback) => {
            console.log(`[Socket] submitCards from ${socket.id} (${socket.data.playerName}):`, cardIds);
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) {
                console.error(`[Socket] Room not found for submission: ${socket.data.roomCode}`);
                callback({ success: false, message: 'Room not found' });
                return;
            }

            const result = game.submitCard(socket.id, cardIds);
            console.log(`[Socket] submitCard result:`, result);
            callback(result);

            if (result.success) {
                io.to(game.roomCode).emit('gameState', game.getGameState());
                if (game.phase === 'judging') {
                    // Send submissions to everyone so they can see what's being judged
                    io.to(game.roomCode).emit('submissions', game.getSubmissions());
                }
            }
        });

        // Select winner
        socket.on('swapCards', (cardIds, callback) => {
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) return callback({ success: false, message: 'Game not found' });

            const result = game.swapCards(socket.id, cardIds);
            callback(result);

            if (result.success) {
                // Send updated hand to the player
                socket.emit('yourHand', result.hand);
                // Broadcast updated game state (for swap counts)
                io.to(game.roomCode).emit('gameState', game.getGameState());
            }
        });

        // Trade black card (Czar only)
        socket.on('tradeBlackCard', (callback) => {
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) return callback({ success: false, message: 'Game not found' });

            const result = game.tradeBlackCard(socket.id);
            callback(result);

            if (result.success) {
                // Broadcast updated game state to show new black card
                io.to(game.roomCode).emit('gameState', game.getGameState());
            }
        });

        socket.on('toggleTimer', (callback) => {
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) return callback({ success: false, message: 'Game not found' });

            const result = game.toggleTimer(io, game.roomCode, socket.id);
            callback(result);

            if (result.success) {
                io.to(game.roomCode).emit('gameState', game.getGameState());
            }
        });

        socket.on('selectWinner', (winnerId, callback) => {
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) {
                callback({ success: false, message: 'Room not found' });
                return;
            }

            const result = game.selectWinner(socket.id, winnerId);
            callback(result);

            if (result.success) {
                io.to(game.roomCode).emit('roundWinner', {
                    winnerId: game.roundWinner,
                    submissions: game.getSubmissions(),
                    gameOver: result.gameOver,
                    winner: result.winner,
                });
                io.to(game.roomCode).emit('gameState', game.getGameState());
            }
        });

        // Next round
        socket.on('nextRound', (callback) => {
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) {
                callback({ success: false, message: 'Room not found' });
                return;
            }

            const result = game.nextRound();
            callback(result);

            if (result.success) {
                io.to(game.roomCode).emit('gameState', game.getGameState());
                game.players.forEach(player => {
                    io.to(player.id).emit('yourHand', game.getPlayerHand(player.id));
                });
            }
        });

        // End game manually
        socket.on('endGame', (callback) => {
            console.log(`[Socket] endGame requested by ${socket.id} in room ${socket.data.roomCode}`);
            const game = roomManager.getGame(socket.data.roomCode);
            if (!game) {
                console.error(`[Socket] Room not found: ${socket.data.roomCode}`);
                callback({ success: false, message: 'Room not found' });
                return;
            }

            if (!game.gameStarted) {
                console.error(`[Socket] Game not started in room ${socket.data.roomCode}`);
                callback({ success: false, message: 'Game has not started' });
                return;
            }

            // End the game and calculate final standings
            const result = game.forceEndGame();
            console.log(`[Socket] forceEndGame result:`, result);
            callback(result);

            if (result.success) {
                console.log(`[Socket] Broadcasting gameState to room ${game.roomCode}`);
                io.to(game.roomCode).emit('gameState', game.getGameState());
            }
        });

        // Leave game
        socket.on('leaveGame', () => {
            const roomCode = socket.data.roomCode;
            const playerName = socket.data.playerName;

            if (roomCode) {
                // Clear any pending reconnection timeout
                const timeoutKey = `${roomCode}:${playerName}`;
                if (reconnectionTimeouts.has(timeoutKey)) {
                    clearTimeout(reconnectionTimeouts.get(timeoutKey).timeoutId);
                    reconnectionTimeouts.delete(timeoutKey);
                }

                const game = roomManager.getGame(roomCode);
                if (game) {
                    const wasCzar = game.currentCzarId === socket.id;
                    game.removePlayer(socket.id);

                    console.log(`${playerName} left room: ${roomCode}`);

                    io.to(roomCode).emit('playerLeft', { playerName });
                    io.to(roomCode).emit('gameState', game.getGameState());

                    if (wasCzar && game.gameStarted && game.players.length > 0) {
                        game.currentCzarId = game.players[0].id;
                        io.to(roomCode).emit('gameState', game.getGameState());
                    }

                    if (game.players.length === 0) {
                        roomManager.removeGame(roomCode);
                    }
                }
                socket.leave(roomCode);
                socket.data.roomCode = null;
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            const roomCode = socket.data.roomCode;
            const playerName = socket.data.playerName;

            if (roomCode && playerName) {
                const game = roomManager.getGame(roomCode);
                if (game) {
                    const player = game.players.find(p => p.id === socket.id);
                    if (player) {
                        player.connected = false;
                        console.log(`[Socket] ${playerName} disconnected. Starting 30s grace period.`);

                        io.to(roomCode).emit('playerLeft', { playerName: player.name });
                        io.to(roomCode).emit('gameState', game.getGameState());

                        // Start grace period timeout
                        const timeoutKey = `${roomCode}:${playerName}`;

                        // Clear any existing timeout for this name (safety)
                        if (reconnectionTimeouts.has(timeoutKey)) {
                            clearTimeout(reconnectionTimeouts.get(timeoutKey).timeoutId);
                        }

                        const timeoutId = setTimeout(() => {
                            const currentGame = roomManager.getGame(roomCode);
                            if (currentGame) {
                                const p = currentGame.players.find(p => p.name === playerName);
                                // Only clean up if they are STILL disconnected
                                if (p && !p.connected) {
                                    console.log(`[Socket] Grace period expired for ${playerName}. cleaning up.`);

                                    const wasCzar = currentGame.currentCzarId === p.id;

                                    // If they were Czar, reassign
                                    if (wasCzar && currentGame.gameStarted) {
                                        const connectedPlayers = currentGame.players.filter(p => p.connected);
                                        if (connectedPlayers.length > 0) {
                                            currentGame.currentCzarId = connectedPlayers[0].id;
                                            console.log(`[Socket] Reassigned Czar from ${playerName} to ${connectedPlayers[0].name}`);
                                            io.to(roomCode).emit('gameState', currentGame.getGameState());
                                        }
                                    }

                                    // If everyone is gone, remove room
                                    if (currentGame.players.every(p => !p.connected)) {
                                        console.log(`[Socket] Room ${roomCode} empty. Removing.`);
                                        roomManager.removeGame(roomCode);
                                    }
                                }
                            }
                            reconnectionTimeouts.delete(timeoutKey);
                        }, DISCONNECT_TIMEOUT);

                        reconnectionTimeouts.set(timeoutKey, { timeoutId, socketId: socket.id });
                    }
                }
            }
        });
    });
};
