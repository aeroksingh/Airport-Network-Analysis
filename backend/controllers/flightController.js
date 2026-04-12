    const Flight = require('../models/Flight');
    const Gate = require('../models/Gate');
    const logger = require('../utils/logger');
    const { broadcastFlightUpdate } = require('../websocket/flightBoard');
    const logService = require('../services/logService');

    // @desc    Get all flights
    // @route   GET /api/flights
    // @access  Private
    const getFlights = async (req, res, next) => {
    try {
        const { status, origin, destination } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (origin) filter.origin = origin.toUpperCase();
        if (destination) filter.destination = destination.toUpperCase();

        const flights = await Flight.find(filter)
        .populate('gate', 'gateNumber terminal')
        .sort({ departureTime: 1 });

        res.status(200).json({
        success: true,
        count: flights.length,
        data: flights,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Get single flight
    // @route   GET /api/flights/:id
    // @access  Private
    const getFlight = async (req, res, next) => {
    try {
        const flight = await Flight.findById(req.params.id).populate(
        'gate',
        'gateNumber terminal status'
        );

        if (!flight) {
        return res.status(404).json({ success: false, message: 'Flight not found' });
        }

        res.status(200).json({ success: true, data: flight });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Create a flight
    // @route   POST /api/flights
    // @access  Private
    const createFlight = async (req, res, next) => {
    try {
        const flight = await Flight.create(req.body);

        logger.info(
        `Flight created: ${flight.flightNumber} (${flight.origin} → ${flight.destination}) by user ${req.user.email}`
        );

        // Notify WebSocket clients about created flight
        try { broadcastFlightUpdate(flight, 'CREATED'); } catch (e) { logger.warn(`WS broadcast failed: ${e.message}`); }
        // ADDED: Log the creation for audit (non-blocking)
        try { await logService.createLog({ action: 'flight_created', performedBy: req.user?.email || null, airportId: req.user?.airportId || null, state: req.user?.state || null, city: req.user?.city || null, ipAddress: req.clientIP || req.ip, metadata: { flightId: flight._id } }); } catch (e) { logger.warn(`logService failed: ${e.message}`); }

        res.status(201).json({
        success: true,
        message: 'Flight created successfully',
        data: flight,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Update a flight
    // @route   PUT /api/flights/:id
    // @access  Private
    const updateFlight = async (req, res, next) => {
    try {
        const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        }).populate('gate', 'gateNumber terminal');

        if (!flight) {
        return res.status(404).json({ success: false, message: 'Flight not found' });
        }

        logger.info(
        `Flight updated: ${flight.flightNumber} - status: ${flight.status} by user ${req.user.email}`
        );

        // Notify WebSocket clients about updated flight
        try { broadcastFlightUpdate(flight, 'UPDATED'); } catch (e) { logger.warn(`WS broadcast failed: ${e.message}`); }
        // ADDED: Log the update for audit
        try { await logService.createLog({ action: 'flight_updated', performedBy: req.user?.email || null, airportId: req.user?.airportId || null, state: req.user?.state || null, city: req.user?.city || null, ipAddress: req.clientIP || req.ip, metadata: { flightId: flight._id } }); } catch (e) { logger.warn(`logService failed: ${e.message}`); }

        res.status(200).json({
        success: true,
        message: 'Flight updated successfully',
        data: flight,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Delete a flight
    // @route   DELETE /api/flights/:id
    // @access  Private
    const deleteFlight = async (req, res, next) => {
    try {
        const flight = await Flight.findById(req.params.id);

        if (!flight) {
        return res.status(404).json({ success: false, message: 'Flight not found' });
        }

        // If a gate is assigned, free it up
        if (flight.gate) {
        await Gate.findByIdAndUpdate(flight.gate, {
            status: 'Available',
            assignedFlight: null,
        });
        }

        // Notify WebSocket clients about deletion (send minimal info)
        try { broadcastFlightUpdate({ id: flight._id, flightNumber: flight.flightNumber }, 'DELETED'); } catch (e) { logger.warn(`WS broadcast failed: ${e.message}`); }
        // ADDED: Log deletion attempt
        try { await logService.createLog({ action: 'flight_deleted', performedBy: req.user?.email || null, airportId: req.user?.airportId || null, state: req.user?.state || null, city: req.user?.city || null, ipAddress: req.clientIP || req.ip, metadata: { flightId: flight._id } }); } catch (e) { logger.warn(`logService failed: ${e.message}`); }

        await flight.deleteOne();

        logger.info(
        `Flight deleted: ${flight.flightNumber} by user ${req.user.email}`
        );

        res.status(200).json({
        success: true,
        message: 'Flight deleted successfully',
        });
    } catch (error) {
        next(error);
    }
    };

    module.exports = { getFlights, getFlight, createFlight, updateFlight, deleteFlight };