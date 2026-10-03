/**
 * ADMIN USER MANAGEMENT ROUTES
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), ctrl.getAllUsers);
router.get('/:id', protect, authorize('admin'), ctrl.getUserById);
router.patch('/:id/deactivate', protect, authorize('admin'), ctrl.deactivateUser);
router.patch('/:id/activate', protect, authorize('admin'), ctrl.activateUser);
router.patch('/:id/toggle-active', protect, authorize('admin'), ctrl.toggleActive);
router.patch('/:id/verify-organizer', protect, authorize('admin'), ctrl.verifyOrganizer);

// Platform feedback
router.get('/platform-feedback', protect, authorize('admin'), ctrl.getPlatformFeedback);
router.patch('/platform-feedback/:id', protect, authorize('admin'), ctrl.updatePlatformFeedback);

module.exports = router;
