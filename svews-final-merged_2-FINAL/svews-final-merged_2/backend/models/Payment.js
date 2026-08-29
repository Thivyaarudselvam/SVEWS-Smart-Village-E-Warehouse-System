// models/Payment.js — NEW FILE.
// One row per payment attempt against an Order, via PayHere.

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  payhereOrderId: { type: String, required: true, unique: true }, // the order_id string sent to PayHere
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
  payherePaymentId: String,   // PayHere's own payment_id, once known
  rawNotification: mongoose.Schema.Types.Mixed, // full webhook payload, kept for audit/debugging
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
