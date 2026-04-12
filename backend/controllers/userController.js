const User = require('../models/User');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, '_id name state city role').lean();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

module.exports = { getUsers };
