// Socket.io initialization
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://guess-number-jz7q.onrender.com';

let socket;
try {
    socket = io(BACKEND_URL);
    console.log('Socket initialized to:', BACKEND_URL || 'Local Server');
} catch (e) {
    console.error('Socket.io failed to initialize:', e);
}

// Game state variables
let currentRoom = null;
let playerName = null;
let playerRole = null;
let playerId = localStorage.getItem('guess_game_playerId');
if (!playerId) {
    playerId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guess_game_playerId', playerId);
}

// Safe element getter
const getEl = (id) => document.getElementById(id);

// Screen elements
const screens = {
    lobby: getEl('lobbyScreen'),
    waiting: getEl('waitingScreen'),
    setSecret: getEl('setSecretScreen'),
    guessing: getEl('guessingScreen'),
    waitingGuess: getEl('waitingGuessScreen'),
    win: getEl('winScreen')
};

// Lobby elements
const playerNameInput = getEl('playerName');
const createRoomBtn = getEl('createRoomBtn');
const joinRoomBtn = getEl('joinRoomBtn');
const joinRoomInput = getEl('joinRoomInput');
const roomCodeInput = getEl('roomCodeInput');
const joinRoomSubmit = getEl('joinRoomSubmit');

// Waiting screen elements
const displayRoomCode = getEl('displayRoomCode');
const copyCodeBtn = getEl('copyCodeBtn');

// Set secret screen elements
const secretNumberInput = getEl('secretNumberInput');
const setSecretBtn = getEl('setSecretBtn');

// Guessing screen elements
const guessInput = getEl('guessInput');
const submitGuessBtn = getEl('submitGuessBtn');
const guessCounter = getEl('guessCounter');
const clueDisplay = getEl('clueDisplay');
const guessHistoryList = getEl('guessHistoryList');
const guessingRange = getEl('guessingRange');

// Setter waiting screen elements
const setterGuessCounter = getEl('setterGuessCounter');
const setterGuessHistoryList = getEl('setterGuessHistoryList');

// Win screen elements
const revealedNumber = getEl('revealedNumber');
const totalGuesses = getEl('totalGuesses');
const nextRoundBtn = getEl('nextRoundBtn');

// --- Game Logic ---
if (createRoomBtn) {
    createRoomBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        if (!name) return alert('Please enter your name');

        playerName = name;
        if (socket) socket.emit('create-room', { playerName, playerId });
    });
}

if (socket) {
    socket.on('room-created', (room) => {
        currentRoom = room.code;
        playerRole = 'setter';
        if (displayRoomCode) displayRoomCode.textContent = room.code;
        if (audioCallContainer) audioCallContainer.classList.remove('hidden');
        showScreen('waiting');
    });

    socket.on('room-updated', (room) => {
        handleStateChange(room);
    });

    socket.on('player-reconnecting', ({ playerId: reconnectingPlayerId }) => {
        if (reconnectingPlayerId !== playerId) {
            console.log('Other player is reconnecting...');
            // Show a non-blocking notification or update UI
            const statusText = document.querySelector('#waitingGuessScreen p') || document.querySelector('#waitingScreen p');
            if (statusText) {
                statusText.setAttribute('data-original-text', statusText.textContent);
                statusText.textContent = 'Other player disconnected. Waiting for them to reconnect...';
            }
        }
    });

    socket.on('session-recovered', (room) => {
        console.log('Session recovered successfully');
        handleStateChange(room);
        // Restore original text if it was modified
        const statusText = document.querySelector('#waitingGuessScreen p') || document.querySelector('#waitingScreen p');
        if (statusText && statusText.hasAttribute('data-original-text')) {
            statusText.textContent = statusText.getAttribute('data-original-text');
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
            // Attempt to reconnect if it wasn't a deliberate disconnect
            console.log('Attempting to reconnect...');
        }
    });

    socket.on('connect', () => {
        console.log('Socket connected/reconnected');
        if (currentRoom && playerId) {
            console.log('Attempting to recover session...');
            socket.emit('recover-session', { playerId, roomCode: currentRoom });
        }
    });

    socket.on('error', (msg) => {
        console.error('Socket error:', msg);
        // Don't alert if it's a recovery error, might just be transient
        if (msg !== 'Session could not be recovered' && msg !== 'Room no longer exists') {
            alert(msg);
        }
    });
}

