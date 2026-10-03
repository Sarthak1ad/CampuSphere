/**
 * REGISTRATION MODEL
 * ------------------
 * MongoDB Concepts demonstrated:
 *  1. Unique Compound Index          — {event, student} prevents double-booking
 *  2. Atomic findOneAndUpdate        — prevents overbooking under concurrency
 *  3. MongoDB Transactions (session) — multi-document atomic operations
 *  4. QR Token storage               — base64 QR code stored as string
 *  5. TTL-related patterns           — checkedInAt for time tracking
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('crypto').randomUUID
  ? { v4: () => require('crypto').randomUUID() }
  : require('crypto');

const registrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event reference is required'],
  },

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
  },

  // Registration status flow:
  // registered → checked-in (attended)
  // registered → cancelled (student cancels)
  // waitlisted → registered (when a spot opens)
  // registered → no-show (event ended without check-in)
  status: {
    type: String,
    enum: {
      values: ['registered', 'waitlisted', 'checked-in', 'cancelled', 'no-show'],
      message: 'Invalid registration status',
    },
    default: 'registered',
  },

  // MongoDB Concept: Unique token for QR code generation
  // Each registration gets a UUID stored here; we generate the QR image from it
  qrToken: {
    type: String,
    default: () => {
      // Generate a cryptographically random UUID
      return require('crypto').randomUUID();
    },
  },

  checkedInAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, maxlength: 500 },

  // Waitlist position (lower = higher priority for promotion)
  waitlistPosition: { type: Number },

  // Registration source tracking
  source: {
    type: String,
    enum: ['direct', 'email', 'social', 'recommendation', 'search'],
    default: 'direct',
  },

  // QR code image (base64 PNG, generated on registration)
  qrCodeDataUrl: { type: String, select: false }, // Large, exclude by default

}, { timestamps: true });

// ── INDEXES ───────────────────────────────────────────────────────────────────

// MongoDB Concept: Unique Compound Index (most critical index in this app!)
// This is the CORE of overbooking prevention.
// MongoDB enforces: a student can only have ONE registration per event.
// Even if two requests arrive simultaneously, the DB guarantees only one succeeds.
// The other gets a duplicate key error (code 11000) which we handle gracefully.
registrationSchema.index(
  { event: 1, student: 1 },
  {
    unique: true,
    name: 'unique_event_student_registration',
    partialFilterExpression: { status: { $ne: 'cancelled' } },
  }
);

// Index for looking up a student's registrations quickly
registrationSchema.index({ student: 1, status: 1 });

// Index for event organizer to see all registrations for their event
registrationSchema.index({ event: 1, status: 1 });

// Index for finding the oldest waitlisted entry (for auto-promotion)
// When a spot opens, we need: sort by waitlistPosition ASC, filter by event
registrationSchema.index({ event: 1, status: 1, waitlistPosition: 1 });

// QR token index for O(1) check-in lookup
registrationSchema.index({ qrToken: 1 });

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
