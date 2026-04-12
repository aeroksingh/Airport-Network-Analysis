const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const logger  = require('../utils/logger');
const logService = require('../services/logService');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });

const buildUserPayload = (user) => ({
  id: user._id, name: user.name, email: user.email,
  role: user.role, state: user.state, city: user.city,
});

// POST /api/auth/setup  (first-time admin creation)
exports.setup = async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    if (count > 0)
      return res.status(400).json({ success: false, message: 'Setup already done. Use /register.' });
    const { name, email, password } = req.body;
    const user  = await User.create({ name, email, password, role: 'admin', state: 'N/A', city: 'N/A' });
    const token = signToken(buildUserPayload(user));
    logger.info(`[AUTH] Setup: admin created — ${email}`);
    res.status(201).json({ success: true, token, user: buildUserPayload(user) });
  } catch (e) { next(e); }
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, state, city } = req.body;
    // role is NEVER accepted from the body — always 'staff'
    const user  = await User.create({ name, email, password, role: 'staff', state: state || null, city: city || null });
    const token = signToken(buildUserPayload(user));
    logger.info(`[AUTH] Registered: ${email}`);
    try { await logService.createLog({ action: 'user_register', performedBy: user._id, ipAddress: req.ip }); } catch {}
    res.status(201).json({ success: true, token, user: buildUserPayload(user) });
  } catch (e) { next(e); }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken(buildUserPayload(user));
    logger.info(`[AUTH] Login: ${email} (${user.role})`);
    try { await logService.createLog({ action: 'user_login', performedBy: user._id, ipAddress: req.ip }); } catch {}
    res.json({ success: true, token, user: buildUserPayload(user) });
  } catch (e) { next(e); }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: buildUserPayload(user) });
  } catch (e) { next(e); }
};