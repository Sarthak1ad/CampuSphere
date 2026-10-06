/**
 * ANALYTICS / REPORTS CONTROLLER
 * --------------------------------
 * ALL reports use MongoDB Aggregation Pipelines.
 *
 * MongoDB Aggregation concepts used:
 *  $match      — filter documents (like WHERE)
 *  $group      — group by field and compute aggregates (like GROUP BY + SUM/COUNT/AVG)
 *  $lookup     — join with another collection (like JOIN)
 *  $unwind     — flatten array fields (like UNNEST)
 *  $project    — reshape documents (like SELECT)
 *  $sort       — sort results (like ORDER BY)
 *  $facet      — multiple sub-pipelines in one pass
 *  $bucket     — group into ranges (like histogram buckets)
 *  $dateToString — format dates
 *  $avg, $sum  — aggregation operators
 */
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Venue = require('../models/Venue');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { Parser } = require('json2csv');

// ── ADMIN: DASHBOARD OVERVIEW ─────────────────────────────────────────────────
exports.adminDashboard = asyncHandler(async (req, res) => {
  // MongoDB Concept: Running multiple aggregation pipelines in parallel with Promise.all()
  const [eventStats, userStats, registrationStats, recentActivity, registrationTotals] = await Promise.all([

    // Pipeline 1: Event statistics by status
    // $facet: runs multiple sub-pipelines on the SAME input in a single DB pass!
    // This is very efficient — one query, multiple result sets.
    Event.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          totalViews: [
            { $group: { _id: null, total: { $sum: '$views' }, avgRating: { $avg: '$avgRating' } } },
          ],
        },
      },
    ]),

    // Pipeline 2: User counts by role
    User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),

    // Pipeline 3: Registration stats for last 30 days
    Registration.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: {
            // MongoDB Concept: $dateToString — formats a Date field as a string
            // Here we group registrations by day for a time-series chart
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          },
          count: { $sum: 1 },
          checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),

    // Pipeline 4: Recent audit log activity
    AuditLog.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'actor',
          foreignField: '_id',
          as: 'actorDetails',
          pipeline: [{ $project: { name: 1, role: 1, avatar: 1 } }],
        },
      },
      { $unwind: { path: '$actorDetails', preserveNullAndEmpty: true } },
    ]),

    // Keep dashboard totals based on live registration records rather than the
    // event counter, which can include historical/cancelled records.
    Registration.aggregate([
      { $match: { status: { $in: ['registered', 'checked-in', 'waitlisted'] } } },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          totalCheckedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const eventSummary = eventStats[0] || {};
  const activeUsers = userStats.reduce((total, item) => total + item.count, 0);
  res.json({
    success: true,
    data: {
      events: eventStats[0],
      users: userStats,
      registrationTrend: registrationStats,
      recentActivity,
      // Flat fields are consumed by the admin dashboard cards.
      totalEvents: (eventSummary.byStatus || []).reduce((total, item) => total + item.count, 0),
      totalStudents: userStats.find(item => item._id === 'student')?.count || 0,
      totalOrganizers: userStats.find(item => item._id === 'organizer')?.count || 0,
      totalActiveUsers: activeUsers,
      totalRegistrations: registrationTotals[0]?.totalRegistrations || 0,
      totalCheckedIn: registrationTotals[0]?.totalCheckedIn || 0,
      avgRating: eventSummary.totalViews?.[0]?.avgRating || 0,
    },
  });
});

