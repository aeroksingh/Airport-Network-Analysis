const express = require('express');
const router = express.Router();
const { protect, protectVerified } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const User = require('../models/User');
const Log = require('../models/Log');
const logService = require('../services/logService');
const { broadcast } = require('../websocket/hub');

// Middleware: admin only
const adminOnly = [protectVerified, authorize('admin')]; // FIX(MEDIUM): protectVerified re-checks role from DB

// GET /api/admin/users - list all users
router.get('/users', adminOnly, async (req, res, next) => {
  try {
    const users = await User.find({}, '_id name email role state city createdAt').lean();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

// POST /api/admin/users - create user (admin)
router.post('/users', adminOnly, async (req, res, next) => {
  try {
    const { name, email, password, role, state, city } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'name, email, password required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: role || 'staff', state: state || 'N/A', city: city || 'N/A' });

    await logService.createLog({ action: 'USER_CREATED', performedBy: req.user?.id, metadata: { targetEmail: email, targetRole: role } });

    // Broadcast to all connected clients
    broadcast({ type: 'ADMIN_ACTION', action: 'USER_CREATED', adminName: req.user?.name || 'Admin', targetName: name, targetRole: role || 'staff', timestamp: new Date().toISOString() });

    res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, state: user.state, city: user.city } });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id - remove user
router.delete('/users/:id', adminOnly, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(user._id) === String(req.user?.id)) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });

    const userName = user.name;
    await User.findByIdAndDelete(req.params.id);

    await logService.createLog({ action: 'USER_REMOVED', performedBy: req.user?.id, metadata: { removedUserId: req.params.id, removedUserEmail: user.email } });

    broadcast({ type: 'ADMIN_ACTION', action: 'USER_REMOVED', adminName: req.user?.name || 'Admin', targetId: req.params.id, targetName: userName, timestamp: new Date().toISOString() });
    broadcast({ type: 'USER_KICKED', userId: String(user._id), reason: 'Removed by admin', timestamp: new Date().toISOString() });

    res.json({ success: true, message: `User ${userName} removed` });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/role - change role
router.patch('/users/:id/role', adminOnly, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'staff', 'viewer'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await logService.createLog({ action: 'USER_ROLE_CHANGED', performedBy: req.user?.id, metadata: { targetId: req.params.id, newRole: role } });
    broadcast({ type: 'ADMIN_ACTION', action: 'USER_ROLE_CHANGED', adminName: req.user?.name || 'Admin', targetId: String(user._id), targetName: user.name, newRole: role, timestamp: new Date().toISOString() });

    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// GET /api/admin/logs - activity logs (admin view with full details)
router.get('/logs', adminOnly, async (req, res, next) => {
  try {
    const logs = await Log.find({})
      .sort({ timestamp: -1 })
      .limit(200)
      .populate('performedBy', 'name email')
      .populate('senderUserId', 'name email')
      .populate('receiverUserId', 'name email')
      .lean();
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
});

module.exports = router;
