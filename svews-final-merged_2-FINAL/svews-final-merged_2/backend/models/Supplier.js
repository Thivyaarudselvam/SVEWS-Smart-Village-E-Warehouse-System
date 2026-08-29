const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['Medical', 'Stationery', 'Electronics'],
    required: true,
  },
  // Hospital/Pharmacy (Medical) — null for
  // Stationery/Electronics, which don't have a sub-type.
  subType: { type: String, enum: ['Hospital', 'Pharmacy', 'School', 'Campus', null], default: null },
  // Human-readable, category-prefixed ID — e.g. "EDU001" — generated once
  // at creation time, see lib/displayId.js.
  displayId: { type: String, unique: true, sparse: true },
  email: String,
  phone: String,
  // Captured at registration — used by /api/suppliers/duplicate-check to
  // flag accounts that may belong to the same real business (see
  // routes/duplicateCheck.js). Never shown to other suppliers, admin-only.
  registrationIp: String,

  // ---- Raw business features (feed the ML model — same 14 features it was trained on) ----
  financial_health_score: { type: Number, default: 50 },
  profit_margin: { type: Number, default: 0.1 },
  debt_to_equity: { type: Number, default: 1.5 },
  current_ratio: { type: Number, default: 2 },
  bankruptcy_risk: { type: Number, default: 0.15 },
  on_time_delivery: { type: Number, default: 0.8 },
  defect_rate: { type: Number, default: 0.05 },
  capacity_util: { type: Number, default: 0.7 },
  lead_time_days: { type: Number, default: 20 },
  contract_compliance: { type: Number, default: 0.85 },
  dispute_rate: { type: Number, default: 0.05 },
  payment_delay_days: { type: Number, default: 15 },
  years_relation: { type: Number, default: 3 },
  late_penalty: { type: Number, default: 0 },

  // ---- Cached ML prediction (refreshed by /api/risk/:id/refresh) ----
  riskCategory: { type: String, enum: ['Stable', 'Watchlist'], default: 'Stable' },
  watchlistProbability: { type: Number, default: 0 },
  riskUpdatedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
