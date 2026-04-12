    const Passenger = require('../models/Passenger');
    const Flight = require('../models/Flight');
    const logger = require('../utils/logger');

    // @desc    Get all passengers
    // @route   GET /api/passengers
    // @access  Private
    const getPassengers = async (req, res, next) => {
    try {
        const { flight, checkedIn } = req.query;
        const filter = {};

        if (flight) filter.flight = flight;
        if (checkedIn !== undefined) filter.checkedIn = checkedIn === 'true';

        const passengers = await Passenger.find(filter)
        .populate('flight', 'flightNumber airline origin destination status')
        .sort({ createdAt: -1 });

        res.status(200).json({
        success: true,
        count: passengers.length,
        data: passengers,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Get single passenger
    // @route   GET /api/passengers/:id
    // @access  Private
    const getPassenger = async (req, res, next) => {
    try {
        const passenger = await Passenger.findById(req.params.id).populate(
        'flight',
        'flightNumber airline origin destination departureTime status'
        );

        if (!passenger) {
        return res.status(404).json({ success: false, message: 'Passenger not found' });
        }

        res.status(200).json({ success: true, data: passenger });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Create a passenger
    // @route   POST /api/passengers
    // @access  Private
    const createPassenger = async (req, res, next) => {
    try {
        // Check if flight exists
        const flight = await Flight.findById(req.body.flight);
        if (!flight) {
        return res.status(404).json({ success: false, message: 'Flight not found' });
        }

        // Check capacity
        const passengerCount = await Passenger.countDocuments({ flight: req.body.flight });
        if (passengerCount >= flight.capacity) {
        return res.status(400).json({
            success: false,
            message: `Flight ${flight.flightNumber} is at full capacity (${flight.capacity} passengers)`,
        });
        }

        const passenger = await Passenger.create(req.body);

        logger.info(
        `Passenger added: ${passenger.firstName} ${passenger.lastName} (${passenger.passportNumber}) to flight ${flight.flightNumber} by user ${req.user.email}`
        );

        const populated = await Passenger.findById(passenger._id).populate(
        'flight',
        'flightNumber airline origin destination'
        );

        res.status(201).json({
        success: true,
        message: 'Passenger added successfully',
        data: populated,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Update a passenger
    // @route   PUT /api/passengers/:id
    // @access  Private
    const updatePassenger = async (req, res, next) => {
    try {
        const passenger = await Passenger.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        }).populate('flight', 'flightNumber airline origin destination');

        if (!passenger) {
        return res.status(404).json({ success: false, message: 'Passenger not found' });
        }

        logger.info(
        `Passenger updated: ${passenger.firstName} ${passenger.lastName} by user ${req.user.email}`
        );

        res.status(200).json({
        success: true,
        message: 'Passenger updated successfully',
        data: passenger,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Check in a passenger
    // @route   PATCH /api/passengers/:id/checkin
    // @access  Private
    const checkInPassenger = async (req, res, next) => {
    try {
        const passenger = await Passenger.findById(req.params.id).populate(
        'flight',
        'flightNumber status'
        );

        if (!passenger) {
        return res.status(404).json({ success: false, message: 'Passenger not found' });
        }

        if (passenger.checkedIn) {
        return res.status(400).json({
            success: false,
            message: 'Passenger is already checked in',
        });
        }

        if (passenger.flight.status === 'Departed' || passenger.flight.status === 'Cancelled') {
        return res.status(400).json({
            success: false,
            message: `Cannot check in. Flight is ${passenger.flight.status}`,
        });
        }

        // Generate a boarding pass code
        const boardingPass = `BP-${passenger.passportNumber}-${passenger.flight.flightNumber}-${Date.now()}`;

        passenger.checkedIn = true;
        passenger.checkedInAt = new Date();
        passenger.boardingPass = boardingPass;
        passenger.seatNumber = req.body.seatNumber || passenger.seatNumber;

        await passenger.save();

        logger.info(
        `Passenger checked in: ${passenger.firstName} ${passenger.lastName} (Passport: ${passenger.passportNumber}) on flight ${passenger.flight.flightNumber} by user ${req.user.email}`
        );

        res.status(200).json({
        success: true,
        message: 'Passenger checked in successfully',
        data: passenger,
        });
    } catch (error) {
        next(error);
    }
    };

    // @desc    Delete a passenger
    // @route   DELETE /api/passengers/:id
    // @access  Private
    const deletePassenger = async (req, res, next) => {
    try {
        const passenger = await Passenger.findById(req.params.id);

        if (!passenger) {
        return res.status(404).json({ success: false, message: 'Passenger not found' });
        }

        await passenger.deleteOne();

        logger.info(
        `Passenger deleted: ${passenger.firstName} ${passenger.lastName} by user ${req.user.email}`
        );

        res.status(200).json({
        success: true,
        message: 'Passenger removed successfully',
        });
    } catch (error) {
        next(error);
    }
    };

    module.exports = {
    getPassengers,
    getPassenger,
    createPassenger,
    updatePassenger,
    checkInPassenger,
    deletePassenger,
    };