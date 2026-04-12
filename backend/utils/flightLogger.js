const FlightLog = require('../models/FlightLog');

/**
 * Logs a flight event to the flight_logs collection.
 * 
 * @param {String} flightId - The ID of the flight
 * @param {String} eventType - Type of event (e.g., 'STATUS_UPDATE', 'EMERGENCY', 'BOARDING')
 * @param {String} message - Detailed event message
 */
const logFlightEvent = async (flightId, eventType, message) => {
  try {
    const newLog = new FlightLog({
      flight_id: flightId,
      event_type: eventType,
      message: message
    });
    await newLog.save();
    return newLog;
  } catch (error) {
    console.error(`Failed to log flight event for ${flightId}:`, error.message);
  }
};

module.exports = {
  logFlightEvent
};
