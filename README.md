# 🎯 Multiplayer Number Guessing Game

A real-time online multiplayer number guessing game where two players compete by taking turns setting and guessing secret numbers.

## Game Concept

- **Player 1** sets a secret number (1-100)
- **Player 2** tries to guess it
- After each guess, clues are shown: "Upore" (Higher) or "Niche" (Lower)
- When guessed correctly, players switch roles automatically

## Features

✅ Real-time multiplayer using Socket.IO
✅ Room-based gameplay with unique codes
✅ Role switching after each round
✅ Guess counter and history
✅ Responsive mobile-friendly UI
✅ Graceful disconnect handling
✅ Clean, modern interface

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Real-time**: Socket.IO
- **Database**: Firebase Realtime Database (optional - currently using in-memory storage)

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Steps

1. **Install dependencies**
```bash
npm install
```

2. **Firebase is already configured!**
   - Service account credentials are included in the project
   - Database URL is set to your Firebase Realtime Database

3. **Run the server**
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:3000
```

5. **Test multiplayer**
   - Open two browser windows/tabs
   - Create a room in one window
   - Join with the room code in the other window

## How to Play

1. **Create/Join Room**
   - Player 1: Enter name → Click "Create Room" → Share room code
   - Player 2: Enter name → Click "Join Room" → Enter room code

2. **Set Secret Number**
   - Player 1 sets a number between 1-100
   - Number remains hidden from Player 2

3. **Guess the Number**
   - Player 2 makes guesses
   - Receives clues: "Upore" (go higher) or "Niche" (go lower)
   - Guess counter tracks attempts

4. **Win & Switch**
   - Correct guess shows success message
   - Roles automatically switch
   - New round begins

## Project Structure

```
multiplayer-guessing-game/
├── public/
│   ├── index.html      # Main HTML structure
│   ├── style.css       # Styling and animations
│   └── game.js         # Client-side game logic
├── server.js           # Server and Socket.IO logic
├── package.json        # Dependencies
└── README.md          # Documentation
```

## Socket Events

### Client → Server
- `createRoom` - Create new game room
- `joinRoom` - Join existing room
- `setSecret` - Set secret number
- `submitGuess` - Submit a guess

### Server → Client
- `roomCreated` - Room created successfully
- `playerJoined` - Second player joined
- `startGuessing` - Begin guessing phase
- `waitingForGuess` - Waiting for guesser
- `guessResult` - Result of a guess
- `gameWon` - Correct guess, game won
- `playerDisconnected` - Other player left
- `error` - Error message

## Future Enhancements

- [ ] Firebase integration for persistent game state
- [ ] Player chat system
- [ ] Timer per guess
- [ ] Sound effects
- [ ] Win/loss statistics
- [ ] Leaderboard
- [ ] Custom number ranges
- [ ] Multiple rounds with scoring

## License

MIT
