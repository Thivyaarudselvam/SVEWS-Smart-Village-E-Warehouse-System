// models/Medicine.js — NEW FILE.
// A catalog item a Pharmacy-type supplier sells. Purchases are one-time
// (not subscriptions) — see MedicineOrder.js and routes/medicines.js.

const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  name: { type: String, required: true },
  priceUSD: { type: Number, required: true },
  deliveryAvailable: { type: Boolean, default: true },
  stock: { type: Number, default: 100 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
