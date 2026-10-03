/**
 * AUDIT LOGGER SERVICE
 * --------------------
 * Centralized service to create audit log entries.
 * Called from controllers after significant actions.
 */
const AuditLog = require('../models/AuditLog');

const auditLog = async ({ actor, action, entity, entityId, meta, ipAddress, userAgent, level = 'info' }) => {
  try {
    await AuditLog.create({
      actor: actor._id || actor,
      actorRole: actor.role,
      actorName: actor.name,
      action,
      entity,
      entityId,
      meta,
      ipAddress,
      userAgent,
      level,
    });
  } catch (err) {
    // Never throw — audit failures should not break the main flow
    console.error('⚠️  Audit log failed:', err.message);
  }
};

module.exports = { auditLog };
