# Cards Against Soog 🎴

A real-time multiplayer Cards Against Humanity game where friends can connect from their phones and play together!

## Features

- ✨ Real-time multiplayer gameplay using Socket.IO
- 📱 Mobile-responsive design - works on all devices
- 🎨 Modern UI with dark theme and smooth animations
- 👥 Support for 3-10 players
- 🎲 Family-friendly card deck included
- 🚀 Easy setup with ngrok for playing with remote friends

## How to Play

1. One player creates a room and shares the room code
2. Other players join using the room code
3. Once at least 3 players have joined, the host starts the game
4. Each round:
   - One player is the "Card Czar"
   - A black card (question) is revealed
   - All non-czar players select their funniest white card (answer)
   - The czar picks the funniest answer
   - That player gets a point!
5. First player to 5 points wins! 🎉

## Installation & Setup

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Local Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to:
```
http://localhost:3000
```

### Playing with Friends (Remote)

To play with friends who aren't on your local network, you'll need to expose your server to the internet using ngrok:

1. Keep your server running (from step 2 above)

2. In a **new terminal**, run:
```bash
npx ngrok http 3000
```

3. ngrok will give you a public URL (e.g., `https://abc123.ngrok.io`)

4. Share this URL with your friends - they can open it on their phones!

5. Create a room, share the room code, and start playing! 🎮

## Customization

### Adding Your Own Cards

**Easy Way - Card Creator Tool:**

1. Open http://localhost:3000/creator.html in your browser (while server is running)
2. Add your custom black cards (questions) and white cards (answers)
3. Click "Copy to Clipboard" or "Download cards-data.js"
4. Replace the contents of `cards-data.js` with your new cards
5. Restart the server: `npm start`

**Manual Way:**

Edit `cards-data.js` to add your own cards:

- **Black cards** (questions): Add to the `blackCards` array
  - `text`: The question (use `_____` for blanks)
  - `pick`: Number of white cards needed (usually 1)

- **White cards** (answers): Add to the `whiteCards` array
  - `text`: The answer text

### Changing Game Settings

Edit `game-logic.js`:
- `CARDS_PER_HAND`: Number of cards each player holds (default: 7)
- `WINNING_SCORE`: Points needed to win (default: 5)

## Tech Stack

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vanilla JavaScript + HTML + CSS
- **Real-time**: WebSockets via Socket.IO

## Deployment

For permanent hosting, you can deploy to:

- **Railway**: `railway up` (easiest)
- **Heroku**: Push to Heroku Git
- **Render**: Connect your GitHub repo
- **Vercel/Netlify**: Works with some configuration

The app will automatically use `process.env.PORT` when deployed.

## Troubleshooting

**Can't connect to the game?**
- Make sure the server is running (`npm start`)
- Check that you're using the correct URL/room code
- For remote play, ensure ngrok is running

**Game won't start?**
- You need at least 3 players to start
- Make sure you're the host (created the room)

**Cards not showing?**
- Try refreshing the page
- Check browser console for errors

## License

MIT

## Credits

Built with ❤️ for game nights with friends!

---

**Have fun and may the funniest player win!** 🎉
