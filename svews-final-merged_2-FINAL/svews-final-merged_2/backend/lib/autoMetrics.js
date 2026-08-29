// lib/autoMetrics.js — NEW FILE.
//
// Derives 5 of the 14 ML features directly from real platform activity
// (Bookings, Orders) instead of the supplier typing them in manually.
// This is what makes the risk score partially self-updating: a supplier
// who actually delivers late or gets cancellations will see their score
// shift automatically, without anyone re-typing numbers.
//
// Honesty note for your report: these are PROXY calculations built from
// whatever activity exists on the platform so far. With few/no bookings,
// they fall back to neutral defaults (matching the Supplier schema's
// original defaults) rather than 0, so a brand-new supplier isn't
// unfairly flagged just for having no history yet.

const Booking = require('../models/Booking');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Medicine = require('../models/Medicine');

const NEUTRAL_DEFAULTS = {
  contract_compliance: 0.85,
  dispute_rate: 0.05,
  payment_delay_days: 15,
  on_time_delivery: 0.8,
  lead_time_days: 20,
  late_penalty: 0,
  capacity_util: 0.7,
};

function daysBetween(a, b) {
  return Math.max(0, (new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

async function computeAutoMetrics(supplierId, supplierCreatedAt) {
  // 1. years_relation — always computable, exact.
  const years_relation = +(daysBetween(supplierCreatedAt, new Date()) / 365).toFixed(2);

  // 2. contract_compliance — share of resolved bookings that completed
  // successfully rather than being cancelled.
  const resolvedBookings = await Booking.find({
    supplier: supplierId,
    status: { $in: ['Completed', 'Cancelled'] },
  }).select('status');
  let contract_compliance = NEUTRAL_DEFAULTS.contract_compliance;
  if (resolvedBookings.length > 0) {
    const completed = resolvedBookings.filter(b => b.status === 'Completed').length;
    contract_compliance = +(completed / resolvedBookings.length).toFixed(3);
  }

  // 3. dispute_rate — proxy: cancelled bookings as a share of all bookings.
  const allBookings = await Booking.find({ supplier: supplierId }).select('status');
  let dispute_rate = NEUTRAL_DEFAULTS.dispute_rate;
  if (allBookings.length > 0) {
    const cancelled = allBookings.filter(b => b.status === 'Cancelled').length;
    dispute_rate = +(cancelled / allBookings.length).toFixed(3);
  }

  // 4. payment_delay_days — average days between an order being raised
  // and it reaching "Paid" (using updatedAt as the last-transition
  // timestamp, since Order doesn't keep full status history).
  const paidOrders = await Order.find({ supplier: supplierId, status: { $in: ['Paid', 'Completed'] } })
    .select('createdAt updatedAt');
  let payment_delay_days = NEUTRAL_DEFAULTS.payment_delay_days;
  if (paidOrders.length > 0) {
    const totalDays = paidOrders.reduce((sum, o) => sum + daysBetween(o.createdAt, o.updatedAt), 0);
    payment_delay_days = +(totalDays / paidOrders.length).toFixed(1);
  }

  // 5. on_time_delivery — proxy: share of orders that reached Paid/Completed
  // rather than staying stuck or being cancelled, among orders past the
  // initial "Pending Acceptance" stage.
  const settledOrders = await Order.find({
    supplier: supplierId,
    status: { $in: ['Paid', 'Completed', 'Cancelled'] },
  }).select('status');
  let on_time_delivery = NEUTRAL_DEFAULTS.on_time_delivery;
  if (settledOrders.length > 0) {
    const successful = settledOrders.filter(o => o.status !== 'Cancelled').length;
    on_time_delivery = +(successful / settledOrders.length).toFixed(3);
  }

  // 6. lead_time_days — average days between an order being raised and it
  // being marked Completed (the fulfilment tail end, distinct from
  // payment_delay_days which stops at "Paid").
  const completedOrders = await Order.find({ supplier: supplierId, status: 'Completed' })
    .select('createdAt updatedAt');
  let lead_time_days = NEUTRAL_DEFAULTS.lead_time_days;
  if (completedOrders.length > 0) {
    const totalDays = completedOrders.reduce((sum, o) => sum + daysBetween(o.createdAt, o.updatedAt), 0);
    lead_time_days = +(totalDays / completedOrders.length).toFixed(1);
  }

  // 7. late_penalty — proxy: share of bookings whose actual completion
  // (last statusHistory entry) landed after their originally scheduled
  // date. 0 = never late, 1 = always late.
  const bookingsWithSchedule = await Booking.find({
    supplier: supplierId, status: 'Completed', date: { $exists: true },
  }).select('date statusHistory');
  let late_penalty = NEUTRAL_DEFAULTS.late_penalty;
  if (bookingsWithSchedule.length > 0) {
    const lateCount = bookingsWithSchedule.filter(b => {
      const completedEntry = [...b.statusHistory].reverse().find(h => h.status === 'Completed');
      const completedAt = completedEntry ? completedEntry.changedAt : b.updatedAt;
      return new Date(completedAt) > new Date(b.date);
    }).length;
    late_penalty = +(lateCount / bookingsWithSchedule.length).toFixed(3);
  }

  // 8. capacity_util — proxy: how much of the supplier's total declared
  // stock (Products + Medicines) has moved through paid orders recently.
  // Capped at 1.0 since utilisation can't exceed full capacity.
  const [products, medicines] = await Promise.all([
    Product.find({ supplier: supplierId }).select('stock'),
    Medicine.find({ supplier: supplierId }).select('stock'),
  ]);
  const totalCapacity = [...products, ...medicines].reduce((sum, p) => sum + (p.stock || 0), 0);
  const paidOrderCount = await Order.countDocuments({ supplier: supplierId, status: { $in: ['Paid', 'Completed'] } });
  let capacity_util = NEUTRAL_DEFAULTS.capacity_util;
  if (totalCapacity > 0) {
    capacity_util = +Math.min(1, paidOrderCount / totalCapacity).toFixed(3);
  }

  // 9 & 10. financial_health_score & bankruptcy_risk — DERIVED formulas,
  // not raw platform counts. These combine the behavioural metrics above
  // into composite indices, since no platform can observe a supplier's
  // real bank balance — this is the same "alternative credit scoring"
  // idea used by fintechs for businesses without formal credit history:
  // reliable delivery + low disputes + fast payment => inferred financial
  // stability, even without seeing their bank statement.
  const financial_health_score = +Math.min(100, Math.max(0,
    (contract_compliance * 40) + (on_time_delivery * 30) + ((1 - dispute_rate) * 20) + ((1 - late_penalty) * 10)
  )).toFixed(1);
  const bankruptcy_risk = +Math.min(1, Math.max(0,
    (dispute_rate * 0.4) + (late_penalty * 0.3) + ((1 - contract_compliance) * 0.3)
  )).toFixed(3);

  return {
    years_relation, contract_compliance, dispute_rate,
    payment_delay_days, on_time_delivery, lead_time_days,
    late_penalty, capacity_util, financial_health_score, bankruptcy_risk,
    sampleSize: { bookings: allBookings.length, orders: settledOrders.length },
  };
}

module.exports = { computeAutoMetrics };
