    const mongoose = require('mongoose');
    const logger = require('../utils/logger');

    const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/airportdb';
        const conn = await mongoose.connect(mongoURI);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`MongoDB Connection Error: ${error.message}`);
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        process.exit(1);
    }
    };

    module.exports = connectDB;