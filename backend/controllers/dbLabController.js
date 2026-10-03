/**
 * DB LAB CONTROLLER (Admin Only)
 * --------------------------------
 * Powers the "DB Lab" screen for ADBMS presentation.
 * Features:
 *  1. Collection stats + indexes
 *  2. Query with/without index + explain() comparison
 *  3. Predefined aggregation pipeline demos
 *  4. Concurrency demo
 */
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Venue = require('../models/Venue');
const asyncHandler = require('../utils/asyncHandler');

// ── 1. COLLECTION INFO ────────────────────────────────────────────────────────
exports.getCollectionInfo = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();

  const info = await Promise.all(
    collections.map(async (col) => {
      const collection = db.collection(col.name);

      // MongoDB Concept: collStats gives document count, storage size, indexes
      const stats = await db.command({ collStats: col.name });

      // MongoDB Concept: getIndexes() returns all indexes on a collection
      const indexes = await collection.indexes();

      return {
        name: col.name,
        count: stats.count,
        sizeBytes: stats.size,
        avgDocSizeBytes: stats.avgObjSize,
        indexes: indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false,
          expireAfterSeconds: idx.expireAfterSeconds,
          textWeights: idx.weights,
        })),
      };
    })
  );

  res.json({ success: true, data: info });
});

// ── 2. EXPLAIN PLAN COMPARISON ────────────────────────────────────────────────
// Runs the same query with and without an index and shows executionStats side-by-side
exports.explainComparison = asyncHandler(async (req, res) => {
  const { queryType = 'emailLookup' } = req.query;
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  let withIndex, withoutIndex;

  if (queryType === 'emailLookup') {
    // ── WITH INDEX: email has a unique index ─────────────────────────────────
    // MongoDB Concept: explain('executionStats') returns:
    //   - executionTimeMillis: how long the query took
    //   - totalDocsExamined: how many docs MongoDB looked at (lower = better)
    //   - totalKeysExamined: index entries examined
    //   - winningPlan: which index/strategy MongoDB chose
    withIndex = await usersCol.find({ email: 'admin@campus.edu' })
      .explain('executionStats');

    // ── WITHOUT INDEX: Use a regex on 'name' (no index) ─────────────────────
    // This forces a COLLSCAN (Collection Scan) — reads EVERY document
    // MongoDB has to scan all documents to find matches — O(n) instead of O(log n)
    withoutIndex = await usersCol.find({ name: /Admin/i })
      .explain('executionStats');

  } else if (queryType === 'categoryDate') {
    // With compound index {category, startDate}
    withIndex = await db.collection('events')
      .find({ category: 'Academic', startDate: { $gt: new Date() } })
      .sort({ startDate: 1 })
      .explain('executionStats');

    // Without index: search only by description (no index on description alone)
    withoutIndex = await db.collection('events')
      .find({ views: { $gt: 100 } })
      .explain('executionStats');

  } else if (queryType === 'textSearch') {
    // Text index query
    withIndex = await db.collection('events')
      .find({ $text: { $search: 'workshop' } })
      .explain('executionStats');

    // Without: regex on title (full collection scan)
    withoutIndex = await db.collection('events')
      .find({ title: { $regex: 'workshop', $options: 'i' } })
      .explain('executionStats');
  }

  // Extract the key metrics for easy display
  const extractStats = (plan) => ({
    executionTimeMs: plan?.executionStats?.executionTimeMillis,
    docsExamined: plan?.executionStats?.totalDocsExamined,
    docsReturned: plan?.executionStats?.nReturned,
    keysExamined: plan?.executionStats?.totalKeysExamined,
    stage: plan?.executionStats?.executionStages?.stage,
    indexUsed: plan?.queryPlanner?.winningPlan?.inputStage?.indexName
      || plan?.queryPlanner?.winningPlan?.inputStage?.inputStage?.indexName
      || 'None (COLLSCAN)',
    fullPlan: plan,
  });

  res.json({
    success: true,
    data: {
      queryType,
      withIndex: extractStats(withIndex),
      withoutIndex: extractStats(withoutIndex),
      explanation: {
        emailLookup: 'Unique index on email field vs. regex on name (no index)',
        categoryDate: 'Compound index {category, startDate} vs. field with no index',
        textSearch: 'Text index $search vs. regex on title (COLLSCAN)',
      }[queryType],
    },
  });
});

