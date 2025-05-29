const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requirePhoneVerification } = require('../middleware/auth');
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

// Rate limiting for ride booking
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each user to 5 booking requests per minute
  message: {
    success: false,
    error: 'Too many booking requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateFareEstimate = [
  body('pickup')
    .notEmpty()
    .withMessage('Pickup location is required'),
  body('pickup.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid pickup latitude is required'),
  body('pickup.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid pickup longitude is required'),
  body('destination')
    .notEmpty()
    .withMessage('Destination is required'),
  body('destination.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid destination latitude is required'),
  body('destination.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid destination longitude is required'),
  body('vehicleType')
    .isIn(['bike', 'car'])
    .withMessage('Vehicle type must be either "bike" or "car"'),
];

const validateBookRide = [
  body('pickup')
    .notEmpty()
    .withMessage('Pickup location is required'),
  body('pickup.address')
    .isLength({ min: 3, max: 200 })
    .withMessage('Pickup address must be between 3 and 200 characters'),
  body('pickup.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid pickup latitude is required'),
  body('pickup.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid pickup longitude is required'),
  body('destination')
    .notEmpty()
    .withMessage('Destination is required'),
  body('destination.address')
    .isLength({ min: 3, max: 200 })
    .withMessage('Destination address must be between 3 and 200 characters'),
  body('destination.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid destination latitude is required'),
  body('destination.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid destination longitude is required'),
  body('vehicleType')
    .isIn(['bike', 'car'])
    .withMessage('Vehicle type must be either "bike" or "car"'),
  body('specialRequests')
    .optional()
    .isArray()
    .withMessage('Special requests must be an array'),
  body('specialRequests.*')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each special request must be between 1 and 100 characters'),
];

const validateRideId = [
  param('rideId')
    .matches(/^ECO[A-Z0-9]+$/)
    .withMessage('Invalid ride ID format'),
];

const validateRating = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Feedback must be less than 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

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

// Apply authentication and phone verification to all routes
router.use(authenticateToken);
router.use(requirePhoneVerification);

/**
 * @route   POST /api/rides/estimate
 * @desc    Get fare estimate for a ride
 * @access  Private
 */
router.post('/estimate',
  validateFareEstimate,
  handleValidationErrors,
  getFareEstimate
);

/**
 * @route   POST /api/rides/book
 * @desc    Book a new ride
 * @access  Private
 */
router.post('/book',
  bookingLimiter,
  validateBookRide,
  handleValidationErrors,
  bookRide
);

/**
 * @route   GET /api/rides/:rideId/track
 * @desc    Get ride tracking information
 * @access  Private
 */
router.get('/:rideId/track',
  validateRideId,
  handleValidationErrors,
  trackRide
);

/**
 * @route   PUT /api/rides/:rideId/complete
 * @desc    Complete a ride
 * @access  Private
 */
router.put('/:rideId/complete',
  validateRideId,
  [
    body('actualDistance')
      .optional()
      .isFloat({ min: 0.1, max: 1000 })
      .withMessage('Actual distance must be between 0.1 and 1000 km'),
    body('paymentMethod')
      .optional()
      .isIn(['card', 'upi', 'wallet', 'cash', 'subscription'])
      .withMessage('Invalid payment method'),
  ],
  handleValidationErrors,
  completeRide
);

/**
 * @route   PUT /api/rides/:rideId/cancel
 * @desc    Cancel a ride
 * @access  Private
 */
router.put('/:rideId/cancel',
  validateRideId,
  [
    body('reason')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Cancellation reason must be between 1 and 200 characters'),
  ],
  handleValidationErrors,
  cancelRide
);

/**
 * @route   POST /api/rides/:rideId/rate
 * @desc    Rate a ride
 * @access  Private
 */
router.post('/:rideId/rate',
  validateRideId,
  validateRating,
  handleValidationErrors,
  rateRide
);

/**
 * @route   GET /api/rides/history
 * @desc    Get user's ride history
 * @access  Private
 */
router.get('/history',
  validatePagination,
  handleValidationErrors,
  getRideHistory
);

/**
 * @route   GET /api/rides/health
 * @desc    Health check for rides service
 * @access  Private
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Rides service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;