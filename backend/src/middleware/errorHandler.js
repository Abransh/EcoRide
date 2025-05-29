/**
 * Global error handling middleware for Express
 * This should be the last middleware in the app
 */

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
  
    // Log error for debugging
    console.error('Error Handler:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
      const message = 'Resource not found';
      error = {
        statusCode: 404,
        message,
        error: 'Not Found'
      };
    }
  
    // Mongoose duplicate key error
    if (err.code === 11000) {
      let message = 'Duplicate field value entered';
      
      // Extract field name from error
      const field = Object.keys(err.keyValue)[0];
      if (field === 'phone') {
        message = 'Phone number is already registered';
      } else if (field === 'email') {
        message = 'Email is already registered';
      } else if (field === 'referralCode') {
        message = 'Referral code already exists';
      }
      
      error = {
        statusCode: 400,
        message,
        error: 'Bad Request'
      };
    }
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(val => ({
        field: val.path,
        message: val.message
      }));
      
      error = {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: errors
      };
    }
  
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      error = {
        statusCode: 401,
        message: 'Invalid token',
        error: 'Unauthorized'
      };
    }
  
    if (err.name === 'TokenExpiredError') {
      error = {
        statusCode: 401,
        message: 'Token expired',
        error: 'Unauthorized'
      };
    }
  
    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = {
        statusCode: 400,
        message: 'File too large',
        error: 'Bad Request'
      };
    }
  
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = {
        statusCode: 400,
        message: 'Unexpected file field',
        error: 'Bad Request'
      };
    }
  
    // Razorpay errors
    if (err.source === 'razorpay') {
      error = {
        statusCode: 400,
        message: err.description || 'Payment processing failed',
        error: 'Payment Error'
      };
    }
  
    // Twilio errors
    if (err.code && err.code.toString().startsWith('2')) {
      error = {
        statusCode: 400,
        message: 'SMS service error',
        error: 'SMS Error'
      };
    }
  
    // Rate limiting errors
    if (err.statusCode === 429) {
      error = {
        statusCode: 429,
        message: 'Too many requests, please try again later',
        error: 'Too Many Requests'
      };
    }
  
    // Default error response
    const statusCode = error.statusCode || err.statusCode || 500;
    const message = error.message || 'Internal Server Error';
  
    // Error response format
    const errorResponse = {
      success: false,
      error: error.error || 'Internal Server Error',
      message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        originalError: err
      })
    };
  
    // Send response
    res.status(statusCode).json(errorResponse);
  };
  
  /**
   * Handle async errors
   * Wrapper function to catch async errors and pass them to error handler
   */
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  
  /**
   * Handle 404 errors
   * Middleware for handling routes that don't exist
   */
  const notFound = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
  };
  
  /**
   * Custom error class for application-specific errors
   */
  class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Create specific error types
   */
  class ValidationError extends AppError {
    constructor(message, details = []) {
      super(message, 400);
      this.details = details;
    }
  }
  
  class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
      super(message, 401);
    }
  }
  
  class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
      super(message, 403);
    }
  }
  
  class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
      super(message, 404);
    }
  }
  
  class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
      super(message, 409);
    }
  }
  
  class PaymentError extends AppError {
    constructor(message = 'Payment processing failed') {
      super(message, 400);
      this.source = 'payment';
    }
  }
  
  class SMSError extends AppError {
    constructor(message = 'SMS service failed') {
      super(message, 400);
      this.source = 'sms';
    }
  }
  
  /**
   * Error logger
   * Log errors to external service (in production)
   */
  const logError = (error, req = null) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...(req && {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      })
    };
  
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      // sentry.captureException(error, { contexts: { request: errorInfo } });
    }
  
    console.error('Application Error:', errorInfo);
  };
  
  module.exports = {
    errorHandler,
    asyncHandler,
    notFound,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    PaymentError,
    SMSError,
    logError
  };