// ── 3. PREDEFINED AGGREGATION DEMOS ──────────────────────────────────────────
exports.runAggregation = asyncHandler(async (req, res) => {
  const { pipelineId } = req.params;

  const pipelines = {
    // Pipeline 1: Event Statistics by Category
    eventsByCategory: {
      description: 'Count events per category with average rating and total registrations',
      collection: 'events',
      pipeline: [
        { $match: { status: { $ne: 'archived' } } },
        {
          $group: {
            _id: '$category',
            eventCount: { $sum: 1 },
            avgRating: { $avg: '$avgRating' },
            totalRegistrations: { $sum: '$registeredCount' },
            totalViews: { $sum: '$views' },
            publishedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
            },
          },
        },
        { $sort: { eventCount: -1 } },
        {
          $project: {
            category: '$_id',
            eventCount: 1,
            avgRating: { $round: ['$avgRating', 2] },
            totalRegistrations: 1,
            totalViews: 1,
            publishedCount: 1,
            _id: 0,
          },
        },
      ],
    },

    // Pipeline 2: Monthly Registration Trend
    monthlyTrend: {
      description: 'Registration count per month for the last 12 months',
      collection: 'registrations',
      pipeline: [
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: {
                  $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 },
                },
              },
            },
            count: 1,
            checkedIn: 1,
            cancelled: 1,
            _id: 0,
          },
        },
      ],
    },

    // Pipeline 3: Top Organizers by Performance
    topOrganizers: {
      description: 'Organizers ranked by total events, registrations, and average rating',
      collection: 'events',
      pipeline: [
        { $match: { status: { $in: ['published', 'completed'] } } },
        {
          $group: {
            _id: '$organizer',
            totalEvents: { $sum: 1 },
            totalRegistrations: { $sum: '$registeredCount' },
            totalViews: { $sum: '$views' },
            avgRating: { $avg: '$avgRating' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'organizer',
            pipeline: [{ $project: { name: 1, 'organizerProfile.orgName': 1 } }],
          },
        },
        { $unwind: '$organizer' },
        {
          $project: {
            organizerName: '$organizer.name',
            orgName: '$organizer.organizerProfile.orgName',
            totalEvents: 1,
            totalRegistrations: 1,
            totalViews: 1,
            avgRating: { $round: ['$avgRating', 2] },
            _id: 0,
          },
        },
        { $sort: { totalEvents: -1 } },
        { $limit: 10 },
      ],
    },

    // Pipeline 4: Sentiment Analysis Summary
    sentimentSummary: {
      description: 'Breakdown of feedback sentiment across all events',
      collection: 'feedbacks',
      pipeline: [
        {
          $facet: {
            bySentiment: [
              { $group: { _id: '$sentiment', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
              { $sort: { count: -1 } },
            ],
            overallStats: [
              {
                $group: {
                  _id: null,
                  totalFeedbacks: { $sum: 1 },
                  overallAvgRating: { $avg: '$rating' },
                  avgEventQuality: { $avg: '$answers.eventQuality' },
                  avgOrganization: { $avg: '$answers.organization' },
                },
              },
            ],
            ratingBuckets: [
              {
                $bucket: {
                  groupBy: '$rating',
                  boundaries: [1, 2, 3, 4, 5, 6],
                  default: 'Other',
                  output: { count: { $sum: 1 } },
                },
              },
            ],
          },
        },
      ],
    },

    // Pipeline 5: Venue Utilization Heatmap
    venueUtilization: {
      description: 'Which venues are most used and their fill rates',
      collection: 'events',
      pipeline: [
        { $match: { status: { $ne: 'archived' } } },
        {
          $lookup: {
            from: 'venues',
            localField: 'venue',
            foreignField: '_id',
            as: 'venueData',
          },
        },
        { $unwind: '$venueData' },
        {
          $group: {
            _id: '$venue',
            venueName: { $first: '$venueData.name' },
            venueCity: { $first: '$venueData.address.city' },
            venueCapacity: { $first: '$venueData.capacity' },
            totalEvents: { $sum: 1 },
            totalRegistrations: { $sum: '$registeredCount' },
            avgFillRate: {
              $avg: {
                $cond: [
                  { $gt: ['$capacity', 0] },
                  { $multiply: [{ $divide: ['$registeredCount', '$capacity'] }, 100] },
                  0,
                ],
              },
            },
          },
        },
        { $sort: { totalEvents: -1 } },
        {
          $project: {
            venueName: 1,
            venueCity: 1,
            venueCapacity: 1,
            totalEvents: 1,
            totalRegistrations: 1,
            avgFillRate: { $round: ['$avgFillRate', 1] },
            _id: 0,
          },
        },
      ],
    },
  };

  if (!pipelines[pipelineId]) {
    return res.status(400).json({
      success: false,
      message: `Unknown pipeline. Available: ${Object.keys(pipelines).join(', ')}`,
    });
  }

  const { description, collection, pipeline } = pipelines[pipelineId];

  // Execute the aggregation
  const startTime = Date.now();
  const result = await mongoose.connection.db.collection(collection).aggregate(pipeline).toArray();
  const executionTimeMs = Date.now() - startTime;

  res.json({
    success: true,
    data: {
      pipelineId,
      description,
      pipeline, // Show the JSON pipeline for educational purposes
      result,
      meta: {
        collection,
        resultCount: Array.isArray(result) ? result.length : 1,
        executionTimeMs,
      },
    },
  });
});

// ── 4. CONCURRENCY DEMO RESULT ────────────────────────────────────────────────
exports.concurrencyDemoStats = asyncHandler(async (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ success: false, message: 'eventId required' });

  const event = await Event.findById(eventId).lean();
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

  const [registered, waitlisted, cancelled] = await Promise.all([
    Registration.countDocuments({ event: eventId, status: 'registered' }),
    Registration.countDocuments({ event: eventId, status: 'waitlisted' }),
    Registration.countDocuments({ event: eventId, status: 'cancelled' }),
  ]);

  res.json({
    success: true,
    data: {
      eventTitle: event.title,
      capacity: event.capacity,
      registeredCount: event.registeredCount,
      registered,
      waitlisted,
      cancelled,
      explanation: `Out of all concurrent registration attempts, only ${event.capacity} succeeded (registered). The rest were automatically waitlisted. MongoDB's atomic $inc with conditional check ($lt capacity) prevented ANY overbooking — even with simultaneous requests.`,
    },
  });
});
