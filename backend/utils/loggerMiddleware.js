// const Log = require('../models/Log');

// const loggerMiddleware = (req, res, next) => {
//   const startTime = Date.now();

//   res.on('finish', async () => {
//     const responseTime = Date.now() - startTime;
//     const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
//     const method = req.method;
//     const url = req.originalUrl || req.url;
//     const statusCode = res.statusCode;

//     try {
//       const logEntry = new Log({
//         ip,
//         method,
//         url,
//         statusCode,
//         responseTime
//       });
//       await logEntry.save();
//     } catch (error) {
//       console.error('Failed to save log to MongoDB:', error);
//     }
//   });

//   next();
// };

// module.exports = loggerMiddleware;


// backend/utils/loggerMiddleware.js
// Networking feature: logs every HTTP request with IP, method, endpoint,
// status code, and response time. Attach globally in server.js.

const logger = require('./logger');

const loggerMiddleware = (req, res, next) => {
  const start = Date.now(); // record start time

  // Get real IP (works behind proxies/Docker too)
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  // When response finishes, log everything
  res.on('finish', () => {
    const duration   = Date.now() - start;
    const method     = req.method;
    const endpoint   = req.originalUrl;
    const status     = res.statusCode;
    const userAgent  = req.headers['user-agent'] || 'unknown';

    // Color-code by status for console readability
    const statusStr  = status >= 500 ? `ERR-${status}`
                     : status >= 400 ? `WARN-${status}`
                     : `OK-${status}`;

    const logLine = `[NET] ${method} ${endpoint} | Status: ${statusStr} | IP: ${ip} | ${duration}ms | UA: ${userAgent.slice(0, 60)}`;

    if (status >= 500) {
      logger.error(logLine);
    } else if (status >= 400) {
      logger.warn(logLine);
    } else {
      logger.info(logLine);
    }
  });

  next();
};

module.exports = loggerMiddleware;