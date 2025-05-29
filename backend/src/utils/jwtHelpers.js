const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '15m';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your_refresh_secret_key_change_in_production';
const REFRESH_EXPIRE = process.env.REFRESH_EXPIRE || '7d';

/**
 * Generate access and refresh tokens
 * @param {string} userId - User ID
 * @returns {Object} - Access and refresh tokens
 */
const generateTokens = (userId) => {
  try {
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { 
        userId: userId.toString(),
        type: 'access'
      },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRE,
        issuer: 'eco-ride-api',
        audience: 'eco-ride-app'
      }
    );
    
    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { 
        userId: userId.toString(),
        type: 'refresh'
      },
      REFRESH_SECRET,
      { 
        expiresIn: REFRESH_EXPIRE,
        issuer: 'eco-ride-api',
        audience: 'eco-ride-app'
      }
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRE
    };
    
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate tokens');
  }
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object|null} - Decoded token data or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'eco-ride-api',
      audience: 'eco-ride-app'
    });
    
    // Check token type
    if (decoded.type !== 'access') {
      return null;
    }
    
    return decoded;
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid access token');
    } else {
      console.error('Access token verification error:', error);
    }
    return null;
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object|null} - Decoded token data or null if invalid
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: 'eco-ride-api',
      audience: 'eco-ride-app'
    });
    
    // Check token type
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return decoded;
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid refresh token');
    } else {
      console.error('Refresh token verification error:', error);
    }
    return null;
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token data or null
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
    
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiration date or null
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
    
  } catch (error) {
    return null;
  }
};

/**
 * Create password reset token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} - Reset token
 */
const generatePasswordResetToken = (userId, email) => {
  try {
    return jwt.sign(
      { 
        userId: userId.toString(),
        email,
        type: 'password_reset'
      },
      JWT_SECRET,
      { 
        expiresIn: '1h',
        issuer: 'eco-ride-api',
        audience: 'eco-ride-app'
      }
    );
  } catch (error) {
    console.error('Password reset token generation error:', error);
    throw new Error('Failed to generate password reset token');
  }
};

/**
 * Verify password reset token
 * @param {string} token - Reset token
 * @returns {Object|null} - Decoded token data or null
 */
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'eco-ride-api',
      audience: 'eco-ride-app'
    });
    
    if (decoded.type !== 'password_reset') {
      return null;
    }
    
    return decoded;
    
  } catch (error) {
    console.error('Password reset token verification error:', error);
    return null;
  }
};

/**
 * Create email verification token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} - Verification token
 */
const generateEmailVerificationToken = (userId, email) => {
  try {
    return jwt.sign(
      { 
        userId: userId.toString(),
        email,
        type: 'email_verification'
      },
      JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'eco-ride-api',
        audience: 'eco-ride-app'
      }
    );
  } catch (error) {
    console.error('Email verification token generation error:', error);
    throw new Error('Failed to generate email verification token');
  }
};

/**
 * Verify email verification token
 * @param {string} token - Verification token
 * @returns {Object|null} - Decoded token data or null
 */
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'eco-ride-api',
      audience: 'eco-ride-app'
    });
    
    if (decoded.type !== 'email_verification') {
      return null;
    }
    
    return decoded;
    
  } catch (error) {
    console.error('Email verification token verification error:', error);
    return null;
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken
};