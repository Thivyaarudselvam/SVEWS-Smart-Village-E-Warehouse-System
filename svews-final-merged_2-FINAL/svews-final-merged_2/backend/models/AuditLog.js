// models/AuditLog.js — NEW FILE, safe to drop in as-is.
// A generic "who changed what, when" log, reusable for suppliers, bookings,
// or anything else you want a trail for later.

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entityType: { type: String, required: true },   // e.g. 'Supplier', 'Booking'
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  action: { type: String, required: true },        // e.g. 'updated', 'risk_rescored', 'status_changed'
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByName: String,
  summary: { type: String, required: true },        // short human-readable description
  meta: { type: mongoose.Schema.Types.Mixed },       // optional: before/after values, etc.
}, { timestamps: true });

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
