/**
 * USER MODEL
 * ----------
 * MongoDB Concepts demonstrated here:
 *  1. Schema Definition       — defines the shape/structure of documents
 *  2. Embedded Documents      — organizerProfile is embedded (not a ref)
 *  3. Enum Validation         — role must be one of defined values
 *  4. Unique Index            — email must be unique across all documents
 *  5. Pre-save Hook           — automatically hash password before saving
 *  6. Instance Methods        — comparePassword() available on every user doc
 *  7. Virtual Field           — fullRole returns a human-readable role label
 *  8. Timestamps              — createdAt & updatedAt auto-managed by Mongoose
 *  9. Soft Delete             — isActive flag; we never hard-delete users
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Embedded sub-schema for organizer-specific info ──────────────────────────
// MongoDB Concept: Embedded Documents
// Instead of a separate "organizer_profiles" collection, we embed this data
// inside the user document. Good for 1-to-1 relationships with low volatility.
const organizerProfileSchema = new mongoose.Schema({
  orgName: { type: String, trim: true },
  registrationNumber: { type: String, trim: true },
  // Verification goes through a workflow: pending → verified | rejected
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  rejectionReason: { type: String },
  verifiedAt: { type: Date },
  complianceNotes: { type: String },       // Admin's compliance feedback
  adminRating: { type: Number, min: 1, max: 5 }, // Admin rates organizer 1-5
}, { _id: false }); // _id: false — no auto _id for embedded sub-docs

// ── Main User Schema ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },

  // MongoDB Concept: Index (Unique)
  // The unique:true creates a unique index in MongoDB. Attempting to insert
  // a duplicate email throws a MongoServerError with code 11000.
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,          // ← Creates a unique index automatically
    lowercase: true,       // ← Mongoose converts to lowercase before saving
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address',
    ],
  },

  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,         // NEVER returned in queries by default (security!)
  },

  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-]{10,15}$/, 'Phone must be 10-15 digits (international format)'],
  },

  // MongoDB Concept: Enum Validation
  // MongoDB will reject any value not in this array at the application layer
  role: {
    type: String,
    enum: {
      values: ['admin', 'organizer', 'student'],
      message: 'Role must be admin, organizer, or student',
    },
    default: 'student',
  },

  // MongoDB Concept: Array Field
  // Storing interests as an array of strings — MongoDB natively supports arrays.
  // You can query: User.find({ interests: 'Academic' }) — no JOIN needed!
  interests: [{ type: String }],

  // Soft delete flag — we deactivate instead of deleting (audit trail preserved)
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetOtp: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  lastLogin: { type: Date },
  avatar: { type: String }, // URL to uploaded avatar

  // MongoDB Concept: Embedded Document (1-to-1)
  // organizerProfile is only populated when role === 'organizer'
  organizerProfile: organizerProfileSchema,

}, {
  // MongoDB Concept: Timestamps
  // Mongoose automatically adds createdAt and updatedAt fields.
  // MongoDB stores these as ISODate — great for time-based queries.
  timestamps: true,

  // MongoDB Concept: Virtuals in JSON output
  // By default virtuals don't appear in JSON; this enables them
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── VIRTUAL FIELD ─────────────────────────────────────────────────────────────
// MongoDB Concept: Mongoose Virtual
// Virtuals are computed properties NOT stored in MongoDB.
// They exist only in the application layer. Great for derived data.
userSchema.virtual('fullRole').get(function () {
  const labels = { admin: 'System Administrator', organizer: 'Event Organizer', student: 'Student' };
  return labels[this.role] || this.role;
});

// ── PRE-SAVE HOOK ─────────────────────────────────────────────────────────────
// MongoDB Concept: Mongoose Middleware (Pre-save Hook)
// This function runs BEFORE every .save() call.
// We use it to hash the password so plain text is NEVER stored.
userSchema.pre('save', async function (next) {
  // Only hash if the password was actually modified (not on other updates)
  if (!this.isModified('passwordHash')) return next();
  // If already hashed with bcrypt (e.g. from seed or external source), skip
  if (this.passwordHash && /^\$2[aby]\$\d{2}\$/.test(this.passwordHash)) return next();

  try {
    // bcryptjs: salt rounds = 12 (higher = slower but more secure)
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── INSTANCE METHOD ───────────────────────────────────────────────────────────
// MongoDB Concept: Mongoose Instance Method
// Methods defined here are available on every document retrieved from DB.
// e.g., const user = await User.findOne(...); await user.comparePassword('abc');
userSchema.methods.comparePassword = async function (candidatePassword) {
  // We need to explicitly select passwordHash since select:false hides it
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ── INDEXES ───────────────────────────────────────────────────────────────────
// MongoDB Concept: Compound Index
// A compound index on multiple fields speeds up queries that filter/sort
// by those fields together. The order matters for query optimization.
userSchema.index({ role: 1, isActive: 1 });

// MongoDB Concept: Text Index
// Allows full-text search using $text: { $search: "keyword" }
// MongoDB tokenizes the text, removes stop words, and builds an inverted index
userSchema.index({ name: 'text', email: 'text' });

const User = mongoose.model('User', userSchema);
module.exports = User;
