// One-time script to create an admin user (admins are not allowed to
// self-register through the public /api/auth/register endpoint for security).
//
// Usage:
//   node createAdmin.js "Admin Name" admin@example.com yourPassword
//
// If a user with that email already exists, this will now UPDATE their
// password (and promote them to role 'admin' if they weren't already) instead
// of silently skipping — this is the #1 cause of "Invalid email or password"
// on the login screen: the account already existed with a different/older
// password than the one you're now trying to log in with.
require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');

(async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: node createAdmin.js "Admin Name" admin@example.com yourPassword');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.password = password; // pre('save') hook in models/User.js re-hashes this
    existing.role = 'admin';
    existing.name = name;
    await existing.save();
    console.log(`User ${email} already existed — password RESET and role set to admin.`);
    console.log(`Login now with: ${email} / ${password}`);
    process.exit(0);
  }

  const admin = await User.create({ name, email, password, role: 'admin' });
  console.log(`Admin user created: ${admin.email} (id: ${admin._id})`);
  console.log(`Login with: ${email} / ${password}`);
  process.exit(0);
})().catch(err => {
  console.error('createAdmin.js failed:', err.message);
  process.exit(1);
});