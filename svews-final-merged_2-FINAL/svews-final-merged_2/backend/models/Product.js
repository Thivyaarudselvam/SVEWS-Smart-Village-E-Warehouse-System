// models/Product.js — NEW FILE.
// Same pattern as Medicine.js (Pharmacy), generalized for Stationery and
// Electronics — a supplier lists items, users buy one-time (not a
// subscription), with a Pickup/Delivery choice.
//
// productCategory is the "3 categories" sub-grouping within each top
// category. These are sensible defaults — rename them in your seed/admin
// UI to whatever makes sense for your report:
//   Stationery:  'Books & Paper' | 'Office Supplies' | 'Art & Craft'
//   Electronics: 'Computers & Laptops' | 'Mobile & Accessories' | 'Home Electronics'

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  category: { type: String, enum: ['Stationery', 'Electronics'], required: true },
  productCategory: { type: String, required: true }, // one of the 3 sub-categories for this category
  name: { type: String, required: true },
  priceUSD: { type: Number, required: true },
  deliveryAvailable: { type: Boolean, default: true },
  stock: { type: Number, default: 100 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
