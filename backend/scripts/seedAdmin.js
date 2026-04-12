require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/airportdb');
    console.log('✅ MongoDB connected\n');

    let user = await User.findOne({ email: 'admin@airport.com' }).select('+password');
    if (user) {
      console.log('ℹ️  Admin already exists:', user.email, '| role:', user.role);
      console.log('   If login fails, delete this user and re-run.');
    } else {
      user = await User.create({
        name: 'Airport Admin', email: 'admin@airport.com',
        password: 'admin123', role: 'admin',
        state: 'Maharashtra', city: 'Mumbai',
      });
      console.log('✅ Admin created!');
      console.log('   Email:    admin@airport.com');
      console.log('   Password: admin123\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
