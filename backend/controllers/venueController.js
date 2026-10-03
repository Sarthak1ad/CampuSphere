/**
 * VENUE CONTROLLER
 * ----------------
 * CRUD for venues with geospatial search support
 */
const Venue = require('../models/Venue');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { auditLog } = require('../services/auditService');
const { validationResult } = require('express-validator');

exports.getVenues = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, search, city, lat, lng, radius = 10 } = req.query;

  const filter = { isArchived: false };
  if (city) filter['address.city'] = new RegExp(city, 'i');

  // MongoDB Concept: $near geospatial query
  // Finds venues within 'radius' km of given coordinates.
  // Results are automatically sorted by distance (closest first).
  // Requires 2dsphere index on location field.
  if (lat && lng) {
    filter.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius) * 1000, // Convert km to meters
      },
    };
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const total = await Venue.countDocuments(filter);
  const venues = await Venue.find(filter)
    .sort(lat && lng ? {} : { name: 1 }) // $near auto-sorts, so skip sort for geo queries
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .lean();

  res.json({
    success: true,
    data: venues,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

exports.getVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue || venue.isArchived) throw ApiError.notFound('Venue not found');
  res.json({ success: true, data: venue });
});

exports.createVenue = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw ApiError.badRequest('Validation failed', errors.array());

  const { name, coordinates, address, capacity, amenities, description } = req.body;

  const venue = await Venue.create({
    name,
    location: { type: 'Point', coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])] },
    address,
    capacity: parseInt(capacity),
    amenities: amenities || [],
    description,
    images: req.processedImageUrls || [],
    createdBy: req.user._id,
  });

  await auditLog({
    actor: req.user, action: 'venue.create', entity: 'Venue',
    entityId: venue._id, meta: { name }, ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: venue, message: 'Venue created successfully' });
});

exports.updateVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue || venue.isArchived) throw ApiError.notFound('Venue not found');

  const updates = { ...req.body };
  if (req.body.coordinates) {
    updates.location = {
      type: 'Point',
      coordinates: [parseFloat(req.body.coordinates[0]), parseFloat(req.body.coordinates[1])],
    };
  }
  if (req.processedImageUrls?.length) {
    updates.images = [...venue.images, ...req.processedImageUrls];
  }
  delete updates.coordinates;

  const updated = await Venue.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
  res.json({ success: true, data: updated, message: 'Venue updated' });
});

exports.archiveVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findByIdAndUpdate(
    req.params.id,
    { $set: { isArchived: true } },
    { new: true }
  );
  if (!venue) throw ApiError.notFound('Venue not found');

  await auditLog({ actor: req.user, action: 'venue.archive', entity: 'Venue', entityId: venue._id, ipAddress: req.ip });
  res.json({ success: true, message: 'Venue archived' });
});
