require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { loadModel, predictRisk, FEATURES } = require('./ml/riskEngine');

const authRoutes = require('./routes/auth');
const supplierRoutes = require('./routes/suppliers');
const riskRoutes = require('./routes/risk');
const bookingRoutes = require('./routes/bookings');
const Supplier = require('./models/Supplier');
const { computeAutoMetrics } = require('./lib/autoMetrics');

// Feature routes — final scope: product/medicine marketplace + ML risk
// engine. (Doctor booking, Teacher/Course subscriptions, and the monthly
// platform fee were removed — see MERGE_NOTES.md for the finalized scope.)
const riskExplainRoutes = require('./routes/riskExplain');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');
const notificationRoutes = require('./routes/notifications');
const auditRoutes = require('./routes/audit');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const registrationFeeRoutes = require('./routes/registrationFee');
const earningsRoutes = require('./routes/earnings');
const medicineRoutes = require('./routes/medicines');
const productRoutes = require('./routes/products');
const complianceDocRoutes = require('./routes/complianceDocs');
const chatbotRoutes = require('./routes/chatbot');
const duplicateCheckRoutes = require('./routes/duplicateCheck');
const reviewRoutes = require('./routes/reviews');
const wishlistRoutes = require('./routes/wishlist');
const couponRoutes = require('./routes/coupons');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'svews-backend' }));

// Original 4
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/bookings', bookingRoutes);

// Everything added on top
app.use('/api/risk', riskExplainRoutes);              // adds GET /:id/explain + POST /:id/auto-refresh
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/registration', registrationFeeRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/products', productRoutes);
app.use('/api/compliance-docs', complianceDocRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/duplicate-check', duplicateCheckRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

(async () => {
  await connectDB();
  await loadModel(); // warm up the ONNX model once at boot, not on every request
  app.listen(PORT, () => console.log(`[server] SVEWS backend running on http://localhost:${PORT}`));

  // Nightly auto-metrics refresh — every supplier's operational features
  // (9 of 14) are recalculated from real Booking/Order activity and the
  // ML model re-scores automatically. See lib/autoMetrics.js.
  setInterval(async () => {
    try {
      const suppliers = await Supplier.find().select('_id createdAt riskCategory');
      let changed = 0;
      for (const supplier of suppliers) {
        const auto = await computeAutoMetrics(supplier._id, supplier.createdAt);
        supplier.years_relation = auto.years_relation;
        supplier.contract_compliance = auto.contract_compliance;
        supplier.dispute_rate = auto.dispute_rate;
        supplier.payment_delay_days = auto.payment_delay_days;
        supplier.on_time_delivery = auto.on_time_delivery;
        supplier.lead_time_days = auto.lead_time_days;
        supplier.late_penalty = auto.late_penalty;
        supplier.capacity_util = auto.capacity_util;
        supplier.financial_health_score = auto.financial_health_score;
        supplier.bankruptcy_risk = auto.bankruptcy_risk;

        const featurePayload = {};
        FEATURES.forEach(f => { featurePayload[f] = Number(supplier[f]); });
        const prediction = await predictRisk(featurePayload);
        if (prediction.riskCategory !== supplier.riskCategory) changed++;
        supplier.riskCategory = prediction.riskCategory;
        supplier.watchlistProbability = prediction.watchlistProbability;
        supplier.riskUpdatedAt = new Date();
        await supplier.save();
      }
      console.log(`[auto-metrics] Nightly refresh — ${suppliers.length} suppliers checked, ${changed} risk category change(s)`);
    } catch (err) {
      console.error('[auto-metrics] nightly refresh failed:', err.message);
    }
  }, 24 * 60 * 60 * 1000); // once a day
})();
