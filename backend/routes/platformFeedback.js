/**
 * PLATFORM FEEDBACK ROUTES (Student submits bug reports)
 */
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const PlatformFeedback = require('../models/PlatformFeedback');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { protect } = require('../middleware/auth');
const { upload, processImage } = require('../middleware/upload');
const { validationResult } = require('express-validator');

router.get('/', protect, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status } = req.query;
  const filter = {};
  if (req.user.role !== 'admin') {
    filter.user = req.user._id;
  } else {
    if (type) filter.type = type;
    if (status) filter.status = status;
  }
  const total = await PlatformFeedback.countDocuments(filter);
  const items = await PlatformFeedback.find(filter)
    .populate('user', 'name email avatar')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));
  res.json({ success: true, data: items, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
}));

router.patch('/:id/status', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw ApiError.forbidden('Admin access required');
  }
  const { status, adminNotes } = req.body;
  const item = await PlatformFeedback.findByIdAndUpdate(
    req.params.id,
    { $set: { status, adminNotes } },
    { new: true }
  ).populate('user', 'name email avatar');
  
  if (!item) throw ApiError.notFound('Feedback item not found');
  res.json({ success: true, data: item, message: 'Status updated successfully' });
}));

router.post('/',
  protect,
  upload.single('screenshot'),
  processImage('screenshot', 'screenshots', 1920, 1080, 70),
  [
    body('type').isIn(['suggestion', 'bug']),
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('description').trim().isLength({ min: 10, max: 5000 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw ApiError.badRequest('Validation failed', errors.array());

    const item = await PlatformFeedback.create({
      user: req.user._id,
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      screenshotUrl: req.processedImageUrl || null,
    });

    res.status(201).json({ success: true, data: item, message: 'Thank you for your feedback!' });
  })
);

module.exports = router;
