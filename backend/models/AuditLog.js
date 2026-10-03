/**
 * AUDIT LOG MODEL
 * ---------------
 * MongoDB Concept: Append-only audit trail
 * AuditLogs are NEVER updated or deleted — only inserted.
 * This is an immutable audit trail for security and compliance.
 *
 * MongoDB is ideal for audit logs because:
 *  - Document model handles flexible 'meta' payloads without schema changes
 *  - Time-based indexes make date-range queries fast
 *  - No JOIN needed — each log record is self-contained
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  actorRole: { type: String }, // Stored at time of action (role may change later)
  actorName: { type: String }, // Stored at time of action (name may change)

  // What action was performed
  action: {
    type: String,
    required: true,
    // Examples: 'user.login', 'event.create', 'event.approve', 'user.deactivate'
  },

  // Which collection/type of entity was affected
  entity: {
    type: String,
    required: true,
    enum: ['User', 'Event', 'Venue', 'Registration', 'Feedback', 'PlatformFeedback', 'System'],
  },

  // The ObjectId of the affected document
  entityId: { type: mongoose.Schema.Types.ObjectId },

  // MongoDB Concept: Flexible 'meta' field using Mixed type
  // Mixed type means MongoDB stores ANY valid BSON document here.
  // Perfect for audit logs where each action has different metadata:
  //   login: { ip, userAgent }
  //   event.approve: { eventTitle, previousStatus }
  //   user.deactivate: { reason }
  meta: { type: mongoose.Schema.Types.Mixed },

  // IP address for security auditing
  ipAddress: { type: String },
  userAgent: { type: String },

  // Severity level
  level: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },

}, {
  // Note: Only createdAt — we NEVER update audit logs, so no updatedAt needed
  timestamps: { createdAt: true, updatedAt: false },
});

// ── INDEXES ───────────────────────────────────────────────────────────────────
// Audit logs are queried by actor, entity, and date range
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
