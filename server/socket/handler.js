const roomManager = require('../game/room-manager');

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

            // Check if player is rejoining (same name exists in game)
            const existingPlayer = game.players.find(p => p.name === playerName);

            if (existingPlayer) {
                // Player is rejoining - update their socket ID
                existingPlayer.id = socket.id;
                existingPlayer.connected = true;

                socket.join(game.roomCode);
                socket.data.roomCode = game.roomCode;
                socket.data.playerName = playerName;

                console.log(`${playerName} rejoined room: ${game.roomCode}`);

                callback({ success: true, roomCode: game.roomCode });

                // Send current game state
                io.to(game.roomCode).emit('gameState', game.getGameState());

                // If game started, send them their hand
                if (game.gameStarted) {
                    io.to(socket.id).emit('yourHand', game.getPlayerHand(socket.id));
                }

                io.to(game.roomCode).emit('playerJoined', { playerName: playerName + ' (rejoined)' });
                return;
            }

            // New player joining
            if (game.gameStarted) {
                callback({ success: false, message: 'Game already in progress' });
                return;
            }

            const added = game.addPlayer(socket.id, playerName);
            if (!added) {
                callback({ success: false, message: 'Failed to join room' });
                return;
            }

            socket.join(game.roomCode);
            socket.data.roomCode = game.roomCode;
            socket.data.playerName = playerName;

            callback({ success: true, roomCode: game.roomCode });

            // Broadcast updated game state to all players
            io.to(game.roomCode).emit('gameState', game.getGameState());
            io.to(game.roomCode).emit('playerJoined', { playerName });
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

        // Leave game
        socket.on('leaveGame', () => {
            const roomCode = socket.data.roomCode;
            const playerName = socket.data.playerName;

            if (roomCode) {
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
            if (roomCode) {
                const game = roomManager.getGame(roomCode);
                if (game) {
                    const player = game.players.find(p => p.id === socket.id);
                    if (player) {
                        player.connected = false;
                        io.to(roomCode).emit('playerLeft', { playerName: player.name });
                        io.to(roomCode).emit('gameState', game.getGameState());

                        if (game.players.every(p => !p.connected)) {
                            roomManager.removeGame(roomCode);
                        }
                    }
                }
            }
        });
    });
};
