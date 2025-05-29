import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../../store';
import { refreshAccessToken, resetAuth } from '../../store/slices/authSlice';

// API Configuration
const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://10.0.2.2:3000/api'  // Android emulator
    : 'https://your-production-api.com/api',
  TIMEOUT: 30000, // 30 seconds
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get token from AsyncStorage or Redux store
      const token = await AsyncStorage.getItem('accessToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add request timestamp for debugging
      config.metadata = { startTime: new Date() };
      
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors
apiClient.interceptors.response.use(
  async (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata?.startTime;
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Calculate request duration
    const duration = new Date() - originalRequest?.metadata?.startTime;
    console.log(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} (${duration}ms)`);
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      console.error(`API Error ${status}:`, data);
      
      // Handle 401 Unauthorized - Token expired or invalid
      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Try to refresh the token
          const state = store.getState();
          const refreshToken = state.auth.refreshToken;
          
          if (refreshToken) {
            // Dispatch refresh token action
            const resultAction = await store.dispatch(refreshAccessToken());
            
            if (refreshAccessToken.fulfilled.match(resultAction)) {
              // Retry the original request with new token
              const newToken = await AsyncStorage.getItem('accessToken');
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              
              return apiClient(originalRequest);
            } else {
              // Refresh failed, logout user
              store.dispatch(resetAuth());
              throw new Error('Session expired. Please login again.');
            }
          } else {
            // No refresh token, logout user
            store.dispatch(resetAuth());
            throw new Error('Authentication required. Please login.');
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          store.dispatch(resetAuth());
          throw new Error('Session expired. Please login again.');
        }
      }
      
      // Handle specific error status codes
      switch (status) {
        case 400:
          throw new Error(data?.message || 'Invalid request. Please check your input.');
        case 403:
          throw new Error(data?.message || 'Access denied. You don\'t have permission.');
        case 404:
          throw new Error(data?.message || 'The requested resource was not found.');
        case 429:
          throw new Error(data?.message || 'Too many requests. Please try again later.');
        case 500:
          throw new Error(data?.message || 'Server error. Please try again later.');
        default:
          throw new Error(data?.message || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      // Network error - no response received
      console.error('Network error:', error.request);
      throw new Error('Network error. Please check your internet connection.');
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
      throw new Error('Request failed. Please try again.');
    }
  }
);

// API helper functions
export const apiHelpers = {
  // GET request
  get: async (url, config = {}) => {
    try {
      const response = await apiClient.get(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // POST request
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.post(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // PUT request
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // DELETE request
  delete: async (url, config = {}) => {
    try {
      const response = await apiClient.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Upload file
  upload: async (url, formData, onProgress) => {
    try {
      const response = await apiClient.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Network status helper
export const checkNetworkStatus = async () => {
  try {
    const response = await fetch(API_CONFIG.BASE_URL.replace('/api', '/health'), {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// API endpoints constants
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    UPDATE_PROFILE: '/auth/profile',
    DELETE_ACCOUNT: '/auth/account',
  },
  
  // Users
  USERS: {
    PROFILE: '/users/profile',
    ADDRESSES: '/users/addresses',
    PAYMENT_METHODS: '/users/payment-methods',
    RIDE_HISTORY: '/users/ride-history',
    ECO_STATS: '/users/eco-stats',
    REFERRALS: '/users/referrals',
  },
  
  // Rides
  RIDES: {
    ESTIMATE: '/rides/estimate',
    BOOK: '/rides/book',
    TRACK: (rideId) => `/rides/${rideId}/track`,
    COMPLETE: (rideId) => `/rides/${rideId}/complete`,
    CANCEL: (rideId) => `/rides/${rideId}/cancel`,
    RATE: (rideId) => `/rides/${rideId}/rate`,
    HISTORY: '/rides/history',
  },
  
  // Subscriptions
  SUBSCRIPTIONS: {
    PLANS: '/subscriptions/plans',
    CURRENT: '/subscriptions/current',
    SUBSCRIBE: '/subscriptions/subscribe',
    CANCEL: '/subscriptions/cancel',
    HISTORY: '/subscriptions/history',
  },
  
  // Payments
  PAYMENTS: {
    METHODS: '/payments/methods',
    ADD_METHOD: '/payments/add-method',
    REMOVE_METHOD: (methodId) => `/payments/methods/${methodId}`,
    PROCESS: '/payments/process',
    HISTORY: '/payments/history',
  },
  
  // Maps & Location
  MAPS: {
    GEOCODE: '/maps/geocode',
    REVERSE_GEOCODE: '/maps/reverse-geocode',
    DIRECTIONS: '/maps/directions',
    NEARBY_DRIVERS: '/maps/nearby-drivers',
  },
};

export default apiClient;