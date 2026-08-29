// models/ProductOrder.js
// One-time purchase of a Stationery/Electronics Product, with Card or
// Cash-on-Delivery payment, order-status progression, and a conditional
// return workflow (see routes/products.js for the business rules — this
// file just defines the shape).

const mongoose = require('mongoose');

const productOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
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

  returnStatus: { type: String, enum: ['None', 'Requested', 'Approved', 'Rejected'], default: 'None' },
  returnReason: String,
  returnRequestedAt: Date,
  returnDecidedAt: Date,

  rawNotification: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('ProductOrder', productOrderSchema);
