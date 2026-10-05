/**
 * EVENT MODEL
 * -----------
 * MongoDB Concepts demonstrated:
 *  1. Document References ($ref)         — organizer, venue are ObjectId refs
 *  2. Embedded Array of Objects          — budget.breakdown is array of sub-docs
 *  3. Compound Unique Index              — {organizer, title, startDate} unique
 *  4. Compound Index                     — {category, startDate} for filtering
 *  5. Text Index                         — full-text search on title+description
 *  6. Pre-save Validation Hook           — ensure endDate > startDate
 *  7. Soft Delete (archive)              — status:'archived' instead of delete
 */
const mongoose = require('mongoose');

// ── Budget breakdown sub-schema ───────────────────────────────────────────────
const budgetItemSchema = new mongoose.Schema({
  item: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

// ── Main Event Schema ─────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },

  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [50, 'Description must be at least 50 characters (markdown allowed)'],
    maxlength: [10000, 'Description too long'],
  },

  // MongoDB Concept: Enum for controlled vocabulary
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar'],
      message: 'Invalid category. Must be one of: Academic, Cultural, Sports, Social, Workshop, Seminar',
    },
  },

  // MongoDB Concept: Document Reference (ObjectId ref)
  // We store ONLY the ObjectId here; we use .populate() to fetch full user data.
  // This is like a foreign key in SQL — but MongoDB does NOT enforce referential
  // integrity. We must handle it in application code.
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required'],
  },

  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: [true, 'Venue is required'],
  },

  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },

  // Event capacity (must be <= venue.capacity, checked in controller)
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
  },

  // MongoDB Concept: Atomic Counter
  // registeredCount is incremented atomically using $inc in findOneAndUpdate
  // This prevents race conditions (see registrations controller)
  registeredCount: { type: Number, default: 0, min: 0 },

  status: {
    type: String,
    enum: {
      values: ['draft', 'pending', 'published', 'rejected', 'cancelled', 'completed', 'archived'],
      message: 'Invalid event status',
    },
    default: 'draft',
  },

  posterUrl: { type: String },

  // MongoDB Concept: Embedded Array of Objects
  // budget.breakdown is an array of {item, amount} sub-documents.
  // This is denormalization — we store the breakdown WITH the event,
  // avoiding a separate "budget_items" collection and JOIN.
  budget: {
    total: { type: Number, min: 0, default: 0 },
    breakdown: [budgetItemSchema],
  },

  // Analytics fields — updated by separate routes
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },

  // MongoDB Concept: Embedded Object (flexible schema)
  // trafficSources stores where visitors came from {email, social, direct, etc.}
  trafficSources: {
    type: Map,  // Map type: keys are strings, values are numbers
    of: Number,
    default: {},
  },

  // Rating aggregates — updated when feedback is submitted
  avgRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },

  // MongoDB Concept: Array field for tagging/categorization
  // Tags allow flexible categorization beyond the category enum
  tags: [{ type: String, trim: true, lowercase: true }],

  // Rejection/cancellation reason from admin
  adminNote: { type: String, trim: true, maxlength: 500 },

  // Rescheduled from
  originalStartDate: { type: Date },
  rescheduleReason: { type: String },

}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// ── VIRTUALS ──────────────────────────────────────────────────────────────────
// MongoDB Concept: Virtual (computed, not stored)
// availableSeats is computed on-the-fly from capacity - registeredCount
eventSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.capacity - this.registeredCount);
});

eventSchema.virtual('isFull').get(function () {
  return this.registeredCount >= this.capacity;
});

eventSchema.virtual('durationHours').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  return ((this.endDate - this.startDate) / (1000 * 60 * 60)).toFixed(1);
});

// ── PRE-VALIDATE & PRE-SAVE NORMALIZATION HOOKS ──────────────────────────────
eventSchema.pre('validate', function (next) {
  if (typeof this.budget === 'string') {
    try {
      this.budget = JSON.parse(this.budget);
    } catch (e) {
      this.budget = { total: 0, breakdown: [] };
    }
  }
  if (typeof this.tags === 'string') {
    try {
      this.tags = JSON.parse(this.tags);
    } catch (e) {
      this.tags = this.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  next();
});

eventSchema.pre('save', function (next) {
  if (typeof this.budget === 'string') {
    try {
      this.budget = JSON.parse(this.budget);
    } catch (e) {
      this.budget = { total: 0, breakdown: [] };
    }
  }
  // Rule: endDate must be at least 1 hour after startDate
  if (this.startDate && this.endDate) {
    const diffMs = this.endDate - this.startDate;
    if (diffMs < 3600000) { // 1 hour in ms
      return next(new Error('Event must be at least 1 hour long'));
    }
    if (this.startDate <= new Date() && this.isNew) {
      return next(new Error('Event start date must be in the future'));
    }
  }
  next();
});

// ── INDEXES ───────────────────────────────────────────────────────────────────

// MongoDB Concept: Compound Index
// This index speeds up the very common query: "show me Academic events sorted by date"
// The index stores {category, startDate} pairs in sorted order on disk,
// so MongoDB can answer this query without scanning ALL event documents.
eventSchema.index({ category: 1, startDate: 1 });

// MongoDB Concept: Unique Compound Index
// Prevents an organizer from creating duplicate events (same title + date).
// MongoDB enforces this at the storage engine level — even concurrent inserts
// cannot both succeed if they'd create a duplicate.
eventSchema.index(
  { organizer: 1, title: 1, startDate: 1 },
  {
    unique: true,
    name: 'unique_organizer_event',
    // Partial: only enforce uniqueness for non-archived events
    partialFilterExpression: { status: { $ne: 'archived' } },
  }
);

// MongoDB Concept: Text Index
// Enables full-text search: Event.find({ $text: { $search: "hackathon coding" } })
// MongoDB tokenizes text, stems words, and builds an inverted index.
// The {weights} option makes title matches rank higher than description matches.
eventSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'event_text_search' }
);

// Status + date index for common dashboard queries
eventSchema.index({ status: 1, startDate: -1 });
eventSchema.index({ organizer: 1, status: 1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
