# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cards Against Friends is a real-time multiplayer Cards Against Humanity game with support for 2-10 players. The game uses Socket.IO for real-time communication between players and supports both built-in and custom card decks.

## Development Commands

```bash
# Start the server in production mode
npm start

# Start the server with auto-reload (development)
npm run dev

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check
```

## Architecture Overview

### Server Architecture (Node.js + Express + Socket.IO)

The server follows a modular architecture with clear separation of concerns:

- **`server/index.js`**: Main entry point, sets up Express server, Socket.IO, and REST API endpoints for deck management
- **`server/socket/handler.js`**: Central socket event handler that processes all client events (createRoom, joinRoom, startGame, submitCards, etc.)
- **`server/game/engine.js`**: Core game engine (`GameEngine` class) containing all game logic including:
  - Player management (add/remove/reconnect)
  - Card dealing and deck management
  - Round lifecycle (playing → judging → roundEnd)
  - Scoring and winner selection
  - Card swapping mechanic (3 swaps per round)
- **`server/game/room-manager.js`**: Manages game room lifecycle (create, get, remove rooms)
- **`server/game/deck-manager.js`**: Handles custom deck persistence to `server/data/decks.json`

### Client Architecture (Vanilla JavaScript - ES6 Modules)

The client uses ES6 modules with a clean separation:

- **`public/js/main.js`**: Main application entry point (`App` class) that coordinates UI, state, and socket communication
- **`public/js/utils/socket-client.js`**: Socket.IO client wrapper (`SocketClient` class)
- **`public/js/ui/renderer.js`**: UI rendering logic (`UIRenderer` class)
- **`public/js/game/state.js`**: Client-side game state management (`GameState` class)
- **`public/constants.js`**: Shared constants used across client modules

### Game State Flow

1. **Lobby Phase**: Players join, host selects card packs
2. **Playing Phase**: Non-czar players submit cards (can swap up to 3 cards per round)
3. **Judging Phase**: Czar reviews submissions and selects winner
4. **Round End Phase**: Winner announced, points awarded
5. **Game Over**: First player to reach `WINNING_SCORE` (default: 7) wins

### Socket Events (Client ↔ Server)

**Client → Server:**
- `createRoom`, `joinRoom`, `leaveGame`
- `updateGameSettings` (pack selection)
- `startGame`
- `submitCards`, `swapCards`
- `selectWinner`, `nextRound`

**Server → Client:**
- `gameState` (full game state broadcast)
- `yourHand` (private hand data)
- `playerJoined`, `playerLeft`
- `submissions` (during judging phase)
- `roundWinner`

### Card Pack System

Card packs are defined in `cards-data.js` with this structure:
```javascript
{
  id: 'pack-id',
  name: 'Pack Name',
  black: [{ id, text, pick }],  // Question cards
  white: [{ id, text }]          // Answer cards
}
```

Custom decks are stored in `server/data/decks.json` and managed via REST API:
- `GET /api/decks` - Get all custom decks
- `POST /api/decks` - Create/update deck (body: `{ id, deck }`)
- `DELETE /api/decks/:id` - Delete deck

The game engine merges built-in packs and custom decks when starting a game.

### Player Reconnection

Players can reconnect to active games by rejoining with the same name. The engine (`engine.js:27-50`) handles reconnection by:
1. Finding existing player by name
2. Updating socket ID
3. Preserving hand, score, and submissions
4. Restoring czar status if applicable

### Configuration

All game settings are centralized in `config.js`:
- `MIN_PLAYERS`: 2
- `MAX_PLAYERS`: 10
- `WINNING_SCORE`: 7
- `HAND_SIZE`: 10
- `ROOM_CODE_LENGTH`: 4

## Key Implementation Details

### Card ID Handling
The engine uses robust string comparison for card IDs throughout (`engine.js:245-258`) to prevent type mismatch bugs between client and server.

### Deck Reshuffling
When the white card deck is depleted, the engine automatically reshuffles the discard pile (`engine.js:180-184`). If the black card deck runs out, the game ends (`engine.js:203-207`).

### Card Swapping
Each player gets 3 swaps per round. Swapped cards go to discard pile and new cards are dealt (`engine.js:279-320`). Swaps reset at the start of each round.

## Testing and Debugging

### Local Network Play
The server displays local network URL and QR code on startup for easy mobile device connection.

### Remote Play (ngrok)
```bash
# In a separate terminal while server is running
npx ngrok http 3000
```
Share the ngrok URL with remote players.

### Debug Mode
The client includes a debug utility at `public/js/debug.js` for development.

## File Organization

```
server/
  game/           # Game engine and managers
  socket/         # Socket.IO event handlers
  data/           # Runtime data (decks.json)
  index.js        # Server entry point

public/
  js/
    game/         # Client game logic
    ui/           # UI rendering
    utils/        # Socket client wrapper
  css/            # Stylesheets
  index.html      # Main game page
  creator.html    # Legacy card creator
  deck-creator.html # Deck management UI
```

## Adding New Features

When adding game features:
1. Update `GameEngine` class for server-side logic
2. Add socket events in `server/socket/handler.js`
3. Update client state in `public/js/game/state.js`
4. Add UI rendering in `public/js/ui/renderer.js`
5. Wire events in `public/js/main.js`
