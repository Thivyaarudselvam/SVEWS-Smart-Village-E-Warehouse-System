// models/ComplianceDoc.js — NEW FILE.
// A supplier's uploaded compliance document (license, certificate, etc.)
// The actual file is stored on disk (see routes/complianceDocs.js) —
// this record just tracks metadata + verification status.

const mongoose = require('mongoose');

const complianceDocSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  docType: { type: String, enum: ['Business License', 'Quality Certificate', 'Tax Compliance'], required: true },
  originalFileName: { type: String, required: true },
  storedFileName: { type: String, required: true }, // the on-disk, collision-safe filename
  fileSizeBytes: Number,
  status: { type: String, enum: ['Pending Verification', 'Verified', 'Rejected'], default: 'Pending Verification' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  rejectionReason: String,
}, { timestamps: true });

module.exports = mongoose.model('ComplianceDoc', complianceDocSchema);
