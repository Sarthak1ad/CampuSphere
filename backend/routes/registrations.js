/**
 * REGISTRATION ROUTES
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');

router.post('/events/:eventId/register', protect, authorize('student'), ctrl.register);
router.delete('/events/:eventId/cancel', protect, authorize('student'), ctrl.cancelRegistration);
router.get('/events/:eventId/attendees', protect, authorize('admin', 'organizer'), ctrl.getAttendees);
router.get('/events/:eventId/qr', protect, authorize('student'), ctrl.getQRCode);
router.get('/my', protect, authorize('student'), ctrl.getMyRegistrations);
router.post('/check-in', protect, authorize('admin', 'organizer'), ctrl.checkIn);
router.get('/concurrency-stats', protect, authorize('admin'), ctrl.concurrencyDemo);

module.exports = router;
