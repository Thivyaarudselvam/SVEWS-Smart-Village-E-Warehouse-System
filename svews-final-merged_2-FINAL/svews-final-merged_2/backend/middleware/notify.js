// middleware/notify.js — NEW FILE.
//
// Small helper so routes/bookings.js and routes/risk.js can create
// notifications with one line, instead of duplicating this logic.
//
// Usage:
//   const { notifyUser, notifyAdmins } = require('../middleware/notify');
//   await notifyUser(supplierUserId, 'booking_status', 'Your booking is confirmed.', 'Booking', booking._id);
//   await notifyAdmins('risk_change', `${supplier.name} moved to Watchlist.`, 'Supplier', supplier._id);

const Notification = require('../models/Notification');
const User = require('../models/User');

async function notifyUser(userId, type, message, relatedModel = null, relatedId = null) {
  if (!userId) return null;
  return Notification.create({ user: userId, type, message, relatedModel, relatedId });
}

async function notifyAdmins(type, message, relatedModel = null, relatedId = null) {
  const admins = await User.find({ role: 'admin' }).select('_id');
  if (!admins.length) return [];
  return Notification.insertMany(
    admins.map(a => ({ user: a._id, type, message, relatedModel, relatedId }))
  );
}

module.exports = { notifyUser, notifyAdmins };
