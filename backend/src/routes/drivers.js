// Path: /backend/src/routes/drivers.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile,
  updateDriverLocation,
  toggleDriverAvailability,
  getDriverStats,
  getDriverEarnings,
  updateDriverVehicle,
  uploadDriverDocuments,
  getNearbyRides,
  acceptRide,
  startRide,
  completeRide,
  getDriverRideHistory
} = require('../controllers/driverController');

const router = express.Router();

// Rate limiting
const driverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  }
});

// Registration rate limiting
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: {
    success: false,
    error: 'Too many registration attempts, please try again later.'
  }
});

// Validation middleware
const validateDriverRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian mobile number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('licenseNumber')
    .isLength({ min: 8, max: 20 })
    .withMessage('License number must be between 8 and 20 characters'),
  body('licenseExpiry')
    .isISO8601()
    .withMessage('Please provide a valid license expiry date'),
  body('licenseType')
    .isIn(['LMV', 'MCWG', 'MCWOG'])
    .withMessage('License type must be LMV, MCWG, or MCWOG'),
  body('vehicle.make')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Vehicle make is required'),
  body('vehicle.model')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Vehicle model is required'),
  body('vehicle.year')
    .isInt({ min: 2015, max: new Date().getFullYear() + 1 })
    .withMessage('Vehicle year must be 2015 or later'),
  body('vehicle.color')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Vehicle color is required'),
  body('vehicle.licensePlate')
    .matches(/^[A-Z]{2}[\s-]?\d{2}[\s-]?[A-Z]{2}[\s-]?\d{4}$/)
    .withMessage('Invalid license plate format'),
  body('vehicle.vehicleType')
    .isIn(['bike', 'car'])
    .withMessage('Vehicle type must be bike or car'),
];

const validateDriverLogin = [
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian mobile number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password is required'),
];

const validateLocationUpdate = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must be less than 200 characters'),
];

const validateVehicleUpdate = [
  body('batteryCapacity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Battery capacity must be a positive number'),
  body('range')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Range must be a positive number'),
  body('chargingType')
    .optional()
    .isIn(['slow', 'fast', 'super_fast'])
    .withMessage('Charging type must be slow, fast, or super_fast'),
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

/**
 * @route   POST /api/drivers/register
 * @desc    Register new driver
 * @access  Public
 */
router.post('/register',
  registrationLimiter,
  validateDriverRegistration,
  handleValidationErrors,
  registerDriver
);

/**
 * @route   POST /api/drivers/login
 * @desc    Driver login
 * @access  Public
 */
router.post('/login',
  driverLimiter,
  validateDriverLogin,
  handleValidationErrors,
  loginDriver
);

// Apply authentication to all routes below
router.use(authenticateToken);
router.use(driverLimiter);

/**
 * @route   GET /api/drivers/profile
 * @desc    Get driver profile
 * @access  Private
 */
router.get('/profile', getDriverProfile);

/**
 * @route   PUT /api/drivers/profile
 * @desc    Update driver profile
 * @access  Private
 */
router.put('/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('workingHours.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('workingHours.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  ],
  handleValidationErrors,
  updateDriverProfile
);

/**
 * @route   PUT /api/drivers/location
 * @desc    Update driver location
 * @access  Private
 */
router.put('/location',
  validateLocationUpdate,
  handleValidationErrors,
  updateDriverLocation
);

/**
 * @route   PUT /api/drivers/availability
 * @desc    Toggle driver availability
 * @access  Private
 */
router.put('/availability',
  [
    body('isOnline').isBoolean().withMessage('isOnline must be a boolean'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  ],
  handleValidationErrors,
  toggleDriverAvailability
);

/**
 * @route   PUT /api/drivers/vehicle
 * @desc    Update vehicle information
 * @access  Private
 */
router.put('/vehicle',
  validateVehicleUpdate,
  handleValidationErrors,
  updateDriverVehicle
);

/**
 * @route   POST /api/drivers/documents
 * @desc    Upload driver documents
 * @access  Private
 */
router.post('/documents', uploadDriverDocuments);

/**
 * @route   GET /api/drivers/stats
 * @desc    Get driver statistics
 * @access  Private
 */
router.get('/stats', getDriverStats);

/**
 * @route   GET /api/drivers/earnings
 * @desc    Get driver earnings
 * @access  Private
 */
router.get('/earnings',
  [
    query('period').optional().isIn(['today', 'week', 'month', 'all']),
  ],
  handleValidationErrors,
  getDriverEarnings
);

/**
 * @route   GET /api/drivers/rides/nearby
 * @desc    Get nearby ride requests
 * @access  Private
 */
router.get('/rides/nearby',
  [
    query('radius').optional().isFloat({ min: 1, max: 50 }),
  ],
  handleValidationErrors,
  getNearbyRides
);

/**
 * @route   POST /api/drivers/rides/:rideId/accept
 * @desc    Accept a ride request
 * @access  Private
 */
router.post('/rides/:rideId/accept',
  [
    param('rideId').matches(/^ECO[A-Z0-9]+$/).withMessage('Invalid ride ID format'),
  ],
  handleValidationErrors,
  acceptRide
);

/**
 * @route   POST /api/drivers/rides/:rideId/start
 * @desc    Start a ride
 * @access  Private
 */
router.post('/rides/:rideId/start',
  [
    param('rideId').matches(/^ECO[A-Z0-9]+$/).withMessage('Invalid ride ID format'),
  ],
  handleValidationErrors,
  startRide
);

/**
 * @route   POST /api/drivers/rides/:rideId/complete
 * @desc    Complete a ride
 * @access  Private
 */
router.post('/rides/:rideId/complete',
  [
    param('rideId').matches(/^ECO[A-Z0-9]+$/).withMessage('Invalid ride ID format'),
    body('actualDistance').optional().isFloat({ min: 0.1, max: 1000 }),
    body('actualDuration').optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  completeRide
);

/**
 * @route   GET /api/drivers/rides/history
 * @desc    Get driver ride history
 * @access  Private
 */
router.get('/rides/history',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['completed', 'cancelled', 'all']),
  ],
  handleValidationErrors,
  getDriverRideHistory
);

/**
 * @route   GET /api/drivers/health
 * @desc    Health check for drivers service
 * @access  Private
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Drivers service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;