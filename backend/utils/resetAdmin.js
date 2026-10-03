require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function resetAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash('Demo@1234', salt);

  const result = await User.findOneAndUpdate(
    { email: 'admin@campus.edu' },
    { $set: { passwordHash, isActive: true, emailVerified: true, role: 'admin' } },
    { new: true, upsert: true }
  );

  console.log('✅ Admin user updated/created:');
  console.log('   Email:', result.email);
  console.log('   Role:', result.role);
  console.log('   Password:', 'Demo@1234');

  await mongoose.disconnect();
}

resetAdmin().catch(console.error);
