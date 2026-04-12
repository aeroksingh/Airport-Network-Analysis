const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  // ADDED: link to performing user (objectId) when available; keep raw performer for compatibility
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  performedByRaw: { type: String, default: null },
  // ADDED: sender/receiver user references for filtering
  senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receiverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  airportId: { type: String, default: null },
  state: { type: String, default: null },
  city: { type: String, default: null },
  ipAddress: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  // ADDED: canonical timestamp field
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', logSchema);
