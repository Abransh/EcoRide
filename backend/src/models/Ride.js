const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  placeId: String, // Google Places ID
  landmark: String
});

const fareBreakdownSchema = new mongoose.Schema({
  baseFare: {
    type: Number,
    required: true
  },
  distanceFare: {
    type: Number,
    required: true
  },
  timeFare: {
    type: Number,
    default: 0
  },
  surgePricing: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  subscriptionDiscount: {
    type: Number,
    default: 0
  },
  taxes: {
    type: Number,
    default: 0
  },
  tip: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
});

const ecoImpactSchema = new mongoose.Schema({
  co2Saved: {
    type: Number,
    required: true // in kg
  },
  treesEquivalent: {
    type: Number,
    required: true
  },
  fuelSaved: {
    type: Number,
    required: true // in liters
  }
});

const driverInfoSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  name: String,
  phone: String,
  rating: Number,
  vehicleDetails: {
    make: String,
    model: String,
    color: String,
    licensePlate: String,
    batteryLevel: Number // for electric vehicles
  }
});

const rideTrackingSchema = new mongoose.Schema({
  driverLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },
  estimatedArrival: Date,
  actualArrival: Date,
  rideStarted: Date,
  rideCompleted: Date,
  route: [{
    latitude: Number,
    longitude: Number,
    timestamp: Date
  }]
});

const ratingAndFeedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  tags: [String], // ['Clean Vehicle', 'Good Driving', 'On Time', etc.]
  ratedAt: {
    type: Date,
    default: Date.now
  }
});

const rideSchema = new mongoose.Schema({
  // Core ride information
  rideId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Participants
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverInfo: driverInfoSchema,
  
  // Location details
  pickup: {
    type: locationSchema,
    required: true
  },
  destination: {
    type: locationSchema,
    required: true
  },
  
  // Vehicle & Service
  vehicleType: {
    type: String,
    enum: ['bike', 'car'],
    required: true
  },
  serviceType: {
    type: String,
    enum: ['regular', 'subscription'],
    default: 'regular'
  },
  
  // Ride Status
  status: {
    type: String,
    enum: [
      'requested',      // User requested ride
      'searching',      // Finding driver
      'driver_assigned', // Driver found and assigned
      'driver_arriving', // Driver en route to pickup
      'driver_arrived',  // Driver at pickup location
      'in_progress',    // Ride started
      'completed',      // Ride finished successfully
      'cancelled',      // Ride cancelled
      'failed'          // Ride failed
    ],
    default: 'requested'
  },
  
  // Distance and Time
  estimatedDistance: {
    type: Number, // in km
    required: true
  },
  actualDistance: {
    type: Number // in km
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  actualDuration: {
    type: Number // in minutes
  },
  
  // Pricing
  fareBreakdown: fareBreakdownSchema,
  isSubscriptionRide: {
    type: Boolean,
    default: false
  },
  
  // Environmental Impact
  ecoImpact: ecoImpactSchema,
  
  // Tracking
  tracking: rideTrackingSchema,
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'wallet', 'cash', 'subscription']
  },
  paymentId: String, // Razorpay payment ID
  
  // Rating and Feedback
  userRating: ratingAndFeedbackSchema,
  driverRating: ratingAndFeedbackSchema,
  
  // Emergency
  sosActivated: {
    type: Boolean,
    default: false
  },
  sosTimestamp: Date,
  emergencyContacts: [String],
  
  // Cancellation
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['user', 'driver', 'system']
  },
  cancellationFee: {
    type: Number,
    default: 0
  },
  
  // Special requests
  specialRequests: [String], // ['Child seat', 'Pet friendly', etc.]
  
  // Timestamps
  requestedAt: {
    type: Date,
    default: Date.now
  },
  scheduledFor: Date, // For scheduled rides
  completedAt: Date,
  
  // Metadata
  appVersion: String,
  deviceInfo: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
rideSchema.index({ userId: 1 });
rideSchema.index({ 'driverInfo.driverId': 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ requestedAt: -1 });
rideSchema.index({ rideId: 1 });
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'destination.coordinates': '2dsphere' });

