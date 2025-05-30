// Path: /backend/src/routes/users.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requirePhoneVerification } = require('../middleware/auth');
const {
  getUserProfile,
  updateUserProfile,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getUserAddresses,
  addPaymentMethod,
  getUserPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
  getUserRideHistory,
  getUserEcoStats,
  updateUserPreferences,
  addReferral,
  getReferralStats,
  uploadProfilePicture,
  deleteUser,
  getUserNotifications,
  markNotificationAsRead
} = require('../controllers/userController');

const router = express.Router();

// Rate limiting
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this user, please try again later.'
  }
});

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePhoneVerification);
router.use(userLimiter);

// Validation middleware
const validateUserProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('language')
    .optional()
    .isIn(['en', 'hi'])
    .withMessage('Language must be either "en" or "hi"'),
];

const validateAddress = [
  body('type')
    .isIn(['home', 'work', 'other'])
    .withMessage('Address type must be home, work, or other'),
  body('label')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Label must be between 1 and 50 characters'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
];

const validatePaymentMethod = [
  body('type')
    .isIn(['card', 'upi', 'wallet'])
    .withMessage('Payment method type must be card, upi, or wallet'),
  body('details')
    .isObject()
    .withMessage('Payment details are required'),
];

const validateReferral = [
  body('referralCode')
    .isLength({ min: 6, max: 20 })
    .withMessage('Invalid referral code format'),
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
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
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  validateUserProfile,
  handleValidationErrors,
  updateUserProfile
);

/**
 * @route   POST /api/users/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/profile/picture', uploadProfilePicture);

/**
 * @route   GET /api/users/addresses
 * @desc    Get user addresses
 * @access  Private
 */
router.get('/addresses', getUserAddresses);

/**
 * @route   POST /api/users/addresses
 * @desc    Add new address
 * @access  Private
 */
router.post('/addresses',
  validateAddress,
  handleValidationErrors,
  addUserAddress
);

/**
 * @route   PUT /api/users/addresses/:addressId
 * @desc    Update address
 * @access  Private
 */
router.put('/addresses/:addressId', // Make sure parameter name is complete
  [
    param('addressId').isMongoId().withMessage('Invalid address ID'),
    ...validateAddress
  ],
  handleValidationErrors,
  updateUserAddress
);

/**
 * @route   DELETE /api/users/addresses/:addressId
 * @desc    Delete address
 * @access  Private
 */
router.delete('/addresses/:addressId',
  param('addressId').isMongoId().withMessage('Invalid address ID'),
  handleValidationErrors,
  deleteUserAddress
);

/**
 * @route   GET /api/users/payment-methods
 * @desc    Get user payment methods
 * @access  Private
 */
router.get('/payment-methods', getUserPaymentMethods);

/**
 * @route   POST /api/users/payment-methods
 * @desc    Add payment method
 * @access  Private
 */
router.post('/payment-methods',
  validatePaymentMethod,
  handleValidationErrors,
  addPaymentMethod
);

/**
 * @route   PUT /api/users/payment-methods/:methodId
 * @desc    Update payment method
 * @access  Private
 */
router.put('/payment-methods/:methodId',
  [
    param('methodId').isMongoId().withMessage('Invalid payment method ID'),
    body('isDefault').optional().isBoolean()
  ],
  handleValidationErrors,
  updatePaymentMethod
);

/**
 * @route   DELETE /api/users/payment-methods/:methodId
 * @desc    Delete payment method
 * @access  Private
 */
router.delete('/payment-methods/:methodId',
  param('methodId').isMongoId().withMessage('Invalid payment method ID'),
  handleValidationErrors,
  deletePaymentMethod
);

/**
 * @route   GET /api/users/ride-history
 * @desc    Get user ride history
 * @access  Private
 */
router.get('/ride-history',
  validatePagination,
  handleValidationErrors,
  getUserRideHistory
);

/**
 * @route   GET /api/users/eco-stats
 * @desc    Get user eco statistics
 * @access  Private
 */
router.get('/eco-stats', getUserEcoStats);

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences',
  [
    body('notifications').optional().isObject(),
    body('theme').optional().isIn(['light', 'dark', 'auto']),
    body('language').optional().isIn(['en', 'hi'])
  ],
  handleValidationErrors,
  updateUserPreferences
);

/**
 * @route   POST /api/users/referral
 * @desc    Add referral code
 * @access  Private
 */
router.post('/referral',
  validateReferral,
  handleValidationErrors,
  addReferral
);

/**
 * @route   GET /api/users/referral/stats
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/referral/stats', getReferralStats);

/**
 * @route   GET /api/users/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/notifications',
  validatePagination,
  handleValidationErrors,
  getUserNotifications
);

/**
 * @route   PUT /api/users/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:notificationId/read',
  param('notificationId').isMongoId().withMessage('Invalid notification ID'),
  handleValidationErrors,
  markNotificationAsRead
);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/account',
  [
    body('confirmation')
      .equals('DELETE_ACCOUNT')
      .withMessage('Please provide correct confirmation text'),
    body('reason')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Reason must be between 1 and 200 characters')
  ],
  handleValidationErrors,
  deleteUser
);

/**
 * @route   GET /api/users/health
 * @desc    Health check for users service
 * @access  Private
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Users service is healthy',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user.id,
      phone: req.user.phone
    }
  });
});

module.exports = router;