/**
 * FEEDBACK CONTROLLER
 * -------------------
 */
const Feedback = require('../models/Feedback');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { validationResult } = require('express-validator');

exports.submitFeedback = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw ApiError.badRequest('Validation failed', errors.array());

  const eventId = req.params.eventId || req.body.event || req.body.eventId;
  if (!eventId) throw ApiError.badRequest('Event ID is required');
  const studentId = req.user._id;

  // Verify student actually attended (checked-in status)
  const registration = await Registration.findOne({
    event: eventId,
    student: studentId,
    status: 'checked-in',
  });

  if (!registration) {
    throw ApiError.forbidden('You can only submit feedback for events you attended (checked-in)');
  }

  // Check if feedback already submitted
  const existing = await Feedback.findOne({ event: eventId, student: studentId });
  if (existing) {
    throw ApiError.conflict('You have already submitted feedback for this event');
  }

  const { rating, answers, comment } = req.body;

  // Feedback model pre-save hook will compute sentiment from comment
  const feedback = await Feedback.create({
    event: eventId,
    student: studentId,
    rating: parseInt(rating),
    answers,
    comment,
  });

  // Update event's aggregate rating using MongoDB $inc and manual calculation
  const event = await Event.findById(eventId);
  if (event) {
    const currentCount = event.ratingCount || 0;
    const currentAvg = event.avgRating || 0;
    const newCount = currentCount + 1;
    const newAvg = ((currentAvg * currentCount) + parseInt(rating)) / newCount;

    await Event.updateOne(
      { _id: eventId },
      { $set: { avgRating: parseFloat(newAvg.toFixed(2)), ratingCount: newCount } }
    );
  }

  res.status(201).json({ success: true, data: feedback, message: 'Feedback submitted successfully' });
});

exports.getEventFeedback = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sentiment, minRating } = req.query;

  const filter = { event: req.params.eventId, isHidden: false };
  if (sentiment) filter.sentiment = sentiment;
  if (minRating) filter.rating = { $gte: parseInt(minRating) };

  const total = await Feedback.countDocuments(filter);
  const feedbacks = await Feedback.find(filter)
    .populate('student', 'name avatar')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: feedbacks,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

exports.replyToFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.feedbackId).populate('event');
  if (!feedback) throw ApiError.notFound('Feedback not found');

  // Verify organizer owns the event
  if (req.user.role === 'organizer') {
    if (feedback.event.organizer.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('Not authorized');
    }
  }

  const replyContent = req.body.content || req.body.reply;
  if (!replyContent) throw ApiError.badRequest('Reply content is required');

  feedback.organizerReply = { content: replyContent, repliedAt: new Date() };
  await feedback.save();

  res.json({ success: true, data: feedback, message: 'Reply submitted' });
});

exports.getMyFeedback = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find({ student: req.user._id })
    .populate('event', 'title category posterUrl startDate')
    .sort('-createdAt');
  res.json({ success: true, data: feedbacks });
});
