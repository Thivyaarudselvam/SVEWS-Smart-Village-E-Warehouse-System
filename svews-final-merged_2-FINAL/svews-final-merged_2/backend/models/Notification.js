// models/Notification.js — NEW FILE, nothing to merge, safe to drop in as-is.
//
// In-app only (no email/SMS infra, per the roadmap) — just a row per event,
// tied to the user who should see it. Admin-facing events (e.g. "Supplier X
// moved to Watchlist") get written once per relevant admin, or you can
// query User.find({role:'admin'}) at write time and fan them out — see the
// createNotification helper below.

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['booking_status', 'risk_change', 'system'], required: true },
  message: { type: String, required: true },
  relatedModel: { type: String, enum: ['Booking', 'Supplier', null], default: null },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
