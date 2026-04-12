    const mongoose = require('mongoose');

    const gateSchema = new mongoose.Schema(
    {
        gateNumber: {
        type: String,
        required: [true, 'Gate number is required'],
        unique: true,
        uppercase: true,
        trim: true,
        },
        terminal: {
        type: String,
        required: [true, 'Terminal is required'],
        uppercase: true,
        trim: true,
        },
        status: {
        type: String,
        enum: ['Available', 'Occupied', 'Maintenance', 'Closed'],
        default: 'Available',
        },
        capacity: {
        type: Number,
        default: 200,
        min: [1, 'Capacity must be at least 1'],
        },
        assignedFlight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        default: null,
        },
    },
    {
        timestamps: true,
    }
    );

    module.exports = mongoose.model('Gate', gateSchema);