// ── ADMIN: ATTENDANCE ANALYTICS ───────────────────────────────────────────────
exports.attendanceAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const pipeline = [
    // Stage 1: Filter by date if provided
    ...(Object.keys(dateFilter).length > 0 ? [{ $match: { createdAt: dateFilter } }] : []),

    // Stage 2: JOIN with events to get event details
    {
      $lookup: {
        from: 'events',
        localField: 'event',
        foreignField: '_id',
        as: 'event',
      },
    },
    { $unwind: '$event' }, // Flatten the joined array

    // Stage 3: Group by event to compute attendance metrics
    {
      $group: {
        _id: '$event._id',
        eventTitle: { $first: '$event.title' },
        category: { $first: '$event.category' },
        totalRegistered: { $sum: 1 },
        checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        waitlisted: { $sum: { $cond: [{ $eq: ['$status', 'waitlisted'] }, 1, 0] } },
        capacity: { $first: '$event.capacity' },
        startDate: { $first: '$event.startDate' },
      },
    },

    // Stage 4: Compute derived metrics
    {
      $project: {
        eventTitle: 1,
        category: 1,
        totalRegistered: 1,
        checkedIn: 1,
        noShow: 1,
        cancelled: 1,
        waitlisted: 1,
        capacity: 1,
        startDate: 1,
        // Attendance rate = checkedIn / totalRegistered * 100
        attendanceRate: {
          $cond: [
            { $gt: ['$totalRegistered', 0] },
            { $multiply: [{ $divide: ['$checkedIn', '$totalRegistered'] }, 100] },
            0,
          ],
        },
        // Fill rate = totalRegistered / capacity * 100
        fillRate: {
          $cond: [
            { $gt: ['$capacity', 0] },
            { $multiply: [{ $divide: ['$totalRegistered', '$capacity'] }, 100] },
            0,
          ],
        },
      },
    },

    { $sort: { attendanceRate: -1 } },
  ];

  const results = await Registration.aggregate(pipeline);

  // MongoDB Concept: $bucket for histogram
  // Group attendance rates into buckets: 0-25%, 25-50%, 50-75%, 75-100%
  const bucketPipeline = [
    ...pipeline,
    {
      $bucket: {
        groupBy: '$attendanceRate',
        boundaries: [0, 25, 50, 75, 100],
        default: 'Other',
        output: { count: { $sum: 1 }, events: { $push: '$eventTitle' } },
      },
    },
  ];

  const buckets = await Registration.aggregate(bucketPipeline);

  const totals = results.reduce((summary, event) => ({
    registered: summary.registered + event.totalRegistered - event.cancelled - event.waitlisted,
    checkedIn: summary.checkedIn + event.checkedIn,
    waitlisted: summary.waitlisted + event.waitlisted,
  }), { registered: 0, checkedIn: 0, waitlisted: 0 });

  res.json({
    success: true,
    data: {
      events: results,
      buckets,
      ...totals,
    },
  });
});

// ── ORGANIZER: EVENT ANALYTICS ────────────────────────────────────────────────
exports.organizerEventAnalytics = asyncHandler(async (req, res) => {
  const organizerId = new mongoose.Types.ObjectId(req.user._id);

  const analytics = await Event.aggregate([
    // Only this organizer's events
    { $match: { organizer: organizerId } },

    // JOIN registrations for each event
    {
      $lookup: {
        from: 'registrations',
        localField: '_id',
        foreignField: 'event',
        as: 'registrations',
      },
    },

    // JOIN feedback
    {
      $lookup: {
        from: 'feedbacks',
        localField: '_id',
        foreignField: 'event',
        as: 'feedbacks',
      },
    },

    // Build rich analytics per event
    {
      $project: {
        title: 1,
        category: 1,
        status: 1,
        startDate: 1,
        capacity: 1,
        registeredCount: 1,
        views: 1,
        clicks: 1,
        avgRating: 1,
        totalRegistrations: {
          $size: {
            $filter: {
              input: '$registrations',
              as: 'r',
              cond: { $in: ['$$r.status', ['registered', 'checked-in']] },
            },
          },
        },
        checkedIn: {
          $size: {
            $filter: {
              input: '$registrations',
              as: 'r',
              cond: { $eq: ['$$r.status', 'checked-in'] },
            },
          },
        },
        waitlisted: {
          $size: {
            $filter: {
              input: '$registrations',
              as: 'r',
              cond: { $eq: ['$$r.status', 'waitlisted'] },
            },
          },
        },
        totalFeedbacks: { $size: '$feedbacks' },
        avgFeedbackRating: { $avg: '$feedbacks.rating' },
        revenue: '$budget.total',
        // Conversion: clicks → registrations
        clickToRegRate: {
          $cond: [
            { $gt: ['$clicks', 0] },
            { $multiply: [{ $divide: ['$registeredCount', '$clicks'] }, 100] },
            0,
          ],
        },
      },
    },

    { $sort: { startDate: -1 } },
  ]);

  // Summary totals using $group
  const summary = await Event.aggregate([
    { $match: { organizer: organizerId } },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        publishedEvents: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
        totalViews: { $sum: '$views' },
        totalClicks: { $sum: '$clicks' },
        avgRating: { $avg: '$avgRating' },
        totalCapacity: { $sum: '$capacity' },
        totalRegistered: { $sum: '$registeredCount' },
      },
    },
  ]);

  const eventBreakdown = analytics.map(event => ({
    eventTitle: event.title,
    totalRegistered: event.totalRegistrations,
    checkedIn: event.checkedIn,
    waitlisted: event.waitlisted,
    attendanceRate: event.totalRegistrations > 0
      ? (event.checkedIn / event.totalRegistrations) * 100
      : 0,
    avgRating: event.avgFeedbackRating || event.avgRating || 0,
  }));
  const totals = eventBreakdown.reduce((result, event) => ({
    totalRegistrations: result.totalRegistrations + event.totalRegistered,
    checkedIn: result.checkedIn + event.checkedIn,
    waitlisted: result.waitlisted + event.waitlisted,
  }), { totalRegistrations: 0, checkedIn: 0, waitlisted: 0 });
  const byCategory = analytics.reduce((categories, event) => {
    const category = categories.find(item => item._id === event.category);
    if (category) category.totalEvents += 1;
    else categories.push({ _id: event.category, totalEvents: 1 });
    return categories;
  }, []);
  const summaryData = summary[0] || {};

  res.json({
    success: true,
    data: {
      ...summaryData,
      totalRegistrations: totals.totalRegistrations,
      attendanceRate: totals.totalRegistrations
        ? (totals.checkedIn / totals.totalRegistrations) * 100
        : 0,
      byCategory,
      eventBreakdown,
      // Preserve the detailed response for consumers that need event fields.
      events: analytics,
      summary: summaryData,
    },
  });
});

