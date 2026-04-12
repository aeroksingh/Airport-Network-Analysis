    const express = require('express');
    const { body } = require('express-validator');
    const {
    getFlights,
    getFlight,
    createFlight,
    updateFlight,
    deleteFlight,
    } = require('../controllers/flightController');
    const { protect } = require('../middleware/auth');
    const authorize = require('../middleware/authorize');
    const validate = require('../middleware/validate');

    const router = express.Router();

    // All routes require authentication
    router.use(protect);

    const flightValidation = [
    body('flightNumber').trim().notEmpty().withMessage('Flight number is required'),
    body('airline').trim().notEmpty().withMessage('Airline is required'),
    body('origin').trim().notEmpty().withMessage('Origin is required'),
    body('destination').trim().notEmpty().withMessage('Destination is required'),
    body('departureTime').isISO8601().withMessage('Valid departure time is required'),
    body('arrivalTime').isISO8601().withMessage('Valid arrival time is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
    body('status')
        .optional()
        .isIn(['Scheduled', 'Boarding', 'Departed', 'Arrived', 'Cancelled', 'Delayed'])
        .withMessage('Invalid status'),
    ];

    // GET all flights — admin, staff, viewer
    // POST create flight — admin, staff only
    router.route('/')
    .get(authorize('admin', 'staff', 'viewer'), getFlights)
    .post(authorize('admin', 'staff'), flightValidation, validate, createFlight);

    // GET single flight — admin, staff, viewer
    // PUT update flight — admin, staff only
    // DELETE flight — admin only
    router.route('/:id')
    .get(authorize('admin', 'staff', 'viewer'), getFlight)
    .put(authorize('admin', 'staff'), updateFlight)
    .delete(authorize('admin'), deleteFlight);

    module.exports = router;