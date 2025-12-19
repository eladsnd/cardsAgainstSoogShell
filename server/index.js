const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('../config');
const socketHandler = require('./socket/handler');
const internalIp = require('internal-ip');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = config.PORT;

// Serve static files
app.use(express.static('public'));

// Initialize socket handler
socketHandler(io);

// Start server
server.listen(PORT, async () => {
    const ip = await internalIp.v4();
    const localUrl = `http://${ip}:${PORT}`;
    const localhostUrl = `http://localhost:${PORT}`;

    console.log('\n✨ Cards Against Soog Server Running! ✨\n');
    console.log(`🏠 Local:           ${localhostUrl}`);
    console.log(`📡 On Your Network: ${localUrl}`);
    console.log('\n📱 Scan this QR Code to join from your phone:\n');

    // Generate QR Code for terminal
    qrcode.toString(localUrl, { type: 'terminal', small: true }, (err, url) => {
        if (err) console.error(err);
        console.log(url);
    });

    // API endpoint to get local IP for frontend QR code
    app.get('/api/local-ip', (req, res) => {
        res.json({ ip, port: PORT, url: localUrl });
    });

    // Deck API Routes
    const deckManager = require('./game/deck-manager');

    app.use(express.json()); // Ensure JSON body parsing

    app.get('/api/decks', (req, res) => {
        res.json(deckManager.getAll());
    });

    app.post('/api/decks', (req, res) => {
        const { id, deck } = req.body;
        if (!id || !deck) return res.status(400).json({ error: 'Missing id or deck' });

        if (deckManager.createOrUpdate(id, deck)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to save deck' });
        }
    });

    app.delete('/api/decks/:id', (req, res) => {
        if (deckManager.delete(req.params.id)) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Deck not found' });
        }
    });
});
