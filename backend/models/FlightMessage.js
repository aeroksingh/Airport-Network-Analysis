const mongoose = require('mongoose');

const flightMessageSchema = new mongoose.Schema({
  from_flight: { 
    type: String, 
    required: true 
  },
  to_flight: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('FlightMessage', flightMessageSchema);