// Virtual for ride duration in readable format
rideSchema.virtual('durationFormatted').get(function() {
  if (!this.actualDuration) return null;
  const hours = Math.floor(this.actualDuration / 60);
  const minutes = this.actualDuration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Pre-save middleware to generate ride ID
rideSchema.pre('save', function(next) {
  if (!this.rideId && this.isNew) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.rideId = `ECO${timestamp}${random}`.toUpperCase();
  }
  next();
});

// Pre-save middleware to calculate eco impact
rideSchema.pre('save', function(next) {
  if (this.isModified('actualDistance') && this.actualDistance) {
    // Calculate CO2 saved compared to petrol vehicle
    // Average petrol car emits ~2.31 kg CO2 per liter
    // Average fuel efficiency: 15 km/liter
    const fuelSaved = this.actualDistance / 15;
    const co2Saved = fuelSaved * 2.31;
    const treesEquivalent = co2Saved / 21.77; // 1 tree absorbs ~21.77 kg CO2/year
    
    this.ecoImpact = {
      co2Saved: parseFloat(co2Saved.toFixed(2)),
      treesEquivalent: parseFloat(treesEquivalent.toFixed(4)),
      fuelSaved: parseFloat(fuelSaved.toFixed(2))
    };
  }
  next();
});

// Methods
rideSchema.methods.calculateFare = function() {
  const distance = this.estimatedDistance;
  let baseFare, perKmRate;
  
  if (this.vehicleType === 'bike') {
    baseFare = 15; // ₹15 base for up to 1km
    perKmRate = 6; // ₹6 per additional km
    const additionalDistance = Math.max(0, distance - 1);
    this.fareBreakdown = {
      baseFare: baseFare,
      distanceFare: additionalDistance * perKmRate,
      timeFare: 0,
      surgePricing: 0,
      discount: 0,
      subscriptionDiscount: this.isSubscriptionRide ? baseFare + (additionalDistance * perKmRate) : 0,
      taxes: 0,
      tip: 0,
      total: this.isSubscriptionRide ? 0 : baseFare + (additionalDistance * perKmRate)
    };
  } else {
    baseFare = 30; // ₹30 base for up to 2km
    perKmRate = 15; // ₹15 per additional km
    const additionalDistance = Math.max(0, distance - 2);
    this.fareBreakdown = {
      baseFare: baseFare,
      distanceFare: additionalDistance * perKmRate,
      timeFare: 0,
      surgePricing: 0,
      discount: 0,
      subscriptionDiscount: this.isSubscriptionRide ? baseFare + (additionalDistance * perKmRate) : 0,
      taxes: 0,
      tip: 0,
      total: this.isSubscriptionRide ? 0 : baseFare + (additionalDistance * perKmRate)
    };
  }
};

rideSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  // Update timestamps based on status
  switch (newStatus) {
    case 'in_progress':
      this.tracking.rideStarted = new Date();
      break;
    case 'completed':
      this.tracking.rideCompleted = new Date();
      this.completedAt = new Date();
      this.paymentStatus = 'completed';
      break;
    case 'cancelled':
      // Handle cancellation logic
      break;
  }
};

rideSchema.methods.activateSOS = function(emergencyContacts = []) {
  this.sosActivated = true;
  this.sosTimestamp = new Date();
  this.emergencyContacts = emergencyContacts;
};

// Static methods
rideSchema.statics.findActiveRideForUser = function(userId) {
  return this.findOne({
    userId: userId,
    status: { $in: ['requested', 'searching', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress'] }
  });
};

rideSchema.statics.getUserRideHistory = function(userId, limit = 20, skip = 0) {
  return this.find({ userId: userId })
             .sort({ requestedAt: -1 })
             .limit(limit)
             .skip(skip)
             .populate('driverInfo.driverId', 'name rating');
};

rideSchema.statics.getEcoStatsForUser = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        totalDistance: { $sum: '$actualDistance' },
        totalCO2Saved: { $sum: '$ecoImpact.co2Saved' },
        totalTreesEquivalent: { $sum: '$ecoImpact.treesEquivalent' },
        totalFuelSaved: { $sum: '$ecoImpact.fuelSaved' }
      }
    }
  ]);
};

module.exports = mongoose.model('Ride', rideSchema);