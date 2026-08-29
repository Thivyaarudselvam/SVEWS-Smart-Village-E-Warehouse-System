// models/Counter.js — NEW FILE.
// Powers atomic, gap-free sequence numbers per category (EDU001, EDU002...).
// Uses MongoDB's atomic findOneAndUpdate($inc) so two suppliers registering
// at the same instant never get the same number, even under concurrent load.

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // the category name, used as the key
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
