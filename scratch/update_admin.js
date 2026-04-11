const mongoose = require('mongoose');
require('dotenv').config();
const { users } = require('../backend/models');

async function updateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find and update the old admin or create the new one
    const admin = await users.findOne({ role: 'admin' });
    if (admin) {
        console.log(`Found admin: ${admin.username}. Updating to admin@gmail.com...`);
        admin.username = 'admin@gmail.com';
        await admin.save();
    } else {
        console.log('No admin found. Creating new admin@gmail.com...');
        await users.create({ username: 'admin@gmail.com', password: 'admin@123', role: 'admin' });
    }

    console.log('Admin ID updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating admin:', err);
    process.exit(1);
  }
}

updateAdmin();
