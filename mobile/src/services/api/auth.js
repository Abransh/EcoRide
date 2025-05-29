import { apiHelpers, API_ENDPOINTS } from './client';

/**
 * Authentication API service
 * Handles all authentication-related API calls
 */
export const authAPI = {
  /**
   * Send OTP to phone number
   * @param {string} phone - Phone number (10 digits)
   * @returns {Promise} API response
   */
  sendOTP: async (phone) => {
    try {
      console.log('📱 Sending OTP to:', phone);
      
      const response = await apiHelpers.post(API_ENDPOINTS.AUTH.SEND_OTP, {
        phone: phone.toString(),
      });
      
      console.log('✅ OTP sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Send OTP failed:', error.message);
      throw error;
    }
  },

  /**
   * Verify OTP and authenticate user
   * @param {string} phone - Phone number
   * @param {string} otp - 6-digit OTP
   * @param {string} name - User name (for new users)
   * @param {string} email - User email (optional)
   * @returns {Promise} API response with user data and tokens
   */
  verifyOTP: async (phone, otp, name, email) => {
    try {
      console.log('🔐 Verifying OTP for:', phone);
      
      const requestData = {
        phone: phone.toString(),
        otp: otp.toString(),
      };
      
      // Add name and email if provided
      if (name) requestData.name = name.trim();
      if (email) requestData.email = email.trim();
      
      const response = await apiHelpers.post(API_ENDPOINTS.AUTH.VERIFY_OTP, requestData);
      
      console.log('✅ OTP verified successfully');
      return response;
    } catch (error) {
      console.error('❌ OTP verification failed:', error.message);
      throw error;
    }
  },

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise} API response with new tokens
   */
  refreshToken: async (refreshToken) => {
    try {
      console.log('🔄 Refreshing access token');
      
      const response = await apiHelpers.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        refreshToken,
      });
      
      console.log('✅ Token refreshed successfully');
      return response;
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      throw error;
    }
  },

  /**
   * Logout user
   * @returns {Promise} API response
   */
  logout: async () => {
    try {
      console.log('👋 Logging out user');
      
      const response = await apiHelpers.post(API_ENDPOINTS.AUTH.LOGOUT);
      
      console.log('✅ Logout successful');
      return response;
    } catch (error) {
      console.error('❌ Logout failed:', error.message);
      throw error;
    }
  },

  /**
   * Get current user profile
   * @returns {Promise} API response with user data
   */
  getCurrentUser: async () => {
    try {
      console.log('👤 Getting current user profile');
      
      const response = await apiHelpers.get(API_ENDPOINTS.AUTH.ME);
      
      console.log('✅ User profile retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ Get current user failed:', error.message);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @param {string} profileData.name - User name
   * @param {string} profileData.email - User email
   * @param {string} profileData.language - User language preference
   * @returns {Promise} API response with updated user data
   */
  updateProfile: async (profileData) => {
    try {
      console.log('📝 Updating user profile');
      
      // Clean up data
      const cleanData = {};
      if (profileData.name) cleanData.name = profileData.name.trim();
      if (profileData.email) cleanData.email = profileData.email.trim();
      if (profileData.language) cleanData.language = profileData.language;
      
      const response = await apiHelpers.put(API_ENDPOINTS.AUTH.UPDATE_PROFILE, cleanData);
      
      console.log('✅ Profile updated successfully');
      return response;
    } catch (error) {
      console.error('❌ Profile update failed:', error.message);
      throw error;
    }
  },

  /**
   * Delete user account
   * @returns {Promise} API response
   */
  deleteAccount: async () => {
    try {
      console.log('🗑 Deleting user account');
      
      const response = await apiHelpers.delete(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, {
        data: {
          confirmation: 'DELETE_ACCOUNT',
        },
      });
      
      console.log('✅ Account deleted successfully');
      return response;
    } catch (error) {
      console.error('❌ Account deletion failed:', error.message);
      throw error;
    }
  },

  /**
   * Check if phone number is registered
   * @param {string} phone - Phone number to check
   * @returns {Promise<boolean>} True if phone is registered
   */
  checkPhoneRegistration: async (phone) => {
    try {
      console.log('🔍 Checking phone registration:', phone);
      
      // This might be a separate endpoint or part of send OTP response
      const response = await apiHelpers.post('/auth/check-phone', {
        phone: phone.toString(),
      });
      
      return response.data?.isRegistered || false;
    } catch (error) {
      console.error('❌ Phone check failed:', error.message);
      return false;
    }
  },

  /**
   * Resend OTP
   * @param {string} phone - Phone number
   * @returns {Promise} API response
   */
  resendOTP: async (phone) => {
    try {
      console.log('🔄 Resending OTP to:', phone);
      
      // Same as sendOTP but with different logging
      const response = await apiHelpers.post(API_ENDPOINTS.AUTH.SEND_OTP, {
        phone: phone.toString(),
      });
      
      console.log('✅ OTP resent successfully');
      return response;
    } catch (error) {
      console.error('❌ OTP resend failed:', error.message);
      throw error;
    }
  },
};

/**
 * Auth validation helpers
 */
export const authValidation = {
  /**
   * Validate Indian phone number
   * @param {string} phone - Phone number to validate
   * @returns {Object} Validation result
   */
  validatePhone: (phone) => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      return {
        isValid: false,
        error: 'Please enter a valid 10-digit Indian mobile number',
      };
    }
    
    return {
      isValid: true,
      phone: cleanPhone,
    };
  },

  /**
   * Validate OTP
   * @param {string} otp - OTP to validate
   * @returns {Object} Validation result
   */
  validateOTP: (otp) => {
    const cleanOTP = otp.replace(/\s/g, '');
    const otpRegex = /^\d{6}$/;
    
    if (!otpRegex.test(cleanOTP)) {
      return {
        isValid: false,
        error: 'Please enter a valid 6-digit OTP',
      };
    }
    
    return {
      isValid: true,
      otp: cleanOTP,
    };
  },

  /**
   * Validate email
   * @param {string} email - Email to validate
   * @returns {Object} Validation result
   */
  validateEmail: (email) => {
    if (!email) {
      return { isValid: true }; // Email is optional
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address',
      };
    }
    
    return {
      isValid: true,
      email: email.trim().toLowerCase(),
    };
  },

  /**
   * Validate name
   * @param {string} name - Name to validate
   * @returns {Object} Validation result
   */
  validateName: (name) => {
    if (!name || name.trim().length < 2) {
      return {
        isValid: false,
        error: 'Name must be at least 2 characters long',
      };
    }
    
    if (name.trim().length > 50) {
      return {
        isValid: false,
        error: 'Name must be less than 50 characters',
      };
    }
    
    // Check for special characters (allow letters, spaces, and common name characters)
    const nameRegex = /^[a-zA-Z\s\.''-]+$/;
    if (!nameRegex.test(name)) {
      return {
        isValid: false,
        error: 'Name can only contain letters, spaces, and common punctuation',
      };
    }
    
    return {
      isValid: true,
      name: name.trim(),
    };
  },
};

export default authAPI;