// Join Room
if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
        if (joinRoomInput) joinRoomInput.classList.toggle('hidden');
    });
}

if (joinRoomSubmit) {
    joinRoomSubmit.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        const code = roomCodeInput.value.trim().toUpperCase();

        if (!name || !code) return alert('Please enter name and room code');

        playerName = name;
        currentRoom = code;
        playerRole = 'guesser';

        if (socket) socket.emit('join-room', { playerName, playerId, roomCode: code });
    });
}

function handleStateChange(room) {
    if (!currentRoom) currentRoom = room.code;

    // Show mic bar once we are in a room
    if (currentRoom && audioCallContainer) {
        audioCallContainer.classList.remove('hidden');
    }

    // Always sync player role from server data
    if (room.player1 && room.player1.id === playerId) playerRole = room.player1.role;
    else if (room.player2 && room.player2.id === playerId) playerRole = room.player2.role;

    const state = room.gameState;

    if (state === 'waiting') {
        showScreen('waiting');
    } else if (state === 'setting') {
        if (playerRole === 'setter') {
            showScreen('setSecret');
        } else {
            showScreen('waitingGuess');
            updateWaitingUI(room, 'Waiting for other player to set the number...');
        }
    } else if (state === 'guessing') {
        if (playerRole === 'guesser') {
            showScreen('guessing');
            updateGuessingUI(room);
        } else {
            showScreen('waitingGuess');
            updateWaitingUI(room, 'Other player is guessing...');
        }
    } else if (state === 'finished') {
        showWinScreen(room);
    }
}

function updateWaitingUI(room, message) {
    const statusText = document.querySelector('#waitingGuessScreen p');
    if (statusText) statusText.textContent = message;

    if (setterGuessCounter) setterGuessCounter.textContent = room.guessCount || 0;
    renderHistory(room.guesses, setterGuessHistoryList);
}

function updateGuessingUI(room) {
    if (guessCounter) guessCounter.textContent = room.guessCount || 0;
    if (guessingRange) guessingRange.textContent = '1-100';

    const lastGuess = room.guesses && room.guesses.length > 0 ? room.guesses[room.guesses.length - 1] : null;
    if (lastGuess) {
        if (clueDisplay) {
            clueDisplay.textContent = lastGuess.clue;
            clueDisplay.className = 'clue-box ' + (lastGuess.clue === 'Upore' ? 'upore' : 'niche');
        }
    } else {
        if (clueDisplay) {
            clueDisplay.textContent = 'Enter your guess';
            clueDisplay.className = 'clue-box';
        }
    }

    renderHistory(room.guesses, guessHistoryList);
}

function renderHistory(guesses, listElement) {
    if (!listElement) return;
    listElement.innerHTML = '';
    if (!guesses) return;

    const guessArray = [...guesses].reverse();
    guessArray.forEach(data => {
        const item = document.createElement('div');
        item.className = 'guess-item';
        item.innerHTML = `
            <span class="guess-number">#${data.guessNumber}</span>
            <span class="guess-value">${data.guess}</span>
            <span class="guess-clue">${data.clue}</span>
        `;
        listElement.appendChild(item);
    });
}

function showWinScreen(room) {
    if (revealedNumber) revealedNumber.textContent = room.secretNumber || '?';
    if (totalGuesses) totalGuesses.textContent = room.guessCount || 0;
    if (nextRoundBtn) nextRoundBtn.disabled = false;
    showScreen('win');
}

// Set Secret Number
if (setSecretBtn) {
    setSecretBtn.addEventListener('click', () => {
        const number = parseInt(secretNumberInput.value);
        if (!number || number < 1 || number > 100) return alert('Enter 1-100');

        if (socket) socket.emit('set-secret', { roomCode: currentRoom, number });
    });
}

// Submit Guess
if (submitGuessBtn) {
    submitGuessBtn.addEventListener('click', () => {
        const guess = parseInt(guessInput.value);
        if (!guess || guess < 1 || guess > 100) return alert('Enter 1-100');

        if (socket) socket.emit('submit-guess', { roomCode: currentRoom, guess });
        if (guessInput) guessInput.value = '';
    });
}

// Next Round
if (nextRoundBtn) {
    nextRoundBtn.addEventListener('click', () => {
        if (nextRoundBtn.disabled) return;
        nextRoundBtn.disabled = true;
        if (socket) socket.emit('next-round', { roomCode: currentRoom });
    });
}

