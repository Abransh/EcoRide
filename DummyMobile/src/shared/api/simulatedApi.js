/**
 * Simulated API Service
 * Purpose: Mock all backend API calls with realistic dummy data and delays
 * Features: User authentication, ride booking, payment processing, driver management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to simulate network delay
const simulateDelay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// Generate random IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Dummy data
const DUMMY_USERS = [
  {
    id: 'user_1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    persona: 'rider',
    profileImage: null,
    rating: 4.8,
    totalRides: 156,
  },
  {
    id: 'driver_1',
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    phone: '+1234567891',
    persona: 'driver',
    profileImage: null,
    rating: 4.9,
    totalRides: 342,
    vehicle: {
      make: 'Toyota',
      model: 'Prius',
      year: 2022,
      licensePlate: 'ECO-123',
      color: 'Blue',
    },
  },
];

const DUMMY_RIDES = [
  {
    id: 'ride_1',
    riderId: 'user_1',
    driverId: 'driver_1',
    status: 'completed',
    pickup: {
      address: '123 Main St, Downtown',
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
    },
    destination: {
      address: '456 Oak Ave, Uptown',
      coordinates: { latitude: 40.7589, longitude: -73.9851 },
    },
    fare: 15.50,
    distance: 5.2,
    duration: 18,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86300000).toISOString(),
    carbonSaved: 2.1, // kg CO2
  },
  {
    id: 'ride_2',
    riderId: 'user_1',
    driverId: 'driver_1',
    status: 'active',
    pickup: {
      address: '789 Pine St, Midtown',
      coordinates: { latitude: 40.7505, longitude: -73.9934 },
    },
    destination: {
      address: '321 Elm St, Brooklyn',
      coordinates: { latitude: 40.6782, longitude: -73.9442 },
    },
    fare: 22.00,
    distance: 8.1,
    estimatedDuration: 25,
    createdAt: new Date().toISOString(),
    driverLocation: { latitude: 40.7495, longitude: -73.9925 },
    estimatedArrival: 5, // minutes
  },
];

export const AuthAPI = {
  /**
   * Simulate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User data and token
   */
  async login(email, password) {
    await simulateDelay(1500);
    
    // Find user by email
    const user = DUMMY_USERS.find(u => u.email === email);
    
    if (!user || password !== 'password123') {
      throw new Error('Invalid credentials');
    }
    
    const token = `token_${generateId()}`;
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(user));
    
    return {
      success: true,
      user,
      token,
    };
  },

  /**
   * Simulate user registration
   * @param {Object} userData - User registration data
   * @returns {Object} Created user data and token
   */
  async register(userData) {
    await simulateDelay(2000);
    
    const newUser = {
      id: `user_${generateId()}`,
      ...userData,
      rating: 5.0,
      totalRides: 0,
      profileImage: null,
    };
    
    const token = `token_${generateId()}`;
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(newUser));
    
    return {
      success: true,
      user: newUser,
      token,
    };
  },

  /**
   * Simulate logout
   */
  async logout() {
    await simulateDelay(500);
    await AsyncStorage.multiRemove(['authToken', 'userData']);
    return { success: true };
  },

  /**
   * Validate current session
   */
  async validateSession() {
    await simulateDelay(800);
    const token = await AsyncStorage.getItem('authToken');
    const userData = await AsyncStorage.getItem('userData');
    
    if (!token || !userData) {
      throw new Error('Session expired');
    }
    
    return {
      success: true,
      user: JSON.parse(userData),
      token,
    };
  },
};

export const RideAPI = {
  /**
   * Book a new ride
   * @param {Object} rideData - Ride booking data
   * @returns {Object} Booked ride details
   */
  async bookRide(rideData) {
    await simulateDelay(2000);
    
    const newRide = {
      id: `ride_${generateId()}`,
      riderId: rideData.riderId,
      driverId: 'driver_1', // Simulate finding a driver
      status: 'searching',
      pickup: rideData.pickup,
      destination: rideData.destination,
      fare: Math.round((rideData.distance * 2.5 + 5) * 100) / 100,
      distance: rideData.distance,
      estimatedDuration: Math.round(rideData.distance * 3),
      createdAt: new Date().toISOString(),
      carbonSaved: Math.round(rideData.distance * 0.4 * 100) / 100,
    };
    
    // Simulate driver acceptance after 3 seconds
    setTimeout(() => {
      newRide.status = 'accepted';
      newRide.driverLocation = {
        latitude: rideData.pickup.coordinates.latitude + 0.01,
        longitude: rideData.pickup.coordinates.longitude + 0.01,
      };
      newRide.estimatedArrival = 7;
    }, 3000);
    
    return {
      success: true,
      ride: newRide,
    };
  },

  /**
   * Get ride history
   * @param {string} userId - User ID
   * @returns {Array} List of rides
   */
  async getRideHistory(userId) {
    await simulateDelay(1000);
    
    const userRides = DUMMY_RIDES.filter(ride => 
      ride.riderId === userId || ride.driverId === userId
    );
    
    return {
      success: true,
      rides: userRides,
    };
  },

  /**
   * Get active ride
   * @param {string} userId - User ID
   * @returns {Object} Active ride details
   */
  async getActiveRide(userId) {
    await simulateDelay(800);
    
    const activeRide = DUMMY_RIDES.find(ride => 
      (ride.riderId === userId || ride.driverId === userId) && 
      ['searching', 'accepted', 'active'].includes(ride.status)
    );
    
    return {
      success: true,
      ride: activeRide || null,
    };
  },

  /**
   * Cancel ride
   * @param {string} rideId - Ride ID
   * @returns {Object} Cancellation result
   */
  async cancelRide(rideId) {
    await simulateDelay(1000);
    
    return {
      success: true,
      message: 'Ride cancelled successfully',
    };
  },
};

