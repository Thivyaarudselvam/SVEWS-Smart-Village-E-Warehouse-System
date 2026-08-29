// models/Order.js — NEW FILE.
// Represents a purchase/service order the warehouse raises against a
// supplier — this is the real, database-backed version of the "Purchase
// Orders" panel that was static demo data in the original frontend.

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  category: { type: String, enum: ['Medical', 'Stationery', 'Electronics'], required: true },
  itemDescription: { type: String, required: true },
  quantity: { type: String, default: '' }, // free text, e.g. "1,200 units" — matches the original UI's style
  amount: { type: Number, required: true }, // in LKR
  status: {
    type: String,
    enum: ['Pending Acceptance', 'Accepted', 'Paid', 'Completed', 'Cancelled'],
    default: 'Pending Acceptance',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
