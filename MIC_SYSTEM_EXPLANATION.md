# Multiplayer Mic System: Technical Deep Dive

This document explains how the real-time voice system works in this game, using WebRTC and Socket.io.

## 1. How a Multiplayer Mic System Works

In modern web games, high-quality, low-latency audio is achieved using **WebRTC** (Web Real-Time Communication). Unlike standard chat messages that go through a server, WebRTC allows players to send audio data **directly to each other** (Peer-to-Peer), which minimizes lag.

### Key Components:
- **MediaStream API**: Captures the audio from your microphone.
- **RTCPeerConnection**: Manages the direct connection between two players.
- **Signaling Server (Socket.io)**: A "middleman" that helps players find each other and exchange connection details (IPs, ports, audio formats).

---

## 2. Managing Voice Streams

Voice streams follow a specific lifecycle to ensure they connect and disconnect correctly.

### Step 1: Requesting Access
When you click "Mic ON", the game calls `navigator.mediaDevices.getUserMedia({ audio: true })`. This prompts the browser for permission. Once granted, you get a `MediaStream` containing your audio track.

### Step 2: Signaling Availability
The game doesn't just start calling everyone. It emits a `mic-status-update` to the server. The server tells the other player: "Hey, Player 1 turned their mic ON".

### Step 3: The Handshake (Offer/Answer)
If both players have their mics ON, one player (usually the one who turned it on last) initiates the **WebRTC Handshake**:
1.  **Offer**: Player A creates an "Offer" (an SDP packet containing their audio capabilities) and sends it via Socket.io to Player B.
2.  **Answer**: Player B receives the Offer, sets it as their "Remote Description", creates an "Answer", and sends it back to Player A.
3.  **ICE Candidates**: Behind the scenes, they exchange "ICE Candidates" (possible ways to reach each other through routers and firewalls).

### Step 4: Direct Connection
Once the handshake is complete, a direct "Voice Link" is established. The audio from Player A flows directly to Player B's `<audio>` element.

---

## 3. Real-Time Management & Performance

### Isolation
Audio is transmitted in real-time, but it only affects players who are connected. If a third player joins the room but has their mic OFF, they don't receive the audio stream, saving bandwidth and processing power.

### Dynamic Connection
When you turn your mic OFF:
- The local `MediaStream` is stopped (the hardware mic light turns off).
- The `RTCPeerConnection` is closed.
- A signal is sent to the other player to clean up their side.

This ensures that one player's state is independent—you choose when you want to be heard, and the connection only exists when both parties agree.

---

## 4. Implementation Guide for Integration

### 1. Setup Local Mic
```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// Add this stream to your WebRTC connection
stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
```

### 2. Monitor States
Use a simple boolean `isMicOn` and `remoteMicOn`. Update your UI whenever these change.

### 3. Handle Signaling
Always have a signaling channel (like Socket.io) ready to pass "Offers", "Answers", and "ICE Candidates" between players.

### 4. Cleanup
Always stop tracks when turning off the mic:
```javascript
stream.getTracks().forEach(track => track.stop());
```
