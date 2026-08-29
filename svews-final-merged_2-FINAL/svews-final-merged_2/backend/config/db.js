const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/svews';
  try {
    await mongoose.connect(uri);
    console.log('[db] MongoDB connected —', uri.replace(/:[^:@]+@/, ':****@'));
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    console.error('[db] Set MONGO_URI in .env, or run a local MongoDB instance / use MongoDB Atlas.');
  }
}

module.exports = connectDB;
