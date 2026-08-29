// models/MedicineOrder.js
// One-time purchase of a Medicine, with Card or Cash-on-Delivery payment,
// order-status progression, and a conditional return workflow (medicines
// are NOT returnable in this system — see routes/medicines.js for why).

const mongoose = require('mongoose');

const medicineOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  quantity: { type: Number, default: 1 },
  amountUSD: { type: Number, required: true },
  amountLKR: { type: Number, required: true },
  supplierShareUSD: { type: Number, required: true }, // 90% — Daraz-style, seller keeps the majority
  platformShareUSD: { type: Number, required: true },  // 10% platform commission
  deliveryOption: { type: String, enum: ['Pickup', 'Delivery'], default: 'Pickup' },
  deliveryAddress: { type: String, default: '' },
  payhereOrderId: { type: String, required: true, unique: true },

  paymentMethod: { type: String, enum: ['Card', 'COD'], default: 'Card' },
  paymentConfirmed: { type: Boolean, default: false },
  couponCode: { type: String, default: '' },
  discountUSD: { type: Number, default: 0 },

  status: { type: String, enum: ['Pending', 'Paid', 'Shipped', 'Delivered', 'Failed'], default: 'Pending' },
  deliveredAt: Date,

  // Medicines stay 'None'/unusable — see the hygiene/safety note in
  // routes/medicines.js's return-request handler. Kept on the schema so
  // the frontend can render the same order-history UI as products.
  returnStatus: { type: String, enum: ['None', 'Requested', 'Approved', 'Rejected'], default: 'None' },
  returnReason: String,
  returnRequestedAt: Date,
  returnDecidedAt: Date,

  rawNotification: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('MedicineOrder', medicineOrderSchema);
