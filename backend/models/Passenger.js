    const mongoose = require('mongoose');

    const passengerSchema = new mongoose.Schema(
    {
        firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        },
        lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        },
        email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        passportNumber: {
        type: String,
        required: [true, 'Passport number is required'],
        unique: true,
        uppercase: true,
        trim: true,
        },
        phone: {
        type: String,
        trim: true,
        },
        flight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: [true, 'Flight assignment is required'],
        },
        seatNumber: {
        type: String,
        trim: true,
        default: null,
        },
        checkedIn: {
        type: Boolean,
        default: false,
        },
        checkedInAt: {
        type: Date,
        default: null,
        },
        boardingPass: {
        type: String,
        default: null,
        },
    },
    {
        timestamps: true,
    }
    );

    // Virtual for full name
    passengerSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
    });

    module.exports = mongoose.model('Passenger', passengerSchema);