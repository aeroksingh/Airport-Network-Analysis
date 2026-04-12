    const mongoose = require('mongoose');

    const flightSchema = new mongoose.Schema(
    {
        flightNumber: {
        type: String,
        required: [true, 'Flight number is required'],
        unique: true,
        uppercase: true,
        trim: true,
        },
        airline: {
        type: String,
        required: [true, 'Airline name is required'],
        trim: true,
        },
        origin: {
        type: String,
        required: [true, 'Origin is required'],
        trim: true,
        uppercase: true,
        },
        destination: {
        type: String,
        required: [true, 'Destination is required'],
        trim: true,
        uppercase: true,
        },
        departureTime: {
        type: Date,
        required: [true, 'Departure time is required'],
        },
        arrivalTime: {
        type: Date,
        required: [true, 'Arrival time is required'],
        },
        status: {
        type: String,
        enum: ['Scheduled', 'Boarding', 'Departed', 'Arrived', 'Cancelled', 'Delayed'],
        default: 'Scheduled',
        },
        capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: [1, 'Capacity must be at least 1'],
        },
        gate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gate',
        default: null,
        },
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model('Flight', flightSchema);