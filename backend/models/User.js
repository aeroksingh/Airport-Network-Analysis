    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');

    const userSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false, // Don't return password in queries by default
        },
        role: {
        type: String,
        enum: ['admin', 'staff', 'viewer'],
        default: 'staff',
        },
        // ADDED: state, city, lastLoginIP
        // UPDATED: `state` and `city` are required for NEW registrations (keeps existing users compatible)
        state: {
        type: String,
        trim: true,
        required: [function() { return this.isNew; }, 'State is required'],
        default: null,
        },
        city: {
        type: String,
        trim: true,
        required: [function() { return this.isNew; }, 'City is required'],
        default: null,
        },
        // ADDED: track last login IP (optional)
        lastLoginIP: {
        type: String,
        default: null,
        },
    },
    {
        timestamps: true,
    }
    );

    // Hash password before saving
    userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
    });

    // Method to compare entered password with hashed password
    userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
    };

    module.exports = mongoose.model('User', userSchema);