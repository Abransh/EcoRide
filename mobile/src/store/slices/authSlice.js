import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api/auth';

// Initial state
const initialState = {
  // Authentication status
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  
  // Tokens
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  
  // User basic info (from auth)
  user: null,
  
  // OTP flow
  otpSent: false,
  otpPhone: null,
  otpLoading: false,
  
  // Errors
  error: null,
  
  // Login attempts
  loginAttempts: 0,
  lastLoginAttempt: null,
};

// Async thunks
export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async ({ phone }, { rejectWithValue }) => {
    try {
      const response = await authAPI.sendOTP(phone);
      return { phone, ...response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to send OTP'
      );
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ phone, otp, name, email }, { rejectWithValue }) => {
    try {
      const response = await authAPI.verifyOTP(phone, otp, name, email);
      
      // Store tokens
      await AsyncStorage.setItem('accessToken', response.data.tokens.accessToken);
      await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to verify OTP'
      );
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await authAPI.refreshToken(auth.refreshToken);
      
      // Store new tokens
      await AsyncStorage.setItem('accessToken', response.data.accessToken);
      await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to refresh token'
      );
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      return response.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to get user data'
      );
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to update profile'
      );
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      // Call logout API
      await authAPI.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.log('Logout API call failed:', error);
    } finally {
      // Clear stored tokens
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      
      // Clear other user data
      await AsyncStorage.removeItem('persist:user');
      
      return true;
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Initialize auth state from stored data
    initializeAuth: (state, action) => {
      const { token, refreshToken, user } = action.payload;
      
      if (token && refreshToken) {
        state.token = token;
        state.refreshToken = refreshToken;
        state.isAuthenticated = true;
        state.user = user;
      }
      
      state.isInitialized = true;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Clear OTP state
    clearOTPState: (state) => {
      state.otpSent = false;
      state.otpPhone = null;
      state.otpLoading = false;
      state.error = null;
    },
    
    // Reset auth state (for logout)
    resetAuth: (state) => {
      return {
        ...initialState,
        isInitialized: true,
      };
    },
    
    // Update user data
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    
    // Set tokens
    setTokens: (state, action) => {
      const { accessToken, refreshToken } = action.payload;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
    },
  },
  
  extraReducers: (builder) => {
    // Send OTP
    builder
      .addCase(sendOTP.pending, (state) => {
        state.otpLoading = true;
        state.error = null;
      })
      .addCase(sendOTP.fulfilled, (state, action) => {
        state.otpLoading = false;
        state.otpSent = true;
        state.otpPhone = action.payload.phone;
        state.error = null;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.otpLoading = false;
        state.error = action.payload;
      });
    
    // Verify OTP
    builder
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.user = action.payload.user;
        state.otpSent = false;
        state.otpPhone = null;
        state.error = null;
        state.loginAttempts = 0;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.loginAttempts += 1;
        state.lastLoginAttempt = Date.now();
      });
    
    // Refresh token
    builder
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // If refresh fails, logout user
        return {
          ...initialState,
          isInitialized: true,
        };
      });
    
    // Get current user
    builder
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        // If getting user fails, might need to re-authenticate
        state.isAuthenticated = false;
      });
    
    // Update profile
    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
    
    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        return {
          ...initialState,
          isInitialized: true,
        };
      });
  },
});

// Actions
export const {
  initializeAuth,
  clearError,
  clearOTPState,
  resetAuth,
  updateUser,
  setTokens,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectOTPState = (state) => ({
  otpSent: state.auth.otpSent,
  otpPhone: state.auth.otpPhone,
  otpLoading: state.auth.otpLoading,
});

export default authSlice.reducer;