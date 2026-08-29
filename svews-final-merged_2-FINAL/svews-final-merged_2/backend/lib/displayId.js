// lib/displayId.js — NEW FILE.
// Generates human-readable, category-prefixed IDs — EDU001, MED001,
// STA001, ELE001 — separate from MongoDB's own _id. Call this once, at
// the moment a Supplier is created (both in registration and in the
// admin "Add Supplier" flow — see MERGE_NOTES.md item 17 for exactly
// where to add the one-line call in each unseen route file).

const Counter = require('../models/Counter');

const CATEGORY_PREFIX = {
  Medical: 'MED',
  Stationery: 'STA',
  Electronics: 'ELE',
};

async function generateDisplayId(category) {
  const prefix = CATEGORY_PREFIX[category];
  if (!prefix) throw new Error(`Unknown category "${category}" — no ID prefix defined`);

  // Atomic increment — safe even if two suppliers in the same category
  // register at the exact same moment.
  const counter = await Counter.findByIdAndUpdate(
    category,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}${String(counter.seq).padStart(3, '0')}`; // e.g. EDU001, EDU002...
}

module.exports = { generateDisplayId, CATEGORY_PREFIX };
