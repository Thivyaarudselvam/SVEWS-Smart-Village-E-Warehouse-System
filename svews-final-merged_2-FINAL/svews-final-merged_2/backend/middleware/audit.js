// middleware/audit.js — NEW FILE.
// One-line helper to write an audit entry, used by routes/bookingStatus.js
// directly, and by the two snippets in MERGE_NOTES.md for routes/suppliers.js
// and routes/risk.js.

const AuditLog = require('../models/AuditLog');

async function writeAudit({ entityType, entityId, action, user, summary, meta }) {
  return AuditLog.create({
    entityType,
    entityId,
    action,
    changedBy: user?._id,
    changedByName: user?.name,
    summary,
    meta,
  });
}

module.exports = { writeAudit };
