# 🚀 Quick Start Guide

## Your game is ready to play!

### Start the Server

```bash
npm start
```

You should see:
```
✅ Firebase initialized successfully
Server running on port 3000
```

### Play the Game

1. **Open your browser**: `http://localhost:3000`

2. **Test multiplayer** (open 2 browser windows):
   
   **Window 1 (Player 1):**
   - Enter your name
   - Click "Create Room"
   - Copy the room code (e.g., "ABC123")
   
   **Window 2 (Player 2):**
   - Enter your name
   - Click "Join Room"
   - Enter the room code
   - Click "Join"

3. **Play:**
   - Player 1 sets a secret number (1-100)
   - Player 2 guesses
   - Get clues: "Upore" (higher) or "Niche" (lower)
   - When correct, roles switch automatically!

### Firebase Features

✅ **Real-time sync** - Both players see updates instantly
✅ **Persistent rooms** - Rooms survive server restarts
✅ **Auto cleanup** - Old rooms deleted after 24 hours
✅ **Secure** - Secret numbers never exposed to guesser

### Troubleshooting

**Port already in use?**
```bash
# Change port in server.js (last line)
const PORT = 3001; // Change to any available port
```

**Firebase errors?**
- Check that the JSON file is in the project root
- Verify Firebase Realtime Database is enabled in console

### Deploy to Production

**Recommended platforms:**
- Heroku
- Railway
- Render
- Google Cloud Run

**Remember to:**
1. Set environment variables for production
2. Update Firebase Database Rules for security
3. Enable HTTPS

### Firebase Database Rules (Production)

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt"]
      }
    }
  }
}
```

Enjoy your game! 🎯
