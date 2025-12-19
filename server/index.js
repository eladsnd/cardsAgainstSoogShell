const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const config = require('../config');
const socketHandler = require('./socket/handler');
const internalIp = require('internal-ip');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
});
