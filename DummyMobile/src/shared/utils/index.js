/**
 * Shared Utility Functions
 * Purpose: Common utility functions used across the app
 * Contains: Formatting, validation, calculations, and helper functions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Format distance
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

/**
 * Format duration
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'time')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  const dateObj = new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    default:
      return dateObj.toLocaleDateString();
  }
};

/**
 * Calculate carbon savings
 * @param {number} distance - Distance in kilometers
 * @param {string} vehicleType - Type of vehicle ('car', 'suv', 'bike')
 * @returns {number} Carbon saved in kg CO2
 */
export const calculateCarbonSavings = (distance, vehicleType = 'car') => {
  const emissionFactors = {
    car: 0.4, // kg CO2 per km
    suv: 0.6,
    bike: 0.0,
  };
  
  const ecoRideEmission = 0.15; // kg CO2 per km for eco vehicles
  const standardEmission = emissionFactors[vehicleType] || emissionFactors.car;
  
  return Math.round((standardEmission - ecoRideEmission) * distance * 100) / 100;
};

/**
 * Calculate estimated fare
 * @param {number} distance - Distance in kilometers
 * @param {number} duration - Duration in minutes
 * @param {string} rideType - Type of ride ('standard', 'premium', 'eco')
 * @returns {number} Estimated fare
 */
export const calculateFare = (distance, duration = 0, rideType = 'standard') => {
  const baseFare = 5.00;
  const ratePerKm = {
    standard: 2.50,
    premium: 3.50,
    eco: 2.00, // Discounted eco-friendly rate
  };
  
  const rate = ratePerKm[rideType] || ratePerKm.standard;
  const fare = baseFare + (distance * rate);
  
  return Math.round(fare * 100) / 100;
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone number
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Generate random ID
 * @param {number} length - Length of ID (default: 8)
 * @returns {string} Random ID string
 */
export const generateRandomId = (length = 8) => {
  return Math.random().toString(36).substr(2, length);
};

/**
 * Calculate distance between two coordinates
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * 
    Math.cos(coord2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
};

/**
 * Storage utilities
 */
export const Storage = {
  /**
   * Save data to AsyncStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  async set(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  },

  /**
   * Get data from AsyncStorage
   * @param {string} key - Storage key
   * @returns {any} Stored value
   */
  async get(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  /**
   * Remove data from AsyncStorage
   * @param {string} key - Storage key
   */
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  },

  /**
   * Clear all data from AsyncStorage
   */
  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  },
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export default {
  formatCurrency,
  formatDistance,
  formatDuration,
  formatDate,
  calculateCarbonSavings,
  calculateFare,
  validateEmail,
  validatePhone,
  generateRandomId,
  calculateDistance,
  Storage,
  debounce,
  throttle,
};