// ── ORGANIZER: CAMPUS-WIDE SUMMARY ──────────────────────────────────────────
// This endpoint intentionally returns aggregate counts only. Detailed event
// analytics remain restricted to the authenticated organizer above.
exports.campusEventSummary = asyncHandler(async (req, res) => {
  const campusEventFilter = {
    status: { $nin: ['draft', 'rejected', 'cancelled', 'archived'] },
  };

  const [eventCounts, registrationCounts] = await Promise.all([
    Event.aggregate([
      { $match: campusEventFilter },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          publishedEvents: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          completedEvents: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]),
    Registration.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: '$event' },
      { $match: { 'event.status': { $in: ['pending', 'published', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalRegistrations: {
            $sum: {
              $cond: [
                { $in: ['$status', ['registered', 'checked-in']] },
                1,
                0,
              ],
            },
          },
          totalCheckedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalEvents: eventCounts[0]?.totalEvents || 0,
      publishedEvents: eventCounts[0]?.publishedEvents || 0,
      completedEvents: eventCounts[0]?.completedEvents || 0,
      totalRegistrations: registrationCounts[0]?.totalRegistrations || 0,
      totalCheckedIn: registrationCounts[0]?.totalCheckedIn || 0,
    },
  });
});

// ── ORGANIZER: COMPLETED EVENT REPORT ───────────────────────────────────────
exports.completedEventReport = asyncHandler(async (req, res) => {
  const event = await Event.findOne({
    _id: req.params.eventId,
    organizer: req.user._id,
  }).select('title status endDate tasks');

  if (!event) throw require('../utils/ApiError').notFound('Event not found');
  if (event.status !== 'completed' && new Date(event.endDate) > new Date()) {
    throw require('../utils/ApiError').badRequest('Reports are available after the event is completed');
  }

  const participantCounts = await Registration.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      event: { _id: event._id, title: event.title, status: event.status, endDate: event.endDate },
      tasks: event.tasks || [],
      participants: participantCounts.map(item => ({ status: item._id, count: item.count })),
    },
  });
});

