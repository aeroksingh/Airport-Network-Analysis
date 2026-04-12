const VisitorLog = require('../models/VisitorLog');

const visitorMiddleware = async (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  
  if (sessionId) {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
      const userAgent = req.headers['user-agent'];

      // Using upsert to track visitors natively in MongoDB
      // Updates lastSeen and requestCount if it already exists, otherwise creates a new entry
      await VisitorLog.findOneAndUpdate(
        { sessionId },
        { 
          $set: { ip, userAgent, lastSeen: Date.now() },
          $inc: { requestCount: 1 }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      console.error('Error tracking visitor session:', error);
    }
  }

  next();
};

module.exports = visitorMiddleware;
