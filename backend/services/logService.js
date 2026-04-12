const Log = require('../models/Log');
const logger = require('../utils/logger');

// ADDED: robust createLog that accepts user ids and resolves performer when possible
async function createLog({ action, performedBy, airportId, state, city, ipAddress, metadata, senderUserId = null, receiverUserId = null }) {
  try {
    let performedById = null;
    let performedByRaw = null;

    try {
      if (performedBy) {
        // keep a raw copy for compatibility
        performedByRaw = typeof performedBy === 'string' ? performedBy : null;
        // If the caller passed an ObjectId or a user object, try to normalize
        const User = require('../models/User');
        if (typeof performedBy === 'string') {
          // if looks like an email, attempt to find user
          if (performedBy.includes('@')) {
            const user = await User.findOne({ email: performedBy }).select('_id').lean();
            if (user) performedById = user._id;
          } else {
            // assume it's an id-like string; allow mongoose to cast if valid
            performedById = performedBy;
          }
        } else if (performedBy && performedBy._id) {
          performedById = performedBy._id;
        } else if (performedBy && typeof performedBy === 'object') {
          performedById = performedBy;
        }
      }
    } catch (e) {
      // resolve failure should not break logging
      logger.warn(`logService.resolvePerformer failed: ${e.message}`);
    }

    const doc = new Log({
      action,
      performedBy: performedById,
      performedByRaw,
      airportId,
      state,
      city,
      ipAddress,
      metadata: metadata || {},
      senderUserId,
      receiverUserId,
      timestamp: new Date(),
    });

    await doc.save();
  } catch (err) {
    // Never let logging break main flow
    logger.warn(`logService.createLog failed: ${err.message}`);
  }
}

module.exports = { createLog };