// UI Helpers
function showScreen(name) {
    Object.values(screens).forEach(s => {
        if (s) s.classList.remove('active');
    });
    if (screens[name]) screens[name].classList.add('active');
}

if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(currentRoom);
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => { if (copyCodeBtn) copyCodeBtn.textContent = 'Copy Code'; }, 2000);
    });
}

// --- Microphone Voice System (Independent Mic Control) ---
let localStream;
let remoteStream;
let peerConnection;
let iceCandidateQueue = [];
let isMicOn = false;
let remoteMicOn = false;
let shouldBeConnected = false; // Track if both mics are ON

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    iceCandidatePoolSize: 10,
};

const audioCallContainer = getEl('audioCallContainer');
const callStatus = getEl('callStatus');
const micToggleBtn = getEl('micToggleBtn');
const micLabel = micToggleBtn ? micToggleBtn.querySelector('.mic-label') : null;
const remoteAudio = getEl('remoteAudio');

if (micToggleBtn) {
    micToggleBtn.addEventListener('click', toggleMic);
}

async function toggleMic() {
    if (isMicOn) {
        stopMic();
    } else {
        await startMic();
    }
}

async function startMic() {
    console.log('🎤 Player turning Mic ON...');
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Microphone not supported in this browser.');
        }

        // Request microphone access
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
        });

        isMicOn = true;
        micToggleBtn.classList.add('on');
        micLabel.textContent = 'ON';
        audioCallContainer.classList.add('active');

        // Notify server that my mic is ON
        socket.emit('mic-status-update', {
            roomCode: currentRoom,
            status: 'ON',
            player: { id: playerId, name: playerName }
        });

        // Update UI based on remote mic status
        updateConnectionStatus();

        // If remote mic is already ON, establish connection
        if (remoteMicOn) {
            console.log('✅ Both mics are ON - establishing connection');
            shouldBeConnected = true;
            initiateCall();
        } else {
            console.log('⏳ My mic is ON, waiting for other player...');
            callStatus.textContent = 'Mic ON - Waiting for other player';
        }
    } catch (e) {
        console.error('❌ Mic access failed:', e);
        alert(`Microphone Error: ${e.message}`);
        stopMic();
    }
}

function stopMic() {
    console.log('🔇 Player turning Mic OFF...');
    isMicOn = false;
    shouldBeConnected = false;
    micToggleBtn.classList.remove('on');
    micLabel.textContent = 'OFF';

    // Stop local audio stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Close peer connection
    cleanupPeerConnection();

    // Notify server that my mic is OFF
    socket.emit('mic-status-update', {
        roomCode: currentRoom,
        status: 'OFF',
        player: { id: playerId, name: playerName }
    });

    // Update UI
    updateConnectionStatus();
}

function updateConnectionStatus() {
    if (!isMicOn && !remoteMicOn) {
        callStatus.textContent = 'Mic System Ready';
        audioCallContainer.classList.remove('active');
    } else if (isMicOn && !remoteMicOn) {
        callStatus.textContent = 'Mic ON - Waiting for other player';
        audioCallContainer.classList.add('active');
    } else if (!isMicOn && remoteMicOn) {
        callStatus.textContent = 'Other player mic is ON';
        audioCallContainer.classList.add('active');
    } else if (isMicOn && remoteMicOn) {
        // Both ON - connection should be active or connecting
        if (peerConnection && peerConnection.connectionState === 'connected') {
            callStatus.textContent = '🔊 Voice Connected';
        } else {
            callStatus.textContent = 'Connecting...';
        }
        audioCallContainer.classList.add('active');
    }
}

function cleanupPeerConnection() {
    if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
        peerConnection = null;
    }
    iceCandidateQueue = [];

    // Clear remote audio
    if (remoteAudio.srcObject) {
        remoteAudio.srcObject = null;
    }
}

async function initiateCall() {
    if (!localStream || !isMicOn) {
        console.log('⚠️ Cannot initiate call - mic not ready');
        return;
    }

    console.log('📞 Initiating WebRTC connection...');
    callStatus.textContent = 'Connecting...';

    cleanupPeerConnection();
    setupPeerConnection();

    // Add local audio tracks to peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    try {
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        });
        await peerConnection.setLocalDescription(offer);

        socket.emit('call-offer', {
            roomCode: currentRoom,
            offer: offer,
            caller: { id: playerId, name: playerName }
        });
    } catch (e) {
        console.error('❌ Failed to create offer:', e);
        callStatus.textContent = 'Connection failed';
    }
}