// ── ORGANIZER: FEEDBACK ANALYSIS ──────────────────────────────────────────────
exports.feedbackAnalysis = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const analysis = await Feedback.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },

    // $facet: multiple analyses in ONE aggregation pass
    {
      $facet: {
        // Sub-pipeline 1: Overall stats
        overall: [
          {
            $group: {
              _id: null,
              avgRating: { $avg: '$rating' },
              totalFeedbacks: { $sum: 1 },
              avgEventQuality: { $avg: '$answers.eventQuality' },
              avgOrganization: { $avg: '$answers.organization' },
              avgVenueSuitability: { $avg: '$answers.venueSuitability' },
              avgContentRelevance: { $avg: '$answers.contentRelevance' },
              avgOverallValue: { $avg: '$answers.overallValue' },
            },
          },
        ],

        // Sub-pipeline 2: Rating distribution (1-5 stars)
        ratingDistribution: [
          { $group: { _id: '$rating', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],

        // Sub-pipeline 3: Sentiment distribution
        sentimentDistribution: [
          { $group: { _id: '$sentiment', count: { $sum: 1 } } },
        ],

        // Sub-pipeline 4: Recent comments
        recentComments: [
          { $match: { comment: { $exists: true, $ne: '' } } },
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: 'student',
              foreignField: '_id',
              as: 'student',
              pipeline: [{ $project: { name: 1, avatar: 1 } }],
            },
          },
          { $unwind: '$student' },
        ],
      },
    },
  ]);

  res.json({ success: true, data: analysis[0] });
});

// ── ADMIN: ORGANIZER PERFORMANCE ──────────────────────────────────────────────
exports.organizerPerformance = asyncHandler(async (req, res) => {
  const report = await User.aggregate([
    { $match: { role: 'organizer', isActive: true } },

    // JOIN events for each organizer
    {
      $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: 'organizer',
        as: 'events',
      },
    },

    {
      $project: {
        name: 1,
        email: 1,
        'organizerProfile.orgName': 1,
        'organizerProfile.verificationStatus': 1,
        'organizerProfile.adminRating': 1,
        totalEvents: { $size: '$events' },
        publishedEvents: {
          $size: {
            $filter: { input: '$events', as: 'e', cond: { $eq: ['$$e.status', 'published'] } },
          },
        },
        totalViews: { $sum: '$events.views' },
        avgEventRating: { $avg: '$events.avgRating' },
        totalBudget: { $sum: '$events.budget.total' },
      },
    },

    { $sort: { totalEvents: -1 } },
  ]);

  res.json({ success: true, data: report });
});

// ── ADMIN: VENUE UTILIZATION ──────────────────────────────────────────────────
exports.venueUtilization = asyncHandler(async (req, res) => {
  const report = await Venue.aggregate([
    { $match: { isArchived: false } },

    // JOIN events hosted at each venue
    {
      $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: 'venue',
        as: 'events',
      },
    },

    {
      $project: {
        name: 1,
        'address.city': 1,
        capacity: 1,
        totalEvents: { $size: '$events' },
        publishedEvents: {
          $size: {
            $filter: { input: '$events', as: 'e', cond: { $eq: ['$$e.status', 'published'] } },
          },
        },
        avgAttendees: { $avg: '$events.registeredCount' },
        totalRegistrations: { $sum: '$events.registeredCount' },
        utilizationRate: {
          $cond: [
            { $gt: [{ $size: '$events' }, 0] },
            {
              $multiply: [
                { $divide: [{ $avg: '$events.registeredCount' }, '$capacity'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },

    { $sort: { totalEvents: -1 } },
  ]);

  res.json({ success: true, data: report });
});

// ── EXPORT TO CSV ─────────────────────────────────────────────────────────────
exports.exportCSV = asyncHandler(async (req, res) => {
  const { type } = req.params;

  let data = [];
  let fields = [];

  if (type === 'events') {
    data = await Event.find({}).populate('organizer', 'name').populate('venue', 'name').lean();
    fields = ['title', 'category', 'status', 'startDate', 'endDate', 'capacity', 'registeredCount', 'avgRating', 'views'];
  } else if (type === 'registrations') {
    data = await Registration.find({}).populate('event', 'title').populate('student', 'name email').lean();
    fields = ['event.title', 'student.name', 'student.email', 'status', 'createdAt', 'checkedInAt'];
  } else if (type === 'users') {
    data = await User.find({ role: 'student' }).lean();
    fields = ['name', 'email', 'phone', 'isActive', 'createdAt'];
  }

  const parser = new Parser({ fields });
  const csv = parser.parse(data);

  res.header('Content-Type', 'text/csv');
  res.attachment(`${type}-export-${Date.now()}.csv`);
  res.send(csv);
});
