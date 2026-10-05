/**
 * EVENT CONTROLLER
 * ----------------
 * MongoDB Concepts used:
 *  - $text search (full-text search via text index)
 *  - $near geospatial query (via venue's 2dsphere index)
 *  - populate() for joining referenced documents
 *  - Aggregation pipeline for analytics
 *  - Soft delete (archive status)
 *  - Compound index optimization for category+date filtering
 */
const Event = require('../models/Event');
const Venue = require('../models/Venue');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { auditLog } = require('../services/auditService');
const { validationResult } = require('express-validator');

// ── LIST EVENTS (with pagination, search, filter) ─────────────────────────────
exports.getEvents = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 12, category, status, search,
    startDate, endDate, organizer, sort = '-startDate',
    lat, lng, radius = 10, // km
    tags,
  } = req.query;

  // Build filter query dynamically
  const filter = {};

  // Only non-admin users see published events by default
  if (req.user?.role === 'admin') {
    if (status) filter.status = status;
    else filter.status = { $ne: 'archived' };
  } else if (req.user?.role === 'organizer') {
    filter.organizer = req.user._id;
    if (status) filter.status = status;
    else filter.status = { $ne: 'archived' };
  } else {
    // Students and guests see only published events
    filter.status = 'published';
  }

  // Category filter — MongoDB Concept: Exact match on indexed field
  if (category) filter.category = category;

  // Date range filter — MongoDB Concept: Range query with $gte/$lte operators
  if (startDate || endDate) {
    filter.startDate = {};
    if (startDate) filter.startDate.$gte = new Date(startDate);
    if (endDate) filter.startDate.$lte = new Date(endDate);
  }

  if (organizer) filter.organizer = organizer;
  if (tags) filter.tags = { $in: tags.split(',') };

  // MongoDB Concept: Full-Text Search using $text operator
  // The text index on {title, description, tags} allows keyword search.
  // $text automatically handles tokenization, stemming, and stop words.
  // Results can be sorted by relevance using { score: { $meta: "textScore" } }
  let query = Event.find(filter);
  let sortObj = {};

  if (search) {
    query = query.find({ $text: { $search: search } });
    sortObj = { score: { $meta: 'textScore' } }; // Rank by relevance
  } else {
    // Parse sort string: '-startDate' → { startDate: -1 }
    sort.split(',').forEach((s) => {
      const dir = s.startsWith('-') ? -1 : 1;
      sortObj[s.replace('-', '')] = dir;
    });
  }

  // Geospatial filter: if lat/lng provided, filter events by nearby venue
  // MongoDB Concept: $geoWithin + $centerSphere for radius search
  if (lat && lng) {
    const radiusInRadians = parseFloat(radius) / 6378.1; // Earth radius in km
    const nearbyVenues = await Venue.find({
      location: {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusInRadians],
        },
      },
      isArchived: false,
    }).select('_id');

    filter.venue = { $in: nearbyVenues.map(v => v._id) };
    query = Event.find(filter);
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Event.countDocuments(filter);

  // MongoDB Concept: populate() performs a "lookup" JOIN between collections
  // It replaces the ObjectId reference with the full document from the other collection.
  // Under the hood, Mongoose runs TWO queries: one for events, one for the referenced docs.
  const events = await query
    .populate('organizer', 'name email organizerProfile.orgName avatar')
    .populate('venue', 'name address capacity location')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .lean(); // .lean() returns plain JS objects (faster, less memory than Mongoose docs)

  res.json({
    success: true,
    data: events,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ── GET SINGLE EVENT ──────────────────────────────────────────────────────────
exports.getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name email organizerProfile avatar')
    .populate('venue', 'name address capacity amenities images location');

  if (!event) throw ApiError.notFound('Event not found');
  if (event.status === 'archived' && req.user?.role !== 'admin') {
    throw ApiError.notFound('Event not found');
  }

  // Increment view count (atomic, non-blocking)
  // MongoDB Concept: $inc operator — atomic increment, no read-modify-write race
  Event.updateOne({ _id: event._id }, { $inc: { views: 1 } }).exec();

  res.json({ success: true, data: event });
});

