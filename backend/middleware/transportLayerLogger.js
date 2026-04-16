const logger = require('../utils/logger');

// Track active sockets
const activeSockets = new Set();

/**
 * Layer 4 - Transport (TCP) logger middleware
 * Logs socket src/dst for every request and tracks open sockets.
 */
module.exports = function transportLayerLogger(req, res, next) {
  try {
    const socket = req.socket || req.connection;
    if (!socket) {
      return next();
    }

    const src = `${socket.remoteAddress || 'unknown'}:${socket.remotePort || '0'}`;
    const dst = `${socket.localAddress || '0.0.0.0'}:${socket.localPort || '0'}`;

    // Log TCP tuple for this request
    logger.info(`[L4-TCP] SRC: ${src} → DST: ${dst}`);

    // Track socket open only once per socket object
    if (!socket.__l4_tracked) {
      socket.__l4_tracked = true;
      activeSockets.add(socket);
      logger.info(`[L4] Active TCP connections: ${activeSockets.size}`);

      // When the socket closes, remove from the set and log
      socket.on('close', () => {
        activeSockets.delete(socket);
        logger.info(`[L4-TCP] Closed: SRC: ${src} → DST: ${dst}`);
        logger.info(`[L4] Active TCP connections: ${activeSockets.size}`);
      });
    } else {
      // Still report active connections count on each request
      logger.info(`[L4] Active TCP connections: ${activeSockets.size}`);
    }
  } catch (err) {
    logger.error(`transportLayerLogger error: ${err.message}`);
  }

  next();
};

const fs = require('fs');
const path = require('path');

/**
 * Logs transport layer details to a local file for monitoring.
 */
const transportLayerLogger = (req, res, next) => {
    const logDetails = {
        timestamp: new Date().toISOString(),
        clientIP: req.clientIP, // Uses the IP from your middleware
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        // Tracking TCP-level ports
        destPort: req.socket.localPort,
        srcPort: req.socket.remotePort
    };

    const logMessage = `[${logDetails.timestamp}] IP: ${logDetails.clientIP} | Port: ${logDetails.srcPort}->${logDetails.destPort} | ${logDetails.method} ${logDetails.url}\n`;

    // Append to a log file so you can see the history
    const logFilePath = path.join(__dirname, 'network_monitor.log');
    
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) console.error("Logging failed", err);
    });

    next();
};