export const PaymentAPI = {
  /**
   * Process payment
   * @param {Object} paymentData - Payment details
   * @returns {Object} Payment result
   */
  async processPayment(paymentData) {
    await simulateDelay(2000);
    
    return {
      success: true,
      transactionId: `txn_${generateId()}`,
      amount: paymentData.amount,
      method: paymentData.method,
      processedAt: new Date().toISOString(),
    };
  },

  /**
   * Get payment methods
   * @returns {Array} Available payment methods
   */
  async getPaymentMethods() {
    await simulateDelay(500);
    
    return {
      success: true,
      methods: [
        {
          id: 'card_1',
          type: 'credit_card',
          last4: '1234',
          brand: 'Visa',
          isDefault: true,
        },
        {
          id: 'paypal_1',
          type: 'paypal',
          email: 'user@example.com',
          isDefault: false,
        },
      ],
    };
  },
};

export const DriverAPI = {
  /**
   * Get nearby drivers
   * @param {Object} location - Current location
   * @returns {Array} List of nearby drivers
   */
  async getNearbyDrivers(location) {
    await simulateDelay(1000);
    
    const nearbyDrivers = [
      {
        id: 'driver_1',
        name: 'Sarah Wilson',
        rating: 4.9,
        estimatedArrival: 5,
        location: {
          latitude: location.latitude + 0.01,
          longitude: location.longitude + 0.01,
        },
        vehicle: {
          make: 'Toyota',
          model: 'Prius',
          color: 'Blue',
          licensePlate: 'ECO-123',
        },
      },
      {
        id: 'driver_2',
        name: 'Mike Johnson',
        rating: 4.7,
        estimatedArrival: 8,
        location: {
          latitude: location.latitude - 0.02,
          longitude: location.longitude + 0.015,
        },
        vehicle: {
          make: 'Honda',
          model: 'Insight',
          color: 'White',
          licensePlate: 'ECO-456',
        },
      },
    ];
    
    return {
      success: true,
      drivers: nearbyDrivers,
    };
  },

  /**
   * Update driver location
   * @param {string} driverId - Driver ID
   * @param {Object} location - New location
   * @returns {Object} Update result
   */
  async updateLocation(driverId, location) {
    await simulateDelay(300);
    
    return {
      success: true,
      location,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Toggle driver availability
   * @param {string} driverId - Driver ID
   * @param {boolean} isAvailable - Availability status
   * @returns {Object} Status update result
   */
  async toggleAvailability(driverId, isAvailable) {
    await simulateDelay(500);
    
    return {
      success: true,
      isAvailable,
      message: `Driver is now ${isAvailable ? 'available' : 'offline'}`,
    };
  },

  /**
   * Get driver status and stats
   * @param {string} driverId - Driver ID
   * @returns {Object} Driver status and statistics
   */
  async getDriverStatus(driverId) {
    await simulateDelay(800);
    
    return {
      success: true,
      status: {
        isOnline: true,
        currentStatus: 'available', // available, busy, offline
        todayEarnings: 127.50,
        todayRides: 8,
        activeRide: null,
        rating: 4.9,
        totalRides: 342,
        hoursWorked: 6.5,
        carbonSaved: 15.2, // kg CO2 today
      },
    };
  },

  /**
   * Get pending ride requests
   * @param {string} driverId - Driver ID
   * @returns {Array} List of pending ride requests
   */
  async getRideRequests(driverId) {
    await simulateDelay(1000);
    
    const requests = [
      {
        id: 'request_1',
        riderId: 'user_1',
        riderName: 'John Doe',
        riderRating: 4.8,
        pickup: {
          address: '123 Main St, Downtown',
          coordinates: { latitude: 40.7128, longitude: -74.0060 },
        },
        destination: {
          address: '456 Oak Ave, Uptown',
          coordinates: { latitude: 40.7589, longitude: -73.9851 },
        },
        estimatedFare: 15.50,
        distance: 5.2,
        estimatedDuration: 18,
        timeToPickup: 3, // minutes
        createdAt: new Date().toISOString(),
      },
    ];
    
    return {
      success: true,
      requests,
    };
  },

  /**
   * Accept or decline ride request
   * @param {string} requestId - Ride request ID
   * @param {boolean} accept - Whether to accept the ride
   * @returns {Object} Response result
   */
  async respondToRideRequest(requestId, accept) {
    await simulateDelay(500);
    
    if (accept) {
      return {
        success: true,
        ride: {
          id: requestId,
          status: 'accepted',
          message: 'Ride accepted! Navigate to pickup location.',
        },
      };
    } else {
      return {
        success: true,
        message: 'Ride request declined',
      };
    }
  },

  /**
   * Get driver earnings data
   * @param {string} driverId - Driver ID
   * @param {string} period - 'today', 'week', 'month'
   * @returns {Object} Earnings data and analytics
   */
  async getEarnings(driverId, period = 'today') {
    await simulateDelay(1200);
    
    const earningsData = {
      today: {
        total: 127.50,
        rides: 8,
        hours: 6.5,
        tips: 23.00,
        bonuses: 15.00,
        breakdown: [
          { time: '06:00', amount: 12.50 },
          { time: '07:30', amount: 18.75 },
          { time: '09:15', amount: 22.00 },
          { time: '11:00', amount: 15.25 },
          { time: '13:45', amount: 19.50 },
          { time: '15:30', amount: 16.75 },
          { time: '17:15', amount: 14.25 },
          { time: '19:00', amount: 8.50 },
        ],
      },
      week: {
        total: 892.75,
        rides: 56,
        hours: 42.5,
        tips: 156.50,
        bonuses: 95.00,
        breakdown: [
          { day: 'Mon', amount: 145.25 },
          { day: 'Tue', amount: 132.50 },
          { day: 'Wed', amount: 167.75 },
          { day: 'Thu', amount: 154.00 },
          { day: 'Fri', amount: 178.25 },
          { day: 'Sat', amount: 87.50 },
          { day: 'Sun', amount: 27.50 },
        ],
      },
      month: {
        total: 3847.25,
        rides: 248,
        hours: 186.5,
        tips: 692.50,
        bonuses: 425.00,
        breakdown: [
          { week: 'Week 1', amount: 965.75 },
          { week: 'Week 2', amount: 1124.50 },
          { week: 'Week 3', amount: 1089.25 },
          { week: 'Week 4', amount: 667.75 },
        ],
      },
    };
    
    return {
      success: true,
      earnings: earningsData[period],
      goals: {
        daily: { target: 150, current: earningsData.today.total },
        weekly: { target: 1000, current: earningsData.week.total },
        monthly: { target: 4000, current: earningsData.month.total },
      },
    };
  },

  /**
   * Update ride status (pickup, start, complete)
   * @param {string} rideId - Ride ID
   * @param {string} status - New status
   * @param {Object} location - Current location
   * @returns {Object} Update result
   */
  async updateRideStatus(rideId, status, location) {
    await simulateDelay(800);
    
    return {
      success: true,
      ride: {
        id: rideId,
        status,
        location,
        timestamp: new Date().toISOString(),
        message: `Ride ${status} successfully`,
      },
    };
  },

  /**
   * Get navigation directions
   * @param {Object} from - Starting location
   * @param {Object} to - Destination location
   * @returns {Object} Navigation data
   */
  async getDirections(from, to) {
    await simulateDelay(1000);
    
    return {
      success: true,
      route: {
        distance: 5.2, // km
        duration: 18, // minutes
        steps: [
          { instruction: 'Head north on Main St', distance: 0.5, duration: 2 },
          { instruction: 'Turn right onto Oak Ave', distance: 1.2, duration: 4 },
          { instruction: 'Continue straight for 2 miles', distance: 3.2, duration: 10 },
          { instruction: 'Turn left onto destination street', distance: 0.3, duration: 2 },
        ],
        trafficConditions: 'moderate',
        alternativeRoutes: 2,
      },
    };
  },

  /**
   * Request payout
   * @param {string} driverId - Driver ID
   * @param {number} amount - Amount to withdraw
   * @returns {Object} Payout result
   */
  async requestPayout(driverId, amount) {
    await simulateDelay(1500);
    
    return {
      success: true,
      payout: {
        id: `payout_${generateId()}`,
        amount,
        status: 'processing',
        estimatedDelivery: '1-2 business days',
        fee: Math.round(amount * 0.01 * 100) / 100, // 1% fee
        netAmount: Math.round((amount * 0.99) * 100) / 100,
        requestedAt: new Date().toISOString(),
      },
    };
  },

  /**
   * Update driver settings
   * @param {string} driverId - Driver ID
   * @param {Object} settings - Settings to update
   * @returns {Object} Update result
   */
  async updateDriverSettings(driverId, settings) {
    await simulateDelay(600);
    
    return {
      success: true,
      settings,
      message: 'Settings updated successfully',
    };
  },

  /**
   * Update vehicle information
   * @param {string} driverId - Driver ID
   * @param {Object} vehicleInfo - Vehicle details
   * @returns {Object} Update result
   */
  async updateVehicleInfo(driverId, vehicleInfo) {
    await simulateDelay(1000);
    
    return {
      success: true,
      vehicle: vehicleInfo,
      message: 'Vehicle information updated successfully',
    };  },
};

// Helper functions for easier imports
export const authenticateUser = AuthAPI.login;
export const registerUser = AuthAPI.register;

export default {
  AuthAPI,
  RideAPI,
  PaymentAPI,
  DriverAPI,
};
