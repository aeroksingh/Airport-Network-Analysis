require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const path      = require('path');
const fs        = require('fs');

const connectDB            = require('./config/db');
const logger               = require('./utils/logger');
const errorHandler         = require('./middleware/errorHandler');
const loggerMiddleware     = require('./utils/loggerMiddleware');
const visitorMiddleware    = require('./utils/visitorMiddleware');
const appLayerHeaders      = require('./middleware/appLayerHeaders');
const transportLayerLogger = require('./middleware/transportLayerLogger');
const udpHeartbeat         = require('./utils/udpHeartbeat');
const { initHub, getHubStats } = require('./websocket/hub');
const { protect }          = require('./middleware/auth');

const authRoutes       = require('./routes/authRoutes');
const flightRoutes     = require('./routes/flightRoutes');
const passengerRoutes  = require('./routes/passengerRoutes');
const gateRoutes       = require('./routes/gateRoutes');
const flightCommRoutes = require('./routes/flightCommRoutes');
const fileRoutes       = require('./routes/fileRoutes');
const userRoutes       = require('./routes/userRoutes');
const logRoutes        = require('./routes/logRoutes');
const networkRoutes    = require('./routes/networkRoutes');
const adminRoutes      = require('./routes/adminRoutes');

connectDB();
const app = express();

app.use((req, res, next) => { req.startTime = Date.now(); next(); });

// ── CORS: allow any localhost port (covers CRA port-increment 3000/3001/3002)
// and any production domain listed in FRONTEND_ORIGIN env var
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const explicitOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);                      // Postman / curl
    if (LOCALHOST_RE.test(origin)) return cb(null, true);    // any localhost port
    if (explicitOrigins.includes(origin)) return cb(null, true);
    logger.warn(`[CORS] blocked: ${origin}`);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-session-id'],
  optionsSuccessStatus: 200,
}));
app.options('*', cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(loggerMiddleware);
app.use(visitorMiddleware);
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));
app.use(appLayerHeaders);
app.use(transportLayerLogger);

// ── Uploads: protected route (no open static serving)
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.get('/uploads/:filename', protect, async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (/[/\\.]\./.test(filename)) return res.status(400).json({ success: false, message: 'Bad filename' });
    const FileTransfer = require('./models/FileTransfer');
    const rec = await FileTransfer.findOne({ filename });
    if (!rec) return res.status(404).json({ success: false, message: 'Not found' });
    const uid = String(req.user.id);
    if (String(rec.senderUserId) !== uid && String(rec.receiverUserId) !== uid && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });
    const fp = path.join(uploadsDir, filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, message: 'File missing on disk' });
    res.sendFile(fp);
  } catch (err) { next(err); }
});

// ── Routes
app.use('/api/network',    networkRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/flights',    flightRoutes);
app.use('/api/files',      fileRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/logs',       logRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/gates',      gateRoutes);
app.use('/api/flight',     flightCommRoutes);

// ── Log download (authenticated)
app.get('/api/logs/download', protect, async (req, res, next) => {
  try {
    const Log  = require('./models/Log');
    const fmt  = req.query.format === 'txt' ? 'txt' : 'json';
    const logs = await Log.find({}).sort({ timestamp: -1 }).limit(500).lean();
    if (fmt === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="logs.json"');
      return res.json({ success: true, count: logs.length, data: logs });
    }
    const txt = logs.map(l =>
      `[${new Date(l.timestamp).toISOString()}] ${(l.action||'').padEnd(20)} | ${l.performedBy||''} ${l.ipAddress ? '| '+l.ipAddress : ''}`
    ).join('\n');
    res.setHeader('Content-Disposition', 'attachment; filename="logs.txt"');
    res.setHeader('Content-Type', 'text/plain');
    res.send(txt);
  } catch (err) { next(err); }
});

// ── Health / status
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ success: true, system: 'AIR TOWER', version: '2.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.get('/api/network/ws-stats', (req, res) => {
  try { res.json(getHubStats()); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/network/status', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ status: 'Active', system: 'AIR TOWER',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    latency: `${Date.now() - req.startTime}ms`, timestamp: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.originalUrl}` }));
app.use(errorHandler);

const PORT   = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗼 AIR TOWER  →  http://localhost:${PORT}`);
  console.log(`📡 API        →  http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket  →  ws://localhost:${PORT}/ws/tower`);
  console.log(`✅ CORS       →  any localhost port + ${explicitOrigins.join(', ')||'(none extra)'}\n`);
});

if (process.env.ENABLE_UDP_HEARTBEAT === 'true') {
  try { udpHeartbeat.start(); } catch (e) { logger.error(`UDP: ${e.message}`); }
}
try { initHub(server); } catch (e) { logger.error(`WS Hub: ${e.message}`); }

process.on('unhandledRejection', err => { logger.error(err.message); server.close(() => process.exit(1)); });
process.on('uncaughtException',  err => { logger.error(err.message); process.exit(1); });
module.exports = app;
