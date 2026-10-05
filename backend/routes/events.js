/**
 * EVENT ROUTES
 */
const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/eventController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { upload, processImage } = require('../middleware/upload');

const eventValidation = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description').isLength({ min: 50 }).withMessage('Description must be at least 50 characters'),
  body('category').isIn(['Academic', 'Cultural', 'Sports', 'Social', 'Workshop', 'Seminar']),
  body('venueId').optional({ checkFalsy: true }).isMongoId().withMessage('Valid venue ID required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
];

router.get('/', optionalAuth, ctrl.getEvents);
router.get('/recommendations', protect, authorize('student'), ctrl.getRecommendations);
router.get('/:id', optionalAuth, ctrl.getEvent);
router.post('/:id/click', optionalAuth, ctrl.trackClick);

router.post('/',
  protect,
  authorize('admin', 'organizer'),
  upload.single('poster'),
  processImage('poster', 'posters', 1200, 630),
  eventValidation,
  ctrl.createEvent
);

router.put('/:id',
  protect,
  authorize('admin', 'organizer'),
  upload.single('poster'),
  processImage('poster', 'posters', 1200, 630),
  ctrl.updateEvent
);

router.patch('/:id/review', protect, authorize('admin'), ctrl.reviewEvent);
router.patch('/:id/archive', protect, authorize('admin', 'organizer'), ctrl.archiveEvent);
router.delete('/:id', protect, authorize('admin', 'organizer'), ctrl.archiveEvent);

module.exports = router;
