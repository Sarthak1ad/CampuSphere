/**
 * PLATFORM FEEDBACK MODEL
 * -----------------------
 * Students/users submit bug reports and feature suggestions.
 * Admin manages implementation status.
 */
const mongoose = require('mongoose');

const platformFeedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference required'],
  },

  type: {
    type: String,
    required: true,
    enum: ['suggestion', 'bug'],
  },

  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },

  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [2, 'Description must be at least 2 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },

  screenshotUrl: { type: String }, // Path to uploaded screenshot

  status: {
    type: String,
    enum: ['open', 'planned', 'in-progress', 'done'],
    default: 'open',
  },

  adminNote: { type: String, maxlength: 1000 },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  resolvedAt: { type: Date },
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

platformFeedbackSchema.index({ user: 1, type: 1 });
platformFeedbackSchema.index({ status: 1, type: 1, createdAt: -1 });

const PlatformFeedback = mongoose.model('PlatformFeedback', platformFeedbackSchema);
module.exports = PlatformFeedback;
