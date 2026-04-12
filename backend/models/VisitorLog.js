const mongoose = require('mongoose');

const visitorLogSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true,
    unique: true 
  },
  ip: { 
    type: String 
  },
  userAgent: { 
    type: String 
  },
  firstSeen: { 
    type: Date, 
    default: Date.now 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  requestCount: { 
    type: Number, 
    default: 1 
  }
});

module.exports = mongoose.model('VisitorLog', visitorLogSchema);
