// models/Wishlist.js — NEW FILE. A saved-for-later item.

const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { type: String, enum: ['Medicine', 'Product'], required: true },
  item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'itemType' },
}, { timestamps: true });

wishlistSchema.index({ user: 1, itemType: 1, item: 1 }, { unique: true }); // no duplicate saves

module.exports = mongoose.model('Wishlist', wishlistSchema);
