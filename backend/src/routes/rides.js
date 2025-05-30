const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  getFareEstimate,
  bookRide,
  trackRide,
  completeRide,
  cancelRide,
  rateRide,
  getRideHistory
} = require('../controllers/rideController');

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  next();
};

// Simple routes without complex validation for now
router.get('/', (req, res) => {
  res.json({ message: 'Ride routes are working!' });
});

router.post('/estimate', getFareEstimate);
router.post('/book', bookRide);
router.get('/history', getRideHistory);

// Routes with simple parameter validation
router.get('/:rideId/track',
  [
    param('rideId')
      .isMongoId()
      .withMessage('Invalid ride ID')
  ],
  handleValidationErrors,
  trackRide
);

router.put('/:rideId/complete',
  [
    param('rideId')
      .isMongoId()
      .withMessage('Invalid ride ID')
  ],
  handleValidationErrors,
  completeRide
);

router.put('/:rideId/cancel',
  [
    param('rideId')
      .isMongoId()
      .withMessage('Invalid ride ID'),
    body('reason')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Cancellation reason must be between 1 and 200 characters')
  ],
  handleValidationErrors,
  cancelRide
);

router.post('/:rideId/rate',
  [
    param('rideId')
      .isMongoId()
      .withMessage('Invalid ride ID'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('feedback')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Feedback cannot exceed 500 characters')
  ],
  handleValidationErrors,
  rateRide
);

module.exports = router;