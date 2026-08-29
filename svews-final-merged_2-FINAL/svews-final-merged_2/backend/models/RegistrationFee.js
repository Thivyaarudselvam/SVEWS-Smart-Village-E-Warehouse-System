// models/RegistrationFee.js — NEW FILE.
// Tracks the mandatory registration fee BOTH a new User (customer) and a
// new Supplier must pay via PayHere BEFORE their account is created.
// Keyed by email since there's no User account (and therefore no JWT) to
// attach this to yet.
//
// Currency note: PayHere's standard sandbox checkout charges in LKR. The
// business model here is framed in USD ($20 user / $25 supplier), so we
// store both — amountUSD is the "list price" shown to the person, and
// amountLKR is what's actually charged through PayHere, converted at a
// fixed rate (see USD_TO_LKR_RATE in .env). This is the normal pattern
// for an LKR-native gateway serving a USD-denominated pricing model.

const mongoose = require('mongoose');

const registrationFeeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  name: String,
  role: { type: String, enum: ['user', 'supplier'], required: true },
  category: { type: String, enum: ['Medical', 'Stationery', 'Electronics'] }, // required for supplier, optional for user
  payhereOrderId: { type: String, required: true, unique: true },
  amountUSD: { type: Number, required: true },
  amountLKR: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
  rawNotification: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('RegistrationFee', registrationFeeSchema);
