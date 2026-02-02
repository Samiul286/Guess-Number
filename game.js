// Socket.io initialization
const BACKEND_URL = 'https://guess-number-jz7q.onrender.com'; // Add your Render URL here after deployment (e.g., 'https://your-app.onrender.com')
const socket = io(BACKEND_URL);

// Game state variables
let currentRoom = null;
let playerName = null;
let playerRole = null;
let playerId = localStorage.getItem('guess_game_playerId');
if (!playerId) {
    playerId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guess_game_playerId', playerId);
}

// Screen elements
const screens = {
    lobby: document.getElementById('lobbyScreen'),
    waiting: document.getElementById('waitingScreen'),
    setSecret: document.getElementById('setSecretScreen'),
    guessing: document.getElementById('guessingScreen'),
    waitingGuess: document.getElementById('waitingGuessScreen'),
    win: document.getElementById('winScreen')
};

// Lobby elements
const playerNameInput = document.getElementById('playerName');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinRoomInput = document.getElementById('joinRoomInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomSubmit = document.getElementById('joinRoomSubmit');

// Waiting screen elements
const displayRoomCode = document.getElementById('displayRoomCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');

// Set secret screen elements
const secretNumberInput = document.getElementById('secretNumberInput');
const setSecretBtn = document.getElementById('setSecretBtn');

// Guessing screen elements
const guessInput = document.getElementById('guessInput');
const submitGuessBtn = document.getElementById('submitGuessBtn');
const guessCounter = document.getElementById('guessCounter');
const clueDisplay = document.getElementById('clueDisplay');
const guessHistoryList = document.getElementById('guessHistoryList');
const guessingRange = document.getElementById('guessingRange');

// Setter waiting screen elements
const setterGuessCounter = document.getElementById('setterGuessCounter');
const setterGuessHistoryList = document.getElementById('setterGuessHistoryList');

// Win screen elements
const revealedNumber = document.getElementById('revealedNumber');
const totalGuesses = document.getElementById('totalGuesses');
const nextRoundBtn = document.getElementById('nextRoundBtn');

// --- Game Logic ---

// Create Room
createRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) return alert('Please enter your name');

    playerName = name;
    socket.emit('create-room', { playerName, playerId });
});

socket.on('room-created', (room) => {
    currentRoom = room.code;
    playerRole = 'setter';
    displayRoomCode.textContent = room.code;
    showScreen('waiting');
});

// Join Room
joinRoomBtn.addEventListener('click', () => {
    joinRoomInput.classList.toggle('hidden');
});

joinRoomSubmit.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!name || !code) return alert('Please enter name and room code');

    playerName = name;
    currentRoom = code;
    playerRole = 'guesser';

    socket.emit('join-room', { playerName, playerId, roomCode: code });
});

socket.on('room-updated', (room) => {
    handleStateChange(room);
});

socket.on('error', (msg) => {
    alert(msg);
});

function handleStateChange(room) {
    if (!currentRoom) currentRoom = room.code;

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

    setterGuessCounter.textContent = room.guessCount || 0;
    renderHistory(room.guesses, setterGuessHistoryList);
}

function updateGuessingUI(room) {
    guessCounter.textContent = room.guessCount || 0;
    guessingRange.textContent = '1-100';

    const lastGuess = room.guesses && room.guesses.length > 0 ? room.guesses[room.guesses.length - 1] : null;
    if (lastGuess) {
        clueDisplay.textContent = lastGuess.clue;
        clueDisplay.className = 'clue-box ' + (lastGuess.clue === 'Upore' ? 'upore' : 'niche');
    } else {
        clueDisplay.textContent = 'Enter your guess';
        clueDisplay.className = 'clue-box';
    }

    renderHistory(room.guesses, guessHistoryList);
}

function renderHistory(guesses, listElement) {
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
    revealedNumber.textContent = room.secretNumber || '?';
    totalGuesses.textContent = room.guessCount || 0;
    nextRoundBtn.disabled = false;
    showScreen('win');
}

// Set Secret Number
setSecretBtn.addEventListener('click', () => {
    const number = parseInt(secretNumberInput.value);
    if (!number || number < 1 || number > 100) return alert('Enter 1-100');

    socket.emit('set-secret', { roomCode: currentRoom, number });
});

// Submit Guess
submitGuessBtn.addEventListener('click', () => {
    const guess = parseInt(guessInput.value);
    if (!guess || guess < 1 || guess > 100) return alert('Enter 1-100');

    socket.emit('submit-guess', { roomCode: currentRoom, guess });
    guessInput.value = '';
});

// Next Round
nextRoundBtn.addEventListener('click', () => {
    if (nextRoundBtn.disabled) return;
    nextRoundBtn.disabled = true;
    socket.emit('next-round', { roomCode: currentRoom });
});

// UI Helpers
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoom);
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => copyCodeBtn.textContent = 'Copy Code', 2000);
});

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

const audioCallContainer = document.getElementById('audioCallContainer');
const callStatus = document.getElementById('callStatus');
const micToggleBtn = document.getElementById('micToggleBtn');
const micLabel = micToggleBtn.querySelector('.mic-label');
const remoteAudio = document.getElementById('remoteAudio');

micToggleBtn.addEventListener('click', toggleMic);

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
            callStatus.textContent = `${player.name}'s mic is ON`;
            audioCallContainer.classList.add('active');
        }
    } else if (!remoteMicOn && wasRemoteMicOn) {
        // Remote player just turned their mic OFF
        console.log(`🔇 ${player.name} turned mic OFF`);
        shouldBeConnected = false;
        cleanupPeerConnection();
        
        if (isMicOn) {
            callStatus.textContent = 'Mic ON - Waiting for other player';
        } else {
            callStatus.textContent = 'Mic System Ready';
            audioCallContainer.classList.remove('active');
        }
    }
    
    updateConnectionStatus();
});

// Handle player disconnection - reset mic states
socket.on('player-disconnected', () => {
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
        callStatus.textContent = 'Connecting...';
    } catch (e) {
        console.error('❌ Failed to answer call:', e);
        callStatus.textContent = 'Connection failed';
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
