const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const { sendOTP, verifyOTP } = require('../services/smsService');
const { generateTokens, verifyRefreshToken } = require('../utils/jwtHelpers');

// In-memory store for OTPs (In production, use Redis)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiration
const storeOTP = (phone, otp) => {
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
  otpStore.set(phone, { otp, expiresAt, attempts: 0 });
};

// Verify stored OTP
const verifyStoredOTP = (phone, providedOTP) => {
  const stored = otpStore.get(phone);
  if (!stored) return { valid: false, error: 'OTP expired or not found' };
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, error: 'OTP expired' };
  }
  
  if (stored.attempts >= 3) {
    otpStore.delete(phone);
    return { valid: false, error: 'Too many attempts' };
  }
  
  if (stored.otp !== providedOTP) {
    stored.attempts++;
    return { valid: false, error: 'Invalid OTP' };
  }
  
  otpStore.delete(phone);
  return { valid: true };
};

/**
 * @desc    Send OTP for phone verification
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
const sendOTPController = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Validate phone number
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid 10-digit Indian mobile number'
      });
    }
    
    // Check rate limiting (prevent spam)
    const lastOTP = otpStore.get(phone);
    if (lastOTP && (Date.now() - (lastOTP.expiresAt - 5 * 60 * 1000)) < 60 * 1000) {
      return res.status(429).json({
        success: false,
        error: 'Please wait 1 minute before requesting another OTP'
      });
    }
    
    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(phone, otp);
    
    // Send OTP via SMS
    const smsResult = await sendOTP(phone, otp);
    
    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again.'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ phone });
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        isExistingUser: !!existingUser,
        expiresIn: 300 // 5 minutes
      }
    });
    
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Verify OTP and login/register user
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOTPController = async (req, res) => {
  try {
    const { phone, otp, name, email } = req.body;
    
    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }
    
    // Verify OTP
    const otpVerification = verifyStoredOTP(phone, otp);
    if (!otpVerification.valid) {
      return res.status(400).json({
        success: false,
        error: otpVerification.error
      });
    }
    
    // Find or create user
    let user = await User.findOne({ phone });
    let isNewUser = false;
    
    if (!user) {
      // Create new user
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required for new users'
        });
      }
      
      user = new User({
        phone,
        name: name.trim(),
        email: email?.trim(),
        isPhoneVerified: true
      });
      
      await user.save();
      isNewUser = true;
    } else {
      // Update existing user
      user.isPhoneVerified = true;
      user.lastLogin = new Date();
      if (email && !user.email) {
        user.email = email.trim();
      }
      await user.save();
    }
    
    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Remove sensitive data
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      data: {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        },
        isNewUser
      }
    });
    
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
    
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutController = async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just return success
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
    
  } catch (error) {
    console.error('Get Current User Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, language } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update fields
    if (name) user.name = name.trim();
    if (email) user.email = email.trim();
    if (language) user.language = language;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });
    
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/auth/account
 * @access  Private
 */
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Soft delete - mark as inactive
    user.isActive = false;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  sendOTPController,
  verifyOTPController,
  refreshTokenController,
  logoutController,
  getCurrentUser,
  updateProfile,
  deleteAccount
};