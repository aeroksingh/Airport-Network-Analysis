/**
 * AIR TOWER — flightBoard.js
 * Legacy shim: flight broadcast now goes through the unified hub.
 * Controllers that imported broadcastFlightUpdate continue to work.
 */
const { broadcast, initHub, getHubStats } = require('./hub');

function broadcastFlightUpdate(flight, action) {
  broadcast({
    type: 'FLIGHT_UPDATE',
    action,
    flight,
    timestamp: new Date().toISOString(),
  });
}

// initWebSocket is now initHub — expose the same signature for server.js compatibility
function initWebSocket(httpServer) {
  return initHub(httpServer);
}

function getWSStats() {
  return getHubStats();
}

module.exports = { initWebSocket, broadcastFlightUpdate, getWSStats };
