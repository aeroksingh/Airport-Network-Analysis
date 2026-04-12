const Log = require('../models/Log');

// ADDED: GET /api/logs - fetch latest logs related to the logged-in user
const getLogs = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;

    if (!userId) return res.status(401).json({ success: false, message: 'Not authorized' });

    const filter = {
      $or: [
        { senderUserId: userId },
        { receiverUserId: userId },
      ],
    };

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('senderUserId', 'name state')
      .populate('receiverUserId', 'name state')
      .populate('performedBy', 'name email')
      .lean();

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLogs };
