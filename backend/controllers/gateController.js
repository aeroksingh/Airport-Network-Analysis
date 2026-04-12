    const Gate = require('../models/Gate');
    const Flight = require('../models/Flight');
    const logger = require('../utils/logger');

    // @desc    Get all gates
    // @route   GET /api/gates
    // @access  Private
    const getGates = async (req, res, next) => {
    try {
        const { status, terminal } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (terminal) filter.terminal = terminal.toUpperCase();

        const gates = await Gate.find(filter)
        .populate('assignedFlight', 'flightNumber airline origin destination status departureTime')
        .sort({ terminal: 1, gateNumber: 1 });

        res.status(200).json({
        success: true,
        count: gates.length,
        data: gates,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Get single gate
    // @route   GET /api/gates/:id
    // @access  Private
    const getGate = async (req, res, next) => {
    try {
        const gate = await Gate.findById(req.params.id).populate(
        'assignedFlight',
        'flightNumber airline origin destination status departureTime arrivalTime'
        );

        if (!gate) {
        return res.status(404).json({ success: false, message: 'Gate not found' });
        }

        res.status(200).json({ success: true, data: gate });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Create a gate
    // @route   POST /api/gates
    // @access  Private
    const createGate = async (req, res, next) => {
    try {
        const gate = await Gate.create(req.body);

        logger.info(
        `Gate created: ${gate.gateNumber} (Terminal ${gate.terminal}) by user ${req.user.email}`
        );

        res.status(201).json({
        success: true,
        message: 'Gate created successfully',
        data: gate,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Update gate info
    // @route   PUT /api/gates/:id
    // @access  Private
    const updateGate = async (req, res, next) => {
    try {
        const gate = await Gate.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        }).populate('assignedFlight', 'flightNumber airline');

        if (!gate) {
        return res.status(404).json({ success: false, message: 'Gate not found' });
        }

        logger.info(
        `Gate updated: ${gate.gateNumber} - status: ${gate.status} by user ${req.user.email}`
        );

        res.status(200).json({
        success: true,
        message: 'Gate updated successfully',
        data: gate,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Assign a flight to a gate
    // @route   PATCH /api/gates/:id/assign
    // @access  Private
    const assignFlight = async (req, res, next) => {
    try {
        const { flightId } = req.body;

        const gate = await Gate.findById(req.params.id);
        if (!gate) {
        return res.status(404).json({ success: false, message: 'Gate not found' });
        }

        if (gate.status === 'Occupied' && gate.assignedFlight) {
        return res.status(400).json({
            success: false,
            message: `Gate ${gate.gateNumber} is already occupied. Unassign first.`,
        });
        }

        if (gate.status === 'Maintenance' || gate.status === 'Closed') {
        return res.status(400).json({
            success: false,
            message: `Gate ${gate.gateNumber} is ${gate.status} and cannot be assigned.`,
        });
        }

        const flight = await Flight.findById(flightId);
        if (!flight) {
        return res.status(404).json({ success: false, message: 'Flight not found' });
        }

        // Check if flight already has a gate
        if (flight.gate && flight.gate.toString() !== req.params.id) {
        // Free the old gate
        await Gate.findByIdAndUpdate(flight.gate, {
            status: 'Available',
            assignedFlight: null,
        });
        }

        // Assign flight to gate
        gate.assignedFlight = flightId;
        gate.status = 'Occupied';
        await gate.save();

        // Update flight with gate reference
        flight.gate = gate._id;
        await flight.save();

        await gate.populate('assignedFlight', 'flightNumber airline origin destination status');

        logger.info(
        `Flight ${flight.flightNumber} assigned to gate ${gate.gateNumber} by user ${req.user.email}`
        );

        res.status(200).json({
        success: true,
        message: `Flight ${flight.flightNumber} assigned to Gate ${gate.gateNumber}`,
        data: gate,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Unassign flight from gate
    // @route   PATCH /api/gates/:id/unassign
    // @access  Private
    const unassignFlight = async (req, res, next) => {
    try {
        const gate = await Gate.findById(req.params.id);
        if (!gate) {
        return res.status(404).json({ success: false, message: 'Gate not found' });
        }

        if (!gate.assignedFlight) {
        return res.status(400).json({
            success: false,
            message: 'No flight is assigned to this gate',
        });
        }

        // Remove gate reference from flight
        await Flight.findByIdAndUpdate(gate.assignedFlight, { gate: null });

        const prevFlight = gate.assignedFlight;
        gate.assignedFlight = null;
        gate.status = 'Available';
        await gate.save();

        logger.info(
        `Flight unassigned from gate ${gate.gateNumber} by user ${req.user.email}`
        );

        res.status(200).json({
        success: true,
        message: `Gate ${gate.gateNumber} is now available`,
        data: gate,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Delete a gate
    // @route   DELETE /api/gates/:id
    // @access  Private
    const deleteGate = async (req, res, next) => {
    try {
        const gate = await Gate.findById(req.params.id);

        if (!gate) {
        return res.status(404).json({ success: false, message: 'Gate not found' });
        }

        if (gate.assignedFlight) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete gate with an assigned flight. Unassign first.',
        });
        }

        await gate.deleteOne();

        logger.info(`Gate deleted: ${gate.gateNumber} by user ${req.user.email}`);

        res.status(200).json({
        success: true,
        message: 'Gate deleted successfully',
        });
    } catch (error) {
        next(error);
    }
    };

    module.exports = {
    getGates,
    getGate,
    createGate,
    updateGate,
    assignFlight,
    unassignFlight,
    deleteGate,
    };