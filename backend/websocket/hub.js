/**
 * AIR TOWER — WebSocket Hub
 * FIX (CRITICAL): Added JWT verification on IDENTIFY message.
 * FIX (CRITICAL): ADMIN_ACTION messages now require admin role — not just any connection.
 */

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let wss = null;
let totalConnections = 0;
let messagesSent = 0;

// Map: userId → Set<ws>
const userSockets = new Map();

// ─── Safe send helper ─────────────────────────────────────────────────────────
function safeSend(ws, payload) {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
      messagesSent++;
      return true;
    }
  } catch (err) {
    logger.error(`[HUB-WS] safeSend error: ${err.message}`);
  }
  return false;
}

// ─── Broadcast to all connected clients ──────────────────────────────────────
function broadcast(payload, excludeWs = null) {
  if (!wss) return 0;
  let sent = 0;
  for (const client of wss.clients) {
    if (client !== excludeWs) {
      if (safeSend(client, payload)) sent++;
    }
  }
  logger.info(`[HUB-WS] broadcast type=${payload.type} → ${sent} clients`);
  return sent;
}

// ─── Send to specific user (all their tabs) ───────────────────────────────────
function sendToUser(userId, payload) {
  if (!userId) return 0;
  const sockets = userSockets.get(String(userId));
  if (!sockets) return 0;
  let sent = 0;
  for (const ws of sockets) {
    if (safeSend(ws, payload)) sent++;
  }
  return sent;
}

// ─── Connection handler ───────────────────────────────────────────────────────
function handleConnection(ws, req) {
  totalConnections++;
  const clientIP = req?.socket?.remoteAddress || req?.headers?.['x-forwarded-for'] || 'unknown';
  let userId = null;
  let userRole = null;

  logger.info(`[HUB-WS] New connection from ${clientIP} — total: ${wss.clients.size}`);

  safeSend(ws, {
    type: 'CONNECTED',
    message: 'AIR TOWER Network Hub',
    protocol: 'WebSocket/RFC-6455',
    port: 5000,
    path: '/ws/tower',
    timestamp: new Date().toISOString(),
  });

  try {
    const Flight = require('../models/Flight');
    Flight.find().populate('gate').lean().then(flights => {
      safeSend(ws, { type: 'FLIGHT_SNAPSHOT', flights, count: flights.length });
    }).catch(() => {});
  } catch (e) {}

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, msg, clientIP);
    } catch (err) {
      logger.warn(`[HUB-WS] Malformed message from ${clientIP}`);
    }
  });

  ws.on('close', () => {
    if (userId) {
      const sockets = userSockets.get(String(userId));
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          userSockets.delete(String(userId));
          broadcast({
            type: 'USER_PRESENCE',
            event: 'OFFLINE',
            userId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
    logger.info(`[HUB-WS] Client disconnected — total: ${wss ? wss.clients.size : 0}`);
  });

  ws.on('error', (err) => {
    logger.error(`[HUB-WS] Client error from ${clientIP}: ${err.message}`);
  });

  ws._userId = null;

  function handleMessage(ws, msg, clientIP) {
    switch (msg.type) {
      case 'IDENTIFY':
        // FIX (CRITICAL): Verify JWT token sent with IDENTIFY message.
        // Client must send { type:'IDENTIFY', userId, userName, userRole, token }
        if (!msg.token) {
          safeSend(ws, { type: 'ERROR', message: 'IDENTIFY requires a token', timestamp: new Date().toISOString() });
          logger.warn(`[HUB-WS] IDENTIFY without token from ${clientIP}`);
          return;
        }
        try {
          const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
          // Ensure the userId in message matches the token — prevent impersonation
          if (String(decoded.id) !== String(msg.userId)) {
            safeSend(ws, { type: 'ERROR', message: 'Token userId mismatch', timestamp: new Date().toISOString() });
            logger.warn(`[HUB-WS] IDENTIFY userId mismatch from ${clientIP}`);
            return;
          }
          userId = decoded.id;
          userRole = decoded.role;
          ws._userId = userId;
          ws._userName = decoded.name;
          ws._userRole = decoded.role;
        } catch (err) {
          safeSend(ws, { type: 'ERROR', message: 'Invalid or expired token', timestamp: new Date().toISOString() });
          logger.warn(`[HUB-WS] IDENTIFY invalid token from ${clientIP}: ${err.message}`);
          return;
        }

        if (!userSockets.has(String(userId))) userSockets.set(String(userId), new Set());
        userSockets.get(String(userId)).add(ws);

        logger.info(`[HUB-WS] User identified: ${ws._userName} (${userId}) role=${userRole}`);

        safeSend(ws, {
          type: 'IDENTIFY_ACK',
          userId,
          connectedUsers: getOnlineUserIds(),
          timestamp: new Date().toISOString(),
        });

        broadcast({
          type: 'USER_PRESENCE',
          event: 'ONLINE',
          userId,
          userName: ws._userName,
          userRole,
          timestamp: new Date().toISOString(),
        }, ws);
        break;

      case 'NETWORK_CONTROL':
        // Allow any authenticated (identified) user to send control signals
        if (!userId) {
          safeSend(ws, { type: 'ERROR', message: 'Not identified. Send IDENTIFY first.', timestamp: new Date().toISOString() });
          return;
        }
        // Validate signal value — allow GO, STOP, and RESET
        if (!['GO','STOP','RESET'].includes(msg.signal)) {
          safeSend(ws, { type: 'ERROR', message: `Unknown signal: ${msg.signal}`, timestamp: new Date().toISOString() });
          return;
        }
        logger.info(`[HUB-WS] NETWORK_CONTROL signal=${msg.signal} from ${msg.senderId} target=${msg.targetUserId||'ALL'}`);
        broadcast({
          type: 'NETWORK_CONTROL',
          signal:       msg.signal,       // 'GO' | 'STOP' | 'RESET'
          senderId:     msg.senderId,
          senderName:   msg.senderName,
          targetUserId: msg.targetUserId || null,  // null = broadcast to all
          message:      msg.message || '',
          timestamp:    new Date().toISOString(),
        }, ws);
        break;

      case 'FILE_NOTIFY':
        // Require authentication
        if (!userId) {
          safeSend(ws, { type: 'ERROR', message: 'Not identified.', timestamp: new Date().toISOString() });
          return;
        }
        logger.info(`[HUB-WS] FILE_NOTIFY fileId=${msg.fileId} → receiverId=${msg.receiverId}`);
        sendToUser(msg.receiverId, {
          type: 'FILE_INCOMING',
          fileId: msg.fileId,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          senderId: msg.senderId,
          senderName: msg.senderName,
          timestamp: new Date().toISOString(),
        });
        safeSend(ws, {
          type: 'FILE_NOTIFY_ACK',
          fileId: msg.fileId,
          delivered: userSockets.has(String(msg.receiverId)),
          timestamp: new Date().toISOString(),
        });
        break;

      case 'ADMIN_ACTION':
        // FIX (CRITICAL): Only admin-role sockets may broadcast ADMIN_ACTION
        if (!userId || userRole !== 'admin') {
          logger.warn(`[HUB-WS] ADMIN_ACTION blocked — user ${userId || 'unknown'} role=${userRole || 'none'} from ${clientIP}`);
          safeSend(ws, { type: 'ERROR', message: 'Admin role required for ADMIN_ACTION', timestamp: new Date().toISOString() });
          return;
        }
        logger.info(`[HUB-WS] ADMIN_ACTION action=${msg.action} by ${userId}`);
        broadcast({
          type: 'ADMIN_ACTION',
          action: msg.action,
          adminId: msg.adminId,
          adminName: msg.adminName,
          targetId: msg.targetId,
          targetName: msg.targetName,
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        logger.warn(`[HUB-WS] Unknown message type: ${msg.type}`);
    }
  }
}

function getOnlineUserIds() {
  return Array.from(userSockets.keys());
}

function initHub(httpServer) {
  if (wss) return wss;
  wss = new WebSocketServer({ server: httpServer, path: '/ws/tower' });
  wss.on('connection', handleConnection);
  wss.on('listening', () => logger.info('[HUB-WS] AIR TOWER hub listening at /ws/tower'));
  wss.on('error', (err) => logger.error(`[HUB-WS] Server error: ${err.message}`));
  return wss;
}

function getHubStats() {
  return {
    connectedClients: wss ? wss.clients.size : 0,
    onlineUsers: getOnlineUserIds().length,
    totalConnections,
    messagesSent,
  };
}

module.exports = { initHub, broadcast, sendToUser, getHubStats, getOnlineUserIds };

async function sendFlightSnapshot(ws) {
  try {
    const Flight = require('../models/Flight');
    const flights = await Flight.find().populate('gate').lean();
    safeSend(ws, { type: 'FLIGHT_SNAPSHOT', flights, count: flights.length });
  } catch (err) {
    logger.error(`[HUB-WS] sendFlightSnapshot error: ${err.message}`);
  }
}
module.exports.sendFlightSnapshot = sendFlightSnapshot;
