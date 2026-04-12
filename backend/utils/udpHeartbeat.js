const dgram = require('dgram');
const logger = require('./logger');

let server = null;
let stats = {
  received: 0,
  sent: 0,
  clients: new Set(),
};

function start() {
  if (server) return; // already started

  server = dgram.createSocket('udp4');

  server.on('error', (err) => {
    logger.error(`[UDP] Server error: ${err.message}`);
    server.close();
    server = null;
  });

  server.on('message', (msg, rinfo) => {
    try {
      stats.received += 1;
      const clientKey = `${rinfo.address}:${rinfo.port}`;
      stats.clients.add(clientKey);

      logger.info(`[UDP] Heartbeat from ${rinfo.address}:${rinfo.port} — ${msg.toString()}`);

      const payload = {
        pong: true,
        timestamp: new Date().toISOString(),
        serverIP: '192.168.10.20',
      };

      const buf = Buffer.from(JSON.stringify(payload));
      server.send(buf, rinfo.port, rinfo.address, (err) => {
        if (err) {
          logger.error(`[UDP] Error sending pong to ${clientKey}: ${err.message}`);
        } else {
          stats.sent += 1;
        }
      });
    } catch (err) {
      logger.error(`[UDP] Message handler error: ${err.message}`);
    }
  });

  server.on('listening', () => {
    const address = server.address();
    logger.info(`[UDP] Heartbeat server listening ${address.address}:${address.port}`);
  });

  server.bind(5001);
}

function getStats() {
  return {
    received: stats.received,
    sent: stats.sent,
    clients: Array.from(stats.clients),
  };
}

module.exports = { start, getStats };
