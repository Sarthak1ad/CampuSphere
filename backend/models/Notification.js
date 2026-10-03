/**
 * NOTIFICATION MODEL
 * ------------------
 * MongoDB Concepts demonstrated:
 *  1. TTL Index — auto-delete archived notifications after 30 days
 *     TTL (Time-To-Live) is a MongoDB feature where a background thread
 *     periodically scans documents and deletes those past their TTL.
 *     This is NATIVE MongoDB — no cron job needed for cleanup!
 *  2. Enum type field — notification type
 *  3. Index on user for efficient per-user notification queries
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },

  type: {
    type: String,
    required: true,
    enum: [
      'registration_confirmed',
      'waitlisted',
      'waitlist_promoted',
      'event_updated',
      'event_cancelled',
      'event_reminder',
      'event_approved',
      'event_rejected',
      'organizer_verified',
      'organizer_rejected',
      'feedback_reply',
      'check_in_confirmed',
      'system',
    ],
  },

  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: 200,
  },

  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: 2000,
  },

  // Related entity (e.g., the event this notification is about)
  relatedEntity: {
    entityType: { type: String, enum: ['Event', 'Registration', 'User', 'Venue'] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
  },

  isRead: { type: Boolean, default: false },
  readAt: { type: Date },

  // MongoDB Concept: TTL Index
  // When isArchived becomes true, we set archivedAt to current timestamp.
  // The TTL index (defined below) will then auto-delete this document
  // 30 days (2592000 seconds) after archivedAt.
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null }, // TTL index triggers on this field

}, { timestamps: true });

// ── INDEXES ───────────────────────────────────────────────────────────────────

// Index for fetching a user's notifications efficiently
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isArchived: 1, createdAt: -1 });

// MongoDB Concept: TTL (Time-To-Live) Index
// This is a NATIVE MongoDB feature — very powerful!
// MongoDB's background thread checks this index every ~60 seconds.
// If archivedAt + 30 days < now, MongoDB AUTOMATICALLY DELETES the document.
// No cron job, no manual cleanup needed!
// expireAfterSeconds: 2592000 = 30 days × 24h × 60min × 60sec
notificationSchema.index(
  { archivedAt: 1 },
  {
    expireAfterSeconds: 2592000, // 30 days
    name: 'ttl_archived_notifications',
    partialFilterExpression: { isArchived: true }, // Only apply TTL to archived ones
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
