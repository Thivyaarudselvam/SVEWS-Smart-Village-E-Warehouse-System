// models/Review.js — NEW FILE.
// A rating+comment on a Medicine or Product, restricted to users who
// actually bought and received it (verified in routes/reviews.js).

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { type: String, enum: ['Medicine', 'Product'], required: true },
  item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'itemType' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
}, { timestamps: true });

reviewSchema.index({ itemType: 1, item: 1 });
reviewSchema.index({ user: 1, itemType: 1, item: 1 }, { unique: true }); // one review per user per item

module.exports = mongoose.model('Review', reviewSchema);
