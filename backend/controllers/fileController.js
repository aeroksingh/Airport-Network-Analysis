const path = require('path');
const fs = require('fs');
const FileTransfer = require('../models/FileTransfer');
const logger = require('../utils/logger');
const logService = require('../services/logService');
const { broadcast, sendToUser } = require('../websocket/hub');

// POST /api/files/upload
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const senderUserId = req.user?.id || null;
    const senderIP = req.clientIP || req.ip || req.socket?.remoteAddress || null;

    const record = await FileTransfer.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype || 'application/octet-stream',
      senderUserId,
      senderIP,
      status: 'PENDING',
    });

    await logService.createLog({
      action: 'FILE_UPLOADED',
      performedBy: senderUserId,
      metadata: { fileId: record._id, originalName: req.file.originalname, size: req.file.size },
      ipAddress: senderIP,
    });

    // Broadcast to all (admin sees it in logs)
    broadcast({
      type: 'LOG_EVENT',
      event: 'FILE_UPLOADED',
      fileId: String(record._id),
      fileName: record.originalName,
      fileSize: record.size,
      senderId: String(senderUserId),
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

// POST /api/files/send
const sendFile = async (req, res, next) => {
  try {
    const { fileId, receiverUserId } = req.body;
    if (!fileId || !receiverUserId) return res.status(400).json({ success: false, message: 'fileId and receiverUserId required' });

    const record = await FileTransfer.findById(fileId);
    if (!record) return res.status(404).json({ success: false, message: 'File not found' });

    record.receiverUserId = receiverUserId;
    record.status = 'SENT';
    record.sentAt = new Date();
    await record.save();

    const User = require('../models/User');
    const sender = await User.findById(req.user?.id).lean();
    const receiver = await User.findById(receiverUserId).lean();

    // Build download URL
    const downloadUrl = `/uploads/${record.filename}`;

    await logService.createLog({
      action: 'FILE_SENT',
      performedBy: req.user?.id,
      senderUserId: req.user?.id,
      receiverUserId,
      metadata: { fileId: record._id, originalName: record.originalName, receiverName: receiver?.name },
      ipAddress: req.clientIP || req.ip,
    });

    // Push to receiver via WebSocket - instant delivery
    sendToUser(receiverUserId, {
      type: 'FILE_INCOMING',
      fileId: String(record._id),
      fileName: record.originalName,
      fileSize: record.size,
      mimeType: record.mimeType,
      downloadUrl,
      senderId: String(req.user?.id),
      senderName: sender?.name || 'Unknown',
      timestamp: new Date().toISOString(),
    });

    // Broadcast log event to all (for live log pane)
    broadcast({
      type: 'LOG_EVENT',
      event: 'FILE_SENT',
      fileId: String(record._id),
      fileName: record.originalName,
      senderId: String(req.user?.id),
      senderName: sender?.name || 'Unknown',
      receiverId: String(receiverUserId),
      receiverName: receiver?.name || 'Unknown',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

// GET /api/files/received
const getReceived = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const files = await FileTransfer.find({ receiverUserId: userId })
      .sort({ sentAt: -1 })
      .populate('senderUserId', 'name email')
      .lean();

    // Attach download URL
    const data = files.map(f => ({
      ...f,
      downloadUrl: `/uploads/${f.filename}`,
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/files/sent
const getSent = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const files = await FileTransfer.find({ senderUserId: userId })
      .sort({ createdAt: -1 })
      .populate('receiverUserId', 'name email')
      .lean();
    const data = files.map(f => ({ ...f, downloadUrl: `/uploads/${f.filename}` }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { uploadFile, sendFile, getReceived, getSent };
