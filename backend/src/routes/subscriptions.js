const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requirePhoneVerification } = require('../middleware/auth');
const {
  getSubscriptionPlans,
  getCurrentSubscription,
  subscribeToPlan,
  cancelUserSubscription,
  getSubscriptionHistory,
  getSubscriptionUsage,
  renewSubscription
} = require('../controllers/subscriptionController');

const router = express.Router();

// Rate limiting for subscription operations
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each user to 10 subscription requests per windowMs
  message: {
    success: false,
    error: 'Too many subscription requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateSubscribeToPlan = [
  body('planId')
    .notEmpty()
    .withMessage('Plan ID is required')
    .matches(/^[A-Z]+_\d+_\d+$/)
    .withMessage('Invalid plan ID format'),
  body('durationType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Duration type must be daily, weekly, or monthly'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid payment method ID'),
];

const validateCancelSubscription = [
  body('reason')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Cancellation reason must be between 1 and 200 characters'),
  body('immediateCancel')
    .optional()
    .isBoolean()
    .withMessage('Immediate cancel must be a boolean value'),
];

const validateRenewSubscription = [
  body('durationType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Duration type must be daily, weekly, or monthly'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid payment method ID'),
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

const validateVehicleType = [
  query('vehicleType')
    .optional()
    .isIn(['bike', 'car'])
    .withMessage('Vehicle type must be either bike or car'),
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

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePhoneVerification);

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get all active subscription plans
 * @access  Private
 * @query   ?vehicleType=bike|car (optional)
 */
router.get('/plans',
  validateVehicleType,
  handleValidationErrors,
  getSubscriptionPlans
);

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get user's current subscription
 * @access  Private
 */
router.get('/current',
  getCurrentSubscription
);

/**
 * @route   GET /api/subscriptions/usage
 * @desc    Get subscription usage statistics
 * @access  Private
 */
router.get('/usage',
  getSubscriptionUsage
);

/**
 * @route   GET /api/subscriptions/history
 * @desc    Get subscription history
 * @access  Private
 * @query   ?page=1&limit=10 (optional)
 */
router.get('/history',
  validatePagination,
  handleValidationErrors,
  getSubscriptionHistory
);

/**
 * @route   POST /api/subscriptions/subscribe
 * @desc    Subscribe to a plan
 * @access  Private
 */
router.post('/subscribe',
  subscriptionLimiter,
  validateSubscribeToPlan,
  handleValidationErrors,
  subscribeToPlan
);

/**
 * @route   POST /api/subscriptions/renew
 * @desc    Renew subscription
 * @access  Private
 */
router.post('/renew',
  subscriptionLimiter,
  validateRenewSubscription,
  handleValidationErrors,
  renewSubscription
);

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/cancel',
  validateCancelSubscription,
  handleValidationErrors,
  cancelUserSubscription
);

/**
 * @route   GET /api/subscriptions/health
 * @desc    Health check for subscriptions service
 * @access  Private
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Subscriptions service is healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Plan management',
      'Subscription lifecycle',
      'Usage tracking',
      'Payment integration',
      'Auto-renewal'
    ]
  });
});

module.exports = router;