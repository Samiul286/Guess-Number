# 🚀 Hybrid Deployment (Vercel + Render)

To ensure high performance and stable real-time connections, we use a **Hybrid Deployment** strategy:
- **Frontend (Vercel)**: Fast, global delivery of static files.
- **Backend (Render)**: Persistent environment for Socket.io and local memory.

---

## 🛠️ Step 1: Deploy Backend to Render

1. Create a free account at [render.com](https://render.com).
2. Click **New** -> **Web Service**.
3. Link your GitHub repository.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `npm start`.
6. Once deployed, copy your Render URL (e.g., `https://guess-game-backend.onrender.com`).

---

## 🎨 Step 2: Configure Frontend

1. Open `game.js`.
2. Find the line: `const BACKEND_URL = '';`
3. Paste your Render URL inside the quotes:
   ```javascript
   const BACKEND_URL = 'https://YOUR-APP-NAME.onrender.com';
   ```
4. Save and push this change to GitHub.

---

## 🌐 Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Vercel will automatically detect the static files.
5. Click **Deploy**.

---

## 💡 Why this setup?
- **Stability**: Vercel's Serverless Functions disconnect Socket.io after a few seconds. Render keeps the connection alive.
- **Speed**: Vercel's Edge Network delivers the UI almost instantly to players worldwide.
- **Reliability**: Game rooms are stored in the server's memory, so they won't disappear mid-game.

---
Created with ❤️ by Antigravity
