// models/LoginEvent.js — NEW FILE.
// One row per supplier login — used only by routes/duplicateCheck.js to
// detect suspiciously correlated login timing between two supplier
// accounts (a proxy for "one person operating both").

const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', index: true },
  ip: String,
}, { timestamps: true });

loginEventSchema.index({ supplier: 1, createdAt: -1 });

module.exports = mongoose.model('LoginEvent', loginEventSchema);
