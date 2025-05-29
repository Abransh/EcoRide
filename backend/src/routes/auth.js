const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const {
  sendOTPController,
  verifyOTPController,
  refreshTokenController,
  logoutController,
  getCurrentUser,
  updateProfile,
  deleteAccount
} = require('../controllers/authController');

const router = express.Router();

// Rate limiting for OTP requests
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 OTP requests per windowMs
  message: {
    success: false,
    error: 'Too many OTP requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for authentication attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateSendOTP = [
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be 10 digits')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Phone number must start with 6, 7, 8, or 9'),
];

const validateVerifyOTP = [
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
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
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to user's phone
 * @access  Public
 */
router.post('/send-otp', 
  otpLimiter,
  validateSendOTP,
  handleValidationErrors,
  sendOTPController
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login/register user
 * @access  Public
 */
router.post('/verify-otp',
  authLimiter,
  validateVerifyOTP,
  handleValidationErrors,
  verifyOTPController
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token',
  authLimiter,
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  handleValidationErrors,
  refreshTokenController
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  logoutController
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  getCurrentUser
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  validateUpdateProfile,
  handleValidationErrors,
  updateProfile
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/account',
  authenticateToken,
  [
    body('confirmation')
      .equals('DELETE_ACCOUNT')
      .withMessage('Please provide correct confirmation text')
  ],
  handleValidationErrors,
  deleteAccount
);

/**
 * @route   GET /api/auth/health
 * @desc    Health check for auth service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;