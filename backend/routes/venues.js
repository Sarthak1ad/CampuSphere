/**
 * VENUE ROUTES
 */
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/venueController');
const { protect, authorize } = require('../middleware/auth');
const { upload, processMultipleImages } = require('../middleware/upload');

const venueValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('capacity').isInt({ min: 1 }),
  body('coordinates').isArray({ min: 2, max: 2 }),
  body('address.city').notEmpty(),
];

router.get('/', ctrl.getVenues);
router.get('/:id', ctrl.getVenue);
router.post('/', protect, authorize('admin'),
  upload.array('images', 5),
  processMultipleImages('images', 'venues', 1200, 800),
  venueValidation, ctrl.createVenue
);
router.put('/:id', protect, authorize('admin'),
  upload.array('images', 5),
  processMultipleImages('images', 'venues', 1200, 800),
  ctrl.updateVenue
);
router.patch('/:id/archive', protect, authorize('admin'), ctrl.archiveVenue);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteVenue);

module.exports = router;
