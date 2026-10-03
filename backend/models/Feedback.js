/**
 * FEEDBACK MODEL
 * --------------
 * MongoDB Concepts demonstrated:
 *  1. Unique Compound Index           — {event, student} one feedback per event
 *  2. Embedded Object (answers)       — structured sub-ratings stored inline
 *  3. Pre-save Hook (sentiment)       — auto-compute sentiment on save
 *  4. Partial Filter Index            — index only non-null documents
 */
const mongoose = require('mongoose');

// Simple keyword-based sentiment analysis
// In production, you'd use an NLP library or ML model
const POSITIVE_KEYWORDS = [
  'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'loved',
  'outstanding', 'brilliant', 'perfect', 'superb', 'enjoyed', 'best',
  'incredible', 'awesome', 'good', 'nice', 'helpful', 'informative', 'fun'
];
const NEGATIVE_KEYWORDS = [
  'bad', 'terrible', 'awful', 'poor', 'worst', 'horrible', 'disappointing',
  'boring', 'useless', 'waste', 'disorganized', 'pathetic', 'dull', 'mediocre',
  'confusing', 'late', 'cancelled', 'crowded', 'noisy', 'disrespectful'
];

// Compute sentiment score from a text comment
const computeSentiment = (comment) => {
  if (!comment) return 'neutral';
  const lower = comment.toLowerCase();
  let score = 0;
  POSITIVE_KEYWORDS.forEach(w => { if (lower.includes(w)) score++; });
  NEGATIVE_KEYWORDS.forEach(w => { if (lower.includes(w)) score--; });
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
};

const feedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event reference required'],
  },

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference required'],
  },

  // Overall rating (integer 1-5)
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number',
    },
  },

  // MongoDB Concept: Embedded Object
  // Instead of a separate "feedback_details" collection, we embed
  // structured answers inline. Queries can filter on nested fields:
  // Feedback.find({ 'answers.eventQuality': { $gte: 4 } })
  answers: {
    eventQuality: { type: Number, min: 1, max: 5 },
    organization: { type: Number, min: 1, max: 5 },
    venueSuitability: { type: Number, min: 1, max: 5 },
    contentRelevance: { type: Number, min: 1, max: 5 },
    overallValue: { type: Number, min: 1, max: 5 },
  },

  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },

  // MongoDB Concept: Pre-save computed field
  // Sentiment is computed from the comment text and stored for fast querying.
  // Storing computed values in MongoDB is a common "pre-computation" pattern
  // to avoid expensive computation at query time.
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral',
  },

  // Organizer's reply to this feedback
  organizerReply: {
    content: { type: String, maxlength: 1000 },
    repliedAt: { type: Date },
  },

  // Is the feedback visible publicly?
  isHidden: { type: Boolean, default: false },

}, { timestamps: true });

// ── PRE-SAVE: Auto-compute sentiment ─────────────────────────────────────────
// MongoDB Concept: Pre-save Middleware
// Every time feedback is saved, we re-compute the sentiment from the comment.
// This keeps sentiment in sync even if comment is edited.
feedbackSchema.pre('save', function (next) {
  if (this.isModified('comment') || this.isNew) {
    this.sentiment = computeSentiment(this.comment);
  }
  next();
});

// ── INDEXES ───────────────────────────────────────────────────────────────────

// MongoDB Concept: Unique Compound Index
// One student can only submit ONE feedback per event (post-attendance).
// This prevents gaming the rating system.
feedbackSchema.index(
  { event: 1, student: 1 },
  { unique: true, name: 'unique_event_student_feedback' }
);

// Index for fetching all feedback for an event, sorted by rating
feedbackSchema.index({ event: 1, rating: -1 });

// Index for sentiment analytics
feedbackSchema.index({ event: 1, sentiment: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
