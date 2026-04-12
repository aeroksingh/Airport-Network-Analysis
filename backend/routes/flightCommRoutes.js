const express = require('express');
const router = express.Router();
const FlightMessage = require('../models/FlightMessage');
const { logFlightEvent } = require('../utils/flightLogger');

// POST /api/flight/send-message
router.post('/send-message', async (req, res) => {
  try {
    const { from_flight, to_flight, message } = req.body;
    
    if (!from_flight || !to_flight || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields: from_flight, to_flight, message' });
    }

    const newMessage = new FlightMessage({
      from_flight,
      to_flight,
      message
    });
    
    await newMessage.save();

    // Optionally tie this communication event into our flight logs
    await logFlightEvent(from_flight, 'COMMUNICATION_SENT', `Direct message sent to flight ${to_flight}`);

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error while sending message' });
  }
});

// GET /api/flight/messages/:flightId
router.get('/messages/:flightId', async (req, res) => {
  try {
    const { flightId } = req.params;
    
    // Retrieve any messages where the flight is either the recipient or sender
    const messages = await FlightMessage.find({
      $or: [{ from_flight: flightId }, { to_flight: flightId }]
    }).sort({ timestamp: -1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching messages' });
  }
});

module.exports = router;
