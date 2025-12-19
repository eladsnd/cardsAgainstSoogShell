const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Game = require('./game-logic');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Store active games
const games = new Map(); // roomCode -> Game

// Generate a random 4-character room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

io.on('connection', (socket) => {

    // Create a new game room
    socket.on('createRoom', (playerName, callback) => {
        let roomCode = generateRoomCode();

        // Ensure room code is unique
        while (games.has(roomCode)) {
            roomCode = generateRoomCode();
        }

        const game = new Game(roomCode);
        game.addPlayer(socket.id, playerName);
        games.set(roomCode, game);

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;

        callback({ success: true, roomCode });

        // Send initial game state
        io.to(roomCode).emit('gameState', game.getGameState());
    });

    // Join an existing room
    socket.on('joinRoom', (roomCode, playerName, callback) => {
        roomCode = roomCode.toUpperCase();
        const game = games.get(roomCode);

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

            socket.join(roomCode);
            socket.data.roomCode = roomCode;
            socket.data.playerName = playerName;

            console.log(`${playerName} rejoined room: ${roomCode}`);

            callback({ success: true, roomCode });

            // Send current game state
            io.to(roomCode).emit('gameState', game.getGameState());

            // If game started, send them their hand
            if (game.gameStarted) {
                io.to(socket.id).emit('yourHand', game.getPlayerHand(socket.id));
            }

            io.to(roomCode).emit('playerJoined', { playerName: playerName + ' (rejoined)' });
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

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;

        callback({ success: true, roomCode });

        // Broadcast updated game state to all players
        io.to(roomCode).emit('gameState', game.getGameState());
        io.to(roomCode).emit('playerJoined', { playerName });
    });

    // Start the game
    socket.on('startGame', (callback) => {
        const roomCode = socket.data.roomCode;
        const game = games.get(roomCode);

        if (!game) {
            callback({ success: false, message: 'Room not found' });
            return;
        }

        const result = game.startGame();
        callback(result);

        if (result.success) {
            // Send game state to everyone
            io.to(roomCode).emit('gameState', game.getGameState());

            // Send each player their hand
            game.players.forEach(player => {
                io.to(player.id).emit('yourHand', game.getPlayerHand(player.id));
            });
        }
    });

    // Submit cards for current round
    socket.on('submitCards', (cardIds, callback) => {
        const roomCode = socket.data.roomCode;
        const game = games.get(roomCode);

        if (!game) {
            callback({ success: false, message: 'Room not found' });
            return;
        }

        const result = game.submitCard(socket.id, cardIds);
        callback(result);

        if (result.success) {
            // Broadcast updated game state
            io.to(roomCode).emit('gameState', game.getGameState());

            // If all submissions are in, send them to the czar
            if (game.phase === 'judging') {
                io.to(game.currentCzarId).emit('submissions', game.getSubmissions());
            }
        }
    });

    // Czar selects winner
    socket.on('selectWinner', (winnerId, callback) => {
        const roomCode = socket.data.roomCode;
        const game = games.get(roomCode);

        if (!game) {
            callback({ success: false, message: 'Room not found' });
            return;
        }

        const result = game.selectWinner(socket.id, winnerId);
        callback(result);

        if (result.success) {
            // Send winner info and submissions to everyone
            io.to(roomCode).emit('roundWinner', {
                winnerId: game.roundWinner,
                submissions: game.getSubmissions(),
                gameOver: result.gameOver,
                winner: result.winner,
            });

            // Update game state
            io.to(roomCode).emit('gameState', game.getGameState());
        }
    });

    // Continue to next round
    socket.on('nextRound', (callback) => {
        const roomCode = socket.data.roomCode;
        const game = games.get(roomCode);

        if (!game) {
            callback({ success: false, message: 'Room not found' });
            return;
        }

        const result = game.nextRound();
        callback(result);

        if (result.success) {
            // Send updated game state
            io.to(roomCode).emit('gameState', game.getGameState());

            // Send updated hands to all players
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
            const game = games.get(roomCode);
            if (game) {
                const wasCzar = game.currentCzarId === socket.id;

                // Remove player from game
                game.removePlayer(socket.id);

                console.log(`${playerName} left room: ${roomCode}`);

                // Notify other players
                io.to(roomCode).emit('playerLeft', { playerName });
                io.to(roomCode).emit('gameState', game.getGameState());

                // If czar left during game, rotate to next player
                if (wasCzar && game.gameStarted && game.players.length > 0) {
                    game.currentCzarId = game.players[0].id;
                    io.to(roomCode).emit('gameState', game.getGameState());
                }

                // Delete room if empty
                if (game.players.length === 0) {
                    games.delete(roomCode);
                }
            }

            socket.leave(roomCode);
            socket.data.roomCode = null;
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const roomCode = socket.data.roomCode;
        if (roomCode) {
            const game = games.get(roomCode);
            if (game) {
                const player = game.players.find(p => p.id === socket.id);
                if (player) {
                    player.connected = false;
                    io.to(roomCode).emit('playerLeft', { playerName: player.name });
                    io.to(roomCode).emit('gameState', game.getGameState());

                    // Clean up empty rooms
                    if (game.players.every(p => !p.connected)) {
                        games.delete(roomCode);
                    }
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`✨ Cards Against Soog server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
    console.log(`📱 To play with friends, use ngrok: npx ngrok http ${PORT}`);
});