// ── CREATE EVENT ──────────────────────────────────────────────────────────────
exports.createEvent = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw ApiError.badRequest('Validation failed', errors.array());

  const { title, description, category, venueId, startDate, endDate,
    capacity, budget, tags, tasks } = req.body;

  // Validate organizer status — only block explicitly rejected organizers
  if (req.user.role === 'organizer') {
    const org = req.user.organizerProfile;
    if (org && org.verificationStatus === 'rejected') {
      throw ApiError.forbidden('Your organizer profile has been rejected. Contact admin for assistance.');
    }
  }

  // Validate venue exists and has sufficient capacity
  const venue = await Venue.findById(venueId);
  if (!venue || venue.isArchived) throw ApiError.notFound('Venue not found');
  if (parseInt(capacity) > venue.capacity) {
    throw ApiError.badRequest(
      `Event capacity (${capacity}) cannot exceed venue capacity (${venue.capacity})`
    );
  }

  // Parse budget and tags if received as strings (from multipart FormData)
  let parsedBudget = budget;
  if (typeof budget === 'string') {
    try {
      parsedBudget = JSON.parse(budget);
    } catch (e) {
      parsedBudget = { total: 0, breakdown: [] };
    }
  } else if (!budget) {
    parsedBudget = { total: 0, breakdown: [] };
  }

  let parsedTags = tags;
  if (typeof tags === 'string') {
    try {
      parsedTags = JSON.parse(tags);
    } catch (e) {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  } else if (!tags) {
    parsedTags = [];
  }

  let parsedTasks = tasks;
  if (typeof tasks === 'string') {
    try {
      parsedTasks = JSON.parse(tasks);
    } catch (e) {
      parsedTasks = [];
    }
  } else if (!Array.isArray(tasks)) {
    parsedTasks = [];
  }

  // Validate budget breakdown requirement
  const budgetThreshold = parseFloat(process.env.BUDGET_BREAKDOWN_THRESHOLD) || 10000;
  if (parsedBudget?.total > budgetThreshold && (!parsedBudget.breakdown || parsedBudget.breakdown.length === 0)) {
    throw ApiError.badRequest(
      `Budget breakdown is required when total budget exceeds ₹${budgetThreshold}`
    );
  }

  const event = await Event.create({
    title,
    description,
    category,
    organizer: req.user._id,
    venue: venueId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    capacity: parseInt(capacity),
    budget: parsedBudget,
    tags: parsedTags,
    tasks: parsedTasks,
    posterUrl: req.processedImageUrl || null,
    // Admins can publish directly; organizers submit for approval
    status: req.user.role === 'admin' ? 'published' : 'pending',
  });

  await auditLog({
    actor: req.user, action: 'event.create', entity: 'Event',
    entityId: event._id, meta: { title, category }, ipAddress: req.ip,
  });

  const populated = await event.populate([
    { path: 'organizer', select: 'name email' },
    { path: 'venue', select: 'name address' },
  ]);

  res.status(201).json({ success: true, data: populated, message: 'Event created successfully' });
});

// ── UPDATE EVENT ──────────────────────────────────────────────────────────────
exports.updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');

  // Organizers can only edit their own events
  if (req.user.role === 'organizer' && event.organizer.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own events');
  }

  // Can only edit draft/pending/published events (not cancelled/completed/archived)
  if (['completed', 'archived', 'cancelled'].includes(event.status) && req.user.role !== 'admin') {
    throw ApiError.badRequest('Cannot edit a completed, cancelled, or archived event');
  }

  const allowedUpdates = ['title', 'description', 'category', 'startDate', 'endDate',
    'capacity', 'budget', 'tags', 'tasks', 'posterUrl'];
  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (typeof updates.budget === 'string') {
    try {
      updates.budget = JSON.parse(updates.budget);
    } catch (e) {
      delete updates.budget;
    }
  }

  if (typeof updates.tags === 'string') {
    try {
      updates.tags = JSON.parse(updates.tags);
    } catch (e) {
      updates.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  if (typeof updates.tasks === 'string') {
    try {
      updates.tasks = JSON.parse(updates.tasks);
    } catch (e) {
      updates.tasks = [];
    }
  }

  if (req.processedImageUrl) updates.posterUrl = req.processedImageUrl;

  // If rescheduling, save original date
  if (updates.startDate && event.startDate.toISOString() !== new Date(updates.startDate).toISOString()) {
    updates.originalStartDate = event.startDate;
    updates.rescheduleReason = req.body.rescheduleReason;
    // Re-submit for approval
    if (event.status === 'published') updates.status = 'pending';
  }

  // MongoDB Concept: findByIdAndUpdate — single atomic operation
  const updated = await Event.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('organizer venue');

  // Notify registered students if event was rescheduled
  if (updates.originalStartDate) {
    const registrations = await Registration.find({
      event: event._id,
      status: { $in: ['registered', 'waitlisted'] },
    }).select('student');

    const notifications = registrations.map(r => ({
      user: r.student,
      type: 'event_updated',
      title: `Event Rescheduled: ${event.title}`,
      message: `The event "${event.title}" has been rescheduled. Please check the new date.`,
      relatedEntity: { entityType: 'Event', entityId: event._id },
    }));

    if (notifications.length > 0) {
      // MongoDB Concept: insertMany() — bulk insert in a single DB roundtrip
      await Notification.insertMany(notifications);
    }
  }

  await auditLog({
    actor: req.user, action: 'event.update', entity: 'Event',
    entityId: event._id, meta: { updatedFields: Object.keys(updates) }, ipAddress: req.ip,
  });

  res.json({ success: true, data: updated, message: 'Event updated successfully' });
});

