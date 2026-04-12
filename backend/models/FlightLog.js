const mongoose = require('mongoose');

const flightLogSchema = new mongoose.Schema({
  flight_id: { 
    type: String, 
    required: true 
  },
  event_type: { 
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

module.exports = mongoose.model('FlightLog', flightLogSchema);
