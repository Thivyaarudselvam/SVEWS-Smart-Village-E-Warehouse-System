// models/Coupon.js — NEW FILE. Admin-created discount codes.

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['Percent', 'Flat'], required: true },
  discountValue: { type: Number, required: true }, // e.g. 10 for 10% or $10 flat
  active: { type: Boolean, default: true },
  expiresAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timesUsed: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
