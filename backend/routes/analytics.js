/**
 * ANALYTICS ROUTES
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

// Admin reports
router.get('/admin/dashboard', protect, authorize('admin'), ctrl.adminDashboard);
router.get('/admin/attendance', protect, authorize('admin'), ctrl.attendanceAnalytics);
router.get('/admin/organizers', protect, authorize('admin'), ctrl.organizerPerformance);
router.get('/admin/venues', protect, authorize('admin'), ctrl.venueUtilization);
router.get('/admin/export/:type', protect, authorize('admin'), ctrl.exportCSV);

// Organizer reports
router.get('/organizer/events', protect, authorize('admin', 'organizer'), ctrl.organizerEventAnalytics);
router.get('/organizer/campus-summary', protect, authorize('admin', 'organizer'), ctrl.campusEventSummary);
router.get('/organizer/events/:eventId/report', protect, authorize('admin', 'organizer'), ctrl.completedEventReport);
router.get('/organizer/feedback/:eventId', protect, authorize('admin', 'organizer'), ctrl.feedbackAnalysis);

module.exports = router;
