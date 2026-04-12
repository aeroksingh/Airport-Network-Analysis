const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Layer 7 - Application headers middleware
 * Adds X-Airport-Node, X-Request-ID, X-Protocol-Version, X-Subnet
 * and injects X-Response-Time just before headers are sent.
 */
module.exports = function appLayerHeaders(req, res, next) {
  try {
    const start = process.hrtime.bigint();
    const requestId = crypto.randomUUID();

    // Static headers
    res.setHeader('X-Airport-Node', 'TERMINAL-OPS-01');
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Protocol-Version', 'AMS/1.0');
    res.setHeader('X-Subnet', '192.168.10.0/24');

    // Ensure X-Response-Time is added right before headers are sent
    const originalWriteHead = res.writeHead;
    res.writeHead = function writeHeadHook() {
      try {
        const diffMs = Number(process.hrtime.bigint() - start) / 1e6;
        res.setHeader('X-Response-Time', `${diffMs.toFixed(2)}ms`);
      } catch (e) {
        // swallow timing errors - we still want the response to go out
      }
      return originalWriteHead.apply(this, arguments);
    };

    // Log the incoming request at L7
    logger.info(`[L7] ${req.method} ${req.originalUrl || req.url} RequestID=${requestId}`);
  } catch (err) {
    // If anything goes wrong here, do not break the request flow
    logger.error(`appLayerHeaders middleware error: ${err.message}`);
  }

  next();
};
