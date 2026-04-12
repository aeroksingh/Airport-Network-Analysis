const mongoose = require('mongoose');

const fileTransferSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/octet-stream' },
  senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receiverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  senderIP: { type: String, default: null },
  status: { type: String, enum: ['PENDING', 'SENT', 'RECEIVED', 'FAILED'], default: 'PENDING' },
  sentAt: { type: Date, default: null },
  receivedAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('FileTransfer', fileTransferSchema);
