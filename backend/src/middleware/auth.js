const { verifyAccessToken } = require('../utils/jwtHelpers');
const User = require('../models/user');

/**
 * Authenticate JWT token middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
    
    // Extract token from "Bearer TOKEN"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Check if user exists and is active
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }
    
    // Add user info to request
    req.user = {
      id: user._id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      isPhoneVerified: user.isPhoneVerified,
      subscription: user.subscription
    };
    
    next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is valid, but doesn't block if token is missing/invalid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return next();
    }
    
    const decoded = verifyAccessToken(token);
    
    if (decoded) {
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          id: user._id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          isPhoneVerified: user.isPhoneVerified,
          subscription: user.subscription
        };
      }
    }
    
    next();
    
  } catch (error) {
    // In optional auth, we don't throw errors
    console.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Check if user is phone verified
 */
const requirePhoneVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (!req.user.isPhoneVerified) {
    return res.status(403).json({
      success: false,
      error: 'Phone verification required'
    });
  }
  
  next();
};

/**
 * Check if user has active subscription
 */
const requireActiveSubscription = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const subscription = req.user.subscription;
  
  if (!subscription || 
      subscription.status !== 'active' || 
      new Date() > subscription.expiresAt) {
    return res.status(403).json({
      success: false,
      error: 'Active subscription required'
    });
  }
  
  next();
};

/**
 * Check if user has specific permissions/role
 * @param {Array} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      // Get full user data to check role
      const user = await User.findById(req.user.id);
      
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Role check middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

/**
 * Rate limiting for authenticated users
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const authenticatedRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const userId = req.user.id.toString();
    const now = Date.now();
    const userRequestData = userRequests.get(userId) || { count: 0, resetTime: now + windowMs };
    
    // Reset counter if window has passed
    if (now > userRequestData.resetTime) {
      userRequestData.count = 0;
      userRequestData.resetTime = now + windowMs;
    }
    
    // Check if user has exceeded limit
    if (userRequestData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userRequestData.resetTime - now) / 1000)
      });
    }
    
    // Increment counter
    userRequestData.count++;
    userRequests.set(userId, userRequestData);
    
    next();
  };
};

/**
 * Validate user owns resource
 * Checks if the authenticated user owns the resource being accessed
 * @param {string} userField - Field name in the resource that contains user ID
 */
const validateResourceOwnership = (userField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check resource ownership in params, body, or query
    const resourceUserId = req.params[userField] || 
                          req.body[userField] || 
                          req.query[userField];
    
    if (resourceUserId && resourceUserId !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.'
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requirePhoneVerification,
  requireActiveSubscription,
  requireRole,
  authenticatedRateLimit,
  validateResourceOwnership
};