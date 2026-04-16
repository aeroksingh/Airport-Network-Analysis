# AIR TOWER — Network Control System

Real-time airport management: flights, passengers, gates, file transfer, and network control.

---

## Quick Start

### Windows
```
Double-click START.bat
```
Or manually:
```cmd
:: Kill old processes first (important!)
taskkill /F /IM node.exe

:: Terminal 1 — Backend
cd backend
npm install
npm run dev

:: Terminal 2 — Frontend (open a new terminal)
cd frontend
npm install
npm start
```

### Mac / Linux
```bash
chmod +x start.sh && ./start.sh
```

---

## First-Time Setup

1. Start both servers (see above)
2. Open your browser to the frontend URL shown in terminal
3. Click **"First time setup? Create admin account"** or go to `/setup`
4. Create your admin account
5. Log in with those credentials

> The demo credentials shown on the login page (`admin@airport.com` / `admin123`) only work if you ran `node backend/scripts/seedAdmin.js` first.

---

## Environment Variables

### `backend/.env` (already configured)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/airportdb
JWT_SECRET=airtower_secret_key_change_in_production
JWT_EXPIRY=7d
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
```

> **CORS is configured to allow any localhost port** — so it works even if React starts on 3002 or 3003.

### `frontend/.env` (already configured)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## Architecture

```
frontend (React, CRA)          backend (Node.js + Express)
http://localhost:300x    ───►  http://localhost:5000/api/*
ws://localhost:5000      ───►  ws://localhost:5000/ws/tower
```

---

## Features

- **Control Tower** — Dashboard with live flight map and network monitor
- **Flights** — CRUD + real-time WebSocket updates
- **Passengers** — Management with check-in
- **Gates** — Assignment and status tracking
- **File Transfer** — Upload, send to user, broadcast; live activity log
- **Network Control** — GO/STOP/RESET signals; single-click = activate, double-click = reset
- **Admin Panel** — User management, role assignment, activity logs

---

## Troubleshooting

**CORS error** — Make sure backend is running on port 5000. The backend allows any localhost port so this should not occur.

**ERR_CONNECTION_REFUSED** — Backend is not running. Start it first with `npm run dev` in the `backend/` folder.

**"Connection refused. Please ensure the backend server is running on port 5000"** — Same as above.

**Login fails with correct password** — Run the seed script: `cd backend && node scripts/seedAdmin.js`. Or use `/setup` to create a fresh admin.

**Port already in use** — Run `taskkill /F /IM node.exe` (Windows) or `pkill -f node` (Mac/Linux), then restart.

**MongoDB not connecting** — Ensure MongoDB is running: `net start MongoDB` (Windows) or `mongod` (Mac/Linux).

## Technical Implementation (In Progress)
- [x] Initialized Transport Layer Logging architecture
- [ ] TCP Connection tracking (Source/Destination ports)
- [ ] IP Tracking and Network Rules configuration