function setupPeerConnection() {
    console.log('🔧 Setting up peer connection...');
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { roomCode: currentRoom, candidate: event.candidate });
        }
    };

    peerConnection.ontrack = (event) => {
        console.log('🎵 Received remote audio track');
        remoteStream = event.streams[0];
        remoteAudio.srcObject = remoteStream;
        callStatus.textContent = '🔊 Voice Connected';
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
            if (shouldBeConnected && isMicOn && remoteMicOn) {
                callStatus.textContent = 'Reconnecting...';
                // Attempt to reconnect
                setTimeout(() => {
                    if (shouldBeConnected && isMicOn && remoteMicOn) {
                        console.log('🔄 Attempting to reconnect...');
                        initiateCall();
                    }
                }, 2000);
            }
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            callStatus.textContent = '🔊 Voice Connected';
        } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            if (shouldBeConnected) {
                callStatus.textContent = 'Connection lost';
            }
        }
    };
}

// Socket Events for Mic System
if (socket) {
    socket.on('remote-mic-update', ({ status, player }) => {
        console.log(`📡 Remote mic update from ${player.name}: ${status}`);
        const wasRemoteMicOn = remoteMicOn;
        remoteMicOn = (status === 'ON');

        if (remoteMicOn && !wasRemoteMicOn) {
            // Remote player just turned their mic ON
            console.log(`✅ ${player.name} turned mic ON`);

            if (isMicOn) {
                // Both mics are now ON - establish connection
                console.log('🔗 Both mics ON - establishing connection');
                shouldBeConnected = true;
                initiateCall();
            } else {
                // I'm OFF, remote is ON
                if (callStatus) callStatus.textContent = `${player.name}'s mic is ON`;
                if (audioCallContainer) audioCallContainer.classList.add('active');
            }
        } else if (!remoteMicOn && wasRemoteMicOn) {
            // Remote player just turned their mic OFF
            console.log(`🔇 ${player.name} turned mic OFF`);
            shouldBeConnected = false;
            cleanupPeerConnection();

            if (isMicOn) {
                if (callStatus) callStatus.textContent = 'Mic ON - Waiting for other player';
            } else {
                if (callStatus) callStatus.textContent = 'Mic System Ready';
                if (audioCallContainer) audioCallContainer.classList.remove('active');
            }
        }

        updateConnectionStatus();
    });

    // Handle player disconnection - reset mic states
    socket.on('player-disconnected', () => {
        console.log('Other player disconnected permanently');
        remoteMicOn = false;
        shouldBeConnected = false;
        cleanupPeerConnection();
        if (isMicOn) {
            stopMic();
        }
        alert('The other player disconnected. Game over.');
        window.location.reload();
    });

    socket.on('incoming-call', async ({ offer, caller }) => {
        console.log('📞 Incoming call from:', caller.name);

        // Only accept call if my mic is ON
        if (!isMicOn) {
            console.log('⚠️ Ignoring call - my mic is OFF');
            return;
        }

        try {
            cleanupPeerConnection();
            setupPeerConnection();

            // Add local audio tracks
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
            }

            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            // Process queued ICE candidates
            while (iceCandidateQueue.length > 0) {
                const candidate = iceCandidateQueue.shift();
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('ICE error:', e));
            }

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit('call-answer', { roomCode: currentRoom, answer });
            if (callStatus) callStatus.textContent = 'Connecting...';
        } catch (e) {
            console.error('❌ Failed to answer call:', e);
            if (callStatus) callStatus.textContent = 'Connection failed';
        }
    });

    socket.on('call-answered', async ({ answer }) => {
        if (!peerConnection) return;
        console.log('✅ Call answered by remote player');

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

            // Process queued ICE candidates
            while (iceCandidateQueue.length > 0) {
                const candidate = iceCandidateQueue.shift();
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('ICE error:', e));
            }
        } catch (e) {
            console.error('❌ Remote description error:', e);
        }
    });

    socket.on('remote-ice-candidate', async ({ candidate }) => {
        if (peerConnection && peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('ICE error:', e));
        } else {
            // Queue candidates if remote description not set yet
            iceCandidateQueue.push(candidate);
        }
    });
}