// ── APPROVE / REJECT EVENT (Admin only) ──────────────────────────────────────
exports.reviewEvent = asyncHandler(async (req, res) => {
  const { action, note } = req.body; // action: 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) {
    throw ApiError.badRequest('Action must be approve or reject');
  }

  const event = await Event.findById(req.params.id).populate('organizer', 'name email');
  if (!event) throw ApiError.notFound('Event not found');
  if (event.status !== 'pending') {
    throw ApiError.badRequest('Only pending events can be reviewed');
  }

  const newStatus = action === 'approve' ? 'published' : 'rejected';

  // Sanitize budget if previously saved as string
  let cleanBudget = event.budget;
  if (typeof cleanBudget === 'string') {
    try {
      cleanBudget = JSON.parse(cleanBudget);
    } catch (e) {
      cleanBudget = { total: 0, breakdown: [] };
    }
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status: newStatus,
        adminNote: note || '',
        ...(typeof event.budget === 'string' ? { budget: cleanBudget } : {})
      }
    },
    { new: true }
  ).populate('organizer venue');

  // Notify the organizer
  if (event.organizer?._id) {
    await Notification.create({
      user: event.organizer._id,
      type: action === 'approve' ? 'event_approved' : 'event_rejected',
      title: `Event ${action === 'approve' ? 'Approved' : 'Rejected'}: ${event.title}`,
      message: action === 'approve'
        ? `Your event "${event.title}" has been approved and is now published!`
        : `Your event "${event.title}" was rejected. Reason: ${note || 'No reason provided'}`,
      relatedEntity: { entityType: 'Event', entityId: event._id },
    });
  }

  await auditLog({
    actor: req.user, action: `event.${action}`, entity: 'Event',
    entityId: event._id, meta: { note, previousStatus: 'pending' },
    ipAddress: req.ip, level: 'warning',
  });

  res.json({ success: true, message: `Event ${action}d successfully`, data: updatedEvent });
});

// ── DELETE (ARCHIVE) EVENT ────────────────────────────────────────────────────
exports.archiveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');

  // Only admin or the organizer who created it
  if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Not authorized to delete or archive this event');
  }

  if (req.user.role === 'organizer' && (
    event.status === 'completed' || new Date(event.startDate) <= new Date()
  )) {
    throw ApiError.badRequest('Ongoing or completed events cannot be deleted');
  }

  // MongoDB Concept: Soft Delete via findByIdAndUpdate
  await Event.findByIdAndUpdate(req.params.id, {
    $set: {
      status: 'archived',
      adminNote: req.body?.reason || 'Deleted by user'
    }
  });

  await auditLog({
    actor: req.user, action: 'event.archive', entity: 'Event',
    entityId: event._id, meta: { reason: req.body?.reason }, ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Event deleted successfully' });
});

// ── GET EVENT RECOMMENDATIONS FOR STUDENT ────────────────────────────────────
// MongoDB Concept: Aggregation Pipeline
// We use aggregation to find events matching the student's interests and past categories
exports.getRecommendations = asyncHandler(async (req, res) => {
  const student = req.user;

  // Step 1: Find categories from past registrations using aggregation
  // MongoDB Concept: $lookup (JOIN), $group (group by), $unwind (flatten arrays)
  const pastCategories = await Registration.aggregate([
    // Stage 1: Match this student's registrations
    { $match: { student: student._id, status: { $in: ['registered', 'checked-in'] } } },

    // Stage 2: JOIN with events collection
    { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'eventData' } },

    // Stage 3: Flatten the joined array (1-to-1 lookup)
    { $unwind: '$eventData' },

    // Stage 4: Group by category and count occurrences
    { $group: { _id: '$eventData.category', count: { $sum: 1 } } },

    // Stage 5: Sort by most attended category first
    { $sort: { count: -1 } },

    // Stage 6: Limit to top 3 categories
    { $limit: 3 },
  ]);

  const interestedCategories = [
    ...student.interests,
    ...pastCategories.map(p => p._id),
  ].filter(Boolean);

  // Find recommended events
  const recommended = await Event.find({
    status: 'published',
    startDate: { $gt: new Date() },
    category: interestedCategories.length > 0 ? { $in: interestedCategories } : { $exists: true },
    // Exclude events the student is already registered for
    _id: {
      $nin: await Registration.distinct('event', {
        student: student._id,
        status: { $ne: 'cancelled' },
      }),
    },
  })
    .populate('venue', 'name address')
    .populate('organizer', 'name')
    .sort('-startDate')
    .limit(8)
    .lean();

  res.json({ success: true, data: recommended });
});

// ── TRACK EVENT CLICK ─────────────────────────────────────────────────────────
exports.trackClick = asyncHandler(async (req, res) => {
  const { source = 'direct' } = req.body;

  // MongoDB Concept: $inc with dynamic Map key
  // trafficSources is a Map field; we update the specific key atomically
  await Event.updateOne(
    { _id: req.params.id },
    {
      $inc: {
        clicks: 1,
        [`trafficSources.${source}`]: 1,
      },
    }
  );

  res.json({ success: true });
});
