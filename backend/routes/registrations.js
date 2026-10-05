/**
 * REGISTRATION ROUTES
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');

// Registration endpoints
router.post('/events/:eventId/register', protect, authorize('student'), ctrl.register);
router.post('/events/:eventId', protect, authorize('student'), ctrl.register);

// Cancellation endpoints
router.delete('/events/:eventId/cancel', protect, authorize('student'), ctrl.cancelRegistration);
router.delete('/events/:eventId', protect, authorize('student'), ctrl.cancelRegistration);
router.delete('/:id', protect, authorize('student'), ctrl.cancelRegistration);

// Attendees & QR pass
router.get('/events/:eventId/attendees', protect, authorize('admin', 'organizer', 'student'), ctrl.getAttendees);
router.get('/events/:eventId/qr', protect, authorize('student'), ctrl.getQRCode);
router.get('/my', protect, authorize('student'), ctrl.getMyRegistrations);

// Check-in endpoints
router.post('/events/:eventId/check-in', protect, authorize('admin', 'organizer'), ctrl.checkIn);
router.post('/check-in', protect, authorize('admin', 'organizer'), ctrl.checkIn);

router.get('/concurrency-stats', protect, authorize('admin'), ctrl.concurrencyDemo);

module.exports = router;

