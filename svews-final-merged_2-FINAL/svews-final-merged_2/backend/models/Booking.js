const mongoose = require('mongoose');

// Every status change gets appended here — powers the "who changed what,
// when" audit trail on a booking.
const statusHistorySchema = new mongoose.Schema({
  status: String,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByName: String,
  note: String,
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Medical', 'Stationery', 'Electronics'],
    required: true,
  },
  mode: { type: String, required: true }, // class | exam | consultation | labtest | installation | ...
  providerName: String,                    // teacher / doctor / technician
  clientName: { type: String, required: true },
  type: String,                            // e.g. "Live Lecture", "Mock Exam", "New Consultation"
  date: { type: Date, required: true },
  slot: String,
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], default: 'Pending' },
  statusHistory: { type: [statusHistorySchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Optional links, added for the ML-portal features (explainability,
  // Doctor appointments, etc.) — leave null for bookings that don't need
  // them, e.g. a simple class booking.
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
}, { timestamps: true });

// Which status transitions are allowed — stops a booking jumping straight
// from Pending to Completed, or being revived after Cancelled.
const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};
bookingSchema.statics.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;
bookingSchema.statics.canTransition = function (from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
};

module.exports = mongoose.model('Booking', bookingSchema);
