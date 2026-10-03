/**
 * NOTIFICATION ROUTES
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.getMyNotifications);
router.patch('/mark-read', protect, ctrl.markRead);
router.patch('/:id/archive', protect, ctrl.archiveNotification);
router.delete('/clear', protect, ctrl.clearAll);

module.exports = router;
