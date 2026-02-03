const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
});

const PORT = process.env.PORT || 3000;

// Rooms store: { roomCode: { ...roomContext } }
const rooms = new Map();

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create-room', ({ playerName, playerId }) => {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const roomData = {
            code: roomCode,
            player1: { id: playerId, name: playerName, role: 'setter', socketId: socket.id },
            player2: null,
            gameState: 'waiting',
            secretNumber: null,
            guesses: [],
            guessCount: 0,
            createdAt: Date.now()
        };

        rooms.set(roomCode, roomData);
        socket.join(roomCode);
        socket.emit('room-created', roomData);
        console.log(`Room created: ${roomCode} by ${playerName}`);
    });

    socket.on('join-room', ({ playerName, playerId, roomCode }) => {
        const room = rooms.get(roomCode);

        if (!room) {
            return socket.emit('error', 'Room not found');
        }
        if (room.player2) {
            return socket.emit('error', 'Room is full');
        }

        room.player2 = { id: playerId, name: playerName, role: 'guesser', socketId: socket.id };
        room.gameState = 'setting';

        socket.join(roomCode);
        io.to(roomCode).emit('room-updated', room);
        console.log(`${playerName} joined room: ${roomCode}`);
    });

    socket.on('set-secret', ({ roomCode, number }) => {
        const room = rooms.get(roomCode);
        if (room) {
            room.secretNumber = number;
            room.gameState = 'guessing';
            room.guesses = [];
            room.guessCount = 0;
            io.to(roomCode).emit('room-updated', room);
        }
    });

    socket.on('submit-guess', ({ roomCode, guess }) => {
        const room = rooms.get(roomCode);
        if (room) {
            room.guessCount = (room.guessCount || 0) + 1;
            let clue = '';
            let state = 'guessing';

            if (guess < room.secretNumber) clue = 'Upore';
            else if (guess > room.secretNumber) clue = 'Niche';
            else {
                clue = 'Correct!';
                state = 'finished';
            }

            const newGuess = {
                guess,
                clue,
                guessNumber: room.guessCount,
                timestamp: Date.now()
            };

            room.guesses.push(newGuess);
            room.gameState = state;

            io.to(roomCode).emit('room-updated', room);
        }
    });

    socket.on('next-round', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (room && room.gameState === 'finished') {
            // Switch roles
            const p1Role = room.player1.role === 'setter' ? 'guesser' : 'setter';
            const p2Role = room.player2.role === 'setter' ? 'guesser' : 'setter';

            room.player1.role = p1Role;
            room.player2.role = p2Role;
            room.gameState = 'setting';
            room.secretNumber = null;
            room.guesses = [];
            room.guessCount = 0;

            io.to(roomCode).emit('room-updated', room);
        }
    });

    // --- WebRTC Signaling ---
    socket.on('call-offer', ({ roomCode, offer, caller }) => {
        socket.to(roomCode).emit('incoming-call', { offer, caller });
    });

    socket.on('call-answer', ({ roomCode, answer }) => {
        socket.to(roomCode).emit('call-answered', { answer });
    });

    socket.on('ice-candidate', ({ roomCode, candidate }) => {
        socket.to(roomCode).emit('remote-ice-candidate', { candidate });
    });

    socket.on('end-call', ({ roomCode }) => {
        socket.to(roomCode).emit('call-ended');
    });

    socket.on('mic-status-update', ({ roomCode, status, player }) => {
        socket.to(roomCode).emit('remote-mic-update', { status, player });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Find if this socket belongs to any room
        for (const [roomCode, room] of rooms.entries()) {
            const isP1 = room.player1.socketId === socket.id;
            const isP2 = room.player2 && room.player2.socketId === socket.id;

            if (isP1 || isP2) {
                console.log(`Player potentially disconnected from room ${roomCode}. Starting 60s grace period.`);

                // Mark the player as disconnected but don't delete yet
                io.to(roomCode).emit('player-reconnecting', {
                    playerId: isP1 ? room.player1.id : room.player2.id
                });

                // Clear any existing timeout for this room
                if (room.cleanupTimeout) clearTimeout(room.cleanupTimeout);

                // Set a timeout to delete the room if they don't reconnect
                room.cleanupTimeout = setTimeout(() => {
                    const currentRoom = rooms.get(roomCode);
                    if (!currentRoom) return;

                    // Final check: if the socket ID is still the same as the one that disconnected, then they never reconnected
                    const p1StillGone = currentRoom.player1.socketId === socket.id;
                    const p2StillGone = currentRoom.player2 && currentRoom.player2.socketId === socket.id;

                    if (p1StillGone || p2StillGone) {
                        io.to(roomCode).emit('player-disconnected');
                        rooms.delete(roomCode);
                        console.log(`Room ${roomCode} deleted after grace period expired`);
                    }
                }, 60000); // 60 second grace period

                break;
            }
        }
    });

    // Reconnection/Session Recovery handler
    socket.on('recover-session', ({ playerId, roomCode }) => {
        const room = rooms.get(roomCode);
        if (room) {
            let recovered = false;

            if (room.player1.id === playerId) {
                room.player1.socketId = socket.id;
                recovered = true;
            } else if (room.player2 && room.player2.id === playerId) {
                room.player2.socketId = socket.id;
                recovered = true;
            }

            if (recovered) {
                socket.join(roomCode);
                if (room.cleanupTimeout) {
                    clearTimeout(room.cleanupTimeout);
                    room.cleanupTimeout = null;
                }
                socket.emit('session-recovered', room);
                io.to(roomCode).emit('room-updated', room);
                console.log(`Player ${playerId} recovered session in room ${roomCode}`);
            } else {
                socket.emit('error', 'Session could not be recovered');
            }
        } else {
            socket.emit('error', 'Room no longer exists');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
