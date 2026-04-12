# AirTower — Applied Fixes & Changes

## How to start

```bash
# 1. Copy env files
cp backend/.env.example backend/.env      # fill in MONGO_URI and JWT_SECRET
cp frontend/.env.example frontend/.env    # already set correctly for local dev

# 2. Install dependencies (includes new express-rate-limit)
cd backend && npm install
cd ../frontend && npm install

# 3. Start backend (port 5000)
cd backend && npm run dev

# 4. Start frontend (port 3001) — in a new terminal
cd frontend && npm start
```

---

## Fixes applied

### CRITICAL — WebSocket hub: unauthenticated IDENTIFY + open ADMIN_ACTION
**File:** `backend/websocket/hub.js`
- `IDENTIFY` now requires a JWT `token` field in the message. Server verifies it and checks `userId` matches the token's `id`. Unauthenticated connections receive an ERROR message and are ignored.
- `ADMIN_ACTION` messages are now rejected unless the socket's verified role is `admin`.
- `NETWORK_CONTROL` and `FILE_NOTIFY` require the socket to have completed IDENTIFY.

**File:** `frontend/src/hooks/useTowerSocket.js`
- Sends `{ type: 'IDENTIFY', userId, userName, userRole, token }` — JWT included.
- All arrays (`incomingFiles`, `logEvents`, `onlineUsers`, `adminActions`) capped at 50 items.
- Proper cleanup: `onclose = null` set before `close()` to prevent ghost reconnect loops.
- `useEffect` deps corrected — `token` added so re-identify fires if token changes.

**File:** `frontend/src/pages/FileSharing.jsx`
- `token` from `useAuth()` passed into `useTowerSocket(...)`.

---

### CRITICAL (HIGH) — Open registration: anyone could self-assign admin role
**File:** `backend/controllers/authController.js`
- `role` removed from destructuring in the `register` function.
- New users always created with `role: 'staff'`. No caller can override this.
- JWT expiry reduced: `'7d'` → `process.env.JWT_EXPIRY || '1h'`.

**File:** `backend/routes/authRoutes.js`
- `role` field removed from the register route's express-validator chain.
- Rate limiting added: login (10 req / 15 min), register (5 req / hour) per IP.

---

### HIGH — Uploaded files served without access control
**File:** `backend/server.js`
- Removed: `app.use('/uploads', express.static(uploadsDir))` (public, no auth).
- Added: `GET /uploads/:filename` route protected by `protect` middleware.
- Checks that requesting user is the file's `senderUserId`, `receiverUserId`, or an admin. Returns 403 otherwise.
- Path traversal guard: filename containing `..` or `/` is rejected immediately.

**File:** `frontend/src/pages/FileSharing.jsx`
- Replaced all `<a href="http://localhost:5000/uploads/...">` download links with `<AuthDownloadBtn>` component that fetches via `Authorization: Bearer <token>` header.
- Both the incoming-files banner and the received-files table use authenticated download.

---

### HIGH — File upload: no type validation (arbitrary file upload)
**File:** `backend/routes/fileRoutes.js`
- Added `fileFilter` to multer config with an explicit MIME type allowlist (images, PDFs, Office docs, zip, json, txt/csv).
- Added blocked extension set: `.exe .sh .bat .php .py .js .html` etc.
- Returns HTTP 400 with a clear message if either check fails.

---

### MEDIUM — No rate limiting on auth endpoints
**File:** `backend/routes/authRoutes.js`
- `express-rate-limit` applied: 10 login attempts per IP per 15 min; 5 registrations per IP per hour.
- `express-rate-limit` added to `backend/package.json` dependencies.

---

### MEDIUM — JWT role trusted from token without DB verification
**File:** `backend/middleware/auth.js`
- Added `protectVerified` — re-fetches user from MongoDB on each request, so a demoted or deleted user is rejected immediately regardless of their token's `role` claim.
- `protect` (JWT-only, fast) kept for low-risk routes.

**File:** `backend/routes/adminRoutes.js`
- `adminOnly` middleware array changed from `[protect, authorize('admin')]` to `[protectVerified, authorize('admin')]`.

---

### MEDIUM — CORS hardcoded to localhost
**File:** `backend/server.js`
- `allowedOrigins` now reads from `process.env.FRONTEND_ORIGIN` (comma-separated for multi-origin support).
- Falls back to `http://localhost:3001` for local dev.

**File:** `backend/.env.example`
- `FRONTEND_ORIGIN=http://localhost:3001` — change to production domain on deploy.

---

### MEDIUM — SSRF in fileService.transferFile
**File:** `backend/services/fileService.js`
- Added `validateDestinationUrl()` before any axios call.
- Blocks: non-http(s) protocols, private IP ranges (127.x, 10.x, 192.168.x, 172.16-31.x), localhost.
- Optionally restricts to `ALLOWED_TRANSFER_HOSTS` env var allowlist.

---

### MEDIUM — Network topology exposed to all authenticated users
**File:** `backend/routes/networkRoutes.js`
- `GET /topology` now uses `protect, authorize('admin')` instead of `protect` alone.
- `authorize` imported at the top of the file.

---

## Memory / stability fixes

**File:** `frontend/src/hooks/useTowerSocket.js`
- Arrays capped at 50 items with `.slice(0, MAX_ITEMS)` on every update.
- Named handler refs used for proper cleanup — `socket.off` matches exact function reference.
- `ws.onclose = null` set before `ws.close()` in cleanup — stops reconnect loop after unmount.

**File:** `frontend/src/hooks/useFlightSocket.js`
- Same cleanup pattern: `ws.onclose = null` before `ws.close()`.
- `clearTimeout(reconnectRef.current)` on unmount.
- Flight list capped at 200 items.

**File:** `frontend/src/pages/FileSharing.jsx`
- `receivedFiles` and `sentFiles` capped at 50 items.
- `setInterval` for polling properly cleaned up via `return () => clearInterval(t)`.

---

## New features added

- `GET /api/logs/download?format=json|txt` — authenticated log export endpoint (`backend/server.js`).
- Download Logs buttons (JSON + TXT) added to the Live Activity Log panel in FileSharing (`frontend/src/pages/FileSharing.jsx`).
- `frontend/.env` and `backend/.env` files with `PORT=3001` to prevent port drift.
