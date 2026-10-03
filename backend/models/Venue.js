/**
 * VENUE MODEL
 * -----------
 * MongoDB Concepts demonstrated:
 *  1. GeoJSON / 2dsphere Index  — enables geospatial queries ($near, $geoWithin)
 *  2. Array of Strings           — amenities stored as embedded array
 *  3. Soft Delete (isArchived)   — never hard delete venues
 *  4. Compound Index             — name + location for efficient lookups
 */
const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true,
    minlength: [2, 'Venue name too short'],
    maxlength: [200, 'Venue name too long'],
  },

  // MongoDB Concept: GeoJSON
  // MongoDB natively understands GeoJSON format for location data.
  // type: "Point" with [longitude, latitude] coordinates enables:
  //   - $near queries: "find venues within 5km of me"
  //   - $geoWithin queries: "find venues inside this polygon"
  // REQUIRES a 2dsphere index (created below)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude] — note: longitude FIRST in GeoJSON!
      required: [true, 'Venue coordinates are required'],
      validate: {
        validator: (v) => v.length === 2 &&
          v[0] >= -180 && v[0] <= 180 &&  // longitude range
          v[1] >= -90 && v[1] <= 90,       // latitude range
        message: 'Invalid coordinates. Format: [longitude, latitude]',
      },
    },
  },

  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true, required: [true, 'City is required'] },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
  },

  capacity: {
    type: Number,
    required: [true, 'Venue capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [100000, 'Capacity seems unrealistically high'],
  },

  // MongoDB Concept: Array of Strings
  // amenities is a simple array — MongoDB stores it as a BSON array.
  // Query: Venue.find({ amenities: 'WiFi' }) — checks if WiFi is in the array
  amenities: [{ type: String, trim: true }],

  // Array of image URLs (stored after processing with sharp)
  images: [{ type: String }],

  description: { type: String, trim: true, maxlength: 2000 },

  // Soft delete: archive instead of delete
  isArchived: { type: Boolean, default: false },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

// ── INDEXES ───────────────────────────────────────────────────────────────────

// MongoDB Concept: 2dsphere Index
// Required for GeoJSON queries. MongoDB builds a special spatial index
// that maps the earth's surface onto a 2D sphere, enabling distance
// calculations using the Haversine formula internally.
venueSchema.index({ location: '2dsphere' });

// Compound index for common query patterns
venueSchema.index({ name: 1, isArchived: 1 });
venueSchema.index({ 'address.city': 1, isArchived: 1 });

// Text search on venue name and city
venueSchema.index({ name: 'text', 'address.city': 'text' });

const Venue = mongoose.model('Venue', venueSchema);
module.exports = Venue;
