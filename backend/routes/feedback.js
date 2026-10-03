/**
 * FEEDBACK ROUTES
 */
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const feedbackValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').optional().isLength({ max: 1000 }),
];

router.get('/my', protect, authorize('student'), ctrl.getMyFeedback);
router.post('/events/:eventId', protect, authorize('student'), feedbackValidation, ctrl.submitFeedback);
router.get('/events/:eventId', ctrl.getEventFeedback);
router.patch('/:feedbackId/reply', protect, authorize('admin', 'organizer'), ctrl.replyToFeedback);

module.exports = router;
