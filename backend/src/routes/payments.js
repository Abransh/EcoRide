// Path: /backend/src/routes/payments.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requirePhoneVerification } = require('../middleware/auth');
const {
  processRidePayment,
  processSubscriptionPayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  processRefund,
  getPaymentDetails
} = require('../controllers/paymentController');

const router = express.Router();

// Rate limiting for payment operations
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each user to 20 payment requests per windowMs
  message: {
    success: false,
    error: 'Too many payment requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validatePaymentProcessing = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR'])
    .withMessage('Currency must be INR'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required'),
  body('description')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description must be between 1 and 200 characters'),
];

const validatePaymentVerification = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
];

const validateAddPaymentMethod = [
  body('type')
    .isIn(['card', 'upi', 'wallet', 'netbanking'])
    .withMessage('Payment method type must be card, upi, wallet, or netbanking'),
  body('details')
    .isObject()
    .withMessage('Payment method details are required'),
];

const validateRefundRequest = [
  body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required'),
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Refund amount must be a positive number'),
  body('reason')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Reason must be between 1 and 200 characters'),
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

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePhoneVerification);

/**
 * @route   POST /api/payments/process/ride
 * @desc    Process payment for a ride
 * @access  Private
 */
router.post('/process/ride',
  paymentLimiter,
  [
    body('rideId').notEmpty().withMessage('Ride ID is required'),
    ...validatePaymentProcessing
  ],
  handleValidationErrors,
  processRidePayment
);

/**
 * @route   POST /api/payments/process/subscription
 * @desc    Process payment for subscription
 * @access  Private
 */
router.post('/process/subscription',
  paymentLimiter,
  [
    body('planId').notEmpty().withMessage('Plan ID is required'),
    body('durationType').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid duration type'),
    ...validatePaymentProcessing
  ],
  handleValidationErrors,
  processSubscriptionPayment
);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment after processing
 * @access  Private
 */
router.post('/verify',
  paymentLimiter,
  validatePaymentVerification,
  handleValidationErrors,
  verifyPayment
);

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history
 * @access  Private
 */
router.get('/history',
  validatePagination,
  handleValidationErrors,
  getPaymentHistory
);

/**
 * @route   GET /api/payments/methods
 * @desc    Get user's payment methods
 * @access  Private
 */
router.get('/methods', getPaymentMethods);

/**
 * @route   POST /api/payments/methods
 * @desc    Add new payment method
 * @access  Private
 */
router.post('/methods',
  validateAddPaymentMethod,
  handleValidationErrors,
  addPaymentMethod
);

/**
 * @route   DELETE /api/payments/methods/:methodId
 * @desc    Remove payment method
 * @access  Private
 */
router.delete('/methods/:methodId',
  param('methodId').isMongoId().withMessage('Invalid payment method ID'),
  handleValidationErrors,
  removePaymentMethod
);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Get payment details
 * @access  Private
 */
router.get('/:paymentId',
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  handleValidationErrors,
  getPaymentDetails
);

/**
 * @route   POST /api/payments/refund
 * @desc    Process refund
 * @access  Private
 */
router.post('/refund',
  paymentLimiter,
  validateRefundRequest,
  handleValidationErrors,
  processRefund
);

/**
 * @route   GET /api/payments/health
 * @desc    Health check for payments service
 * @access  Private
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payments service is healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Ride payments',
      'Subscription payments',
      'Payment verification',
      'Refund processing',
      'Payment methods management'
    ]
  });
});

module.exports = router;