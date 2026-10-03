/**
 * DB LAB ROUTES (Admin only)
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dbLabController');
const { protect, authorize } = require('../middleware/auth');

router.get('/collections', protect, authorize('admin'), ctrl.getCollectionInfo);
router.get('/explain', protect, authorize('admin'), ctrl.explainComparison);
router.get('/aggregate/:pipelineId', protect, authorize('admin'), ctrl.runAggregation);
router.get('/concurrency', protect, authorize('admin'), ctrl.concurrencyDemoStats);

module.exports = router;
