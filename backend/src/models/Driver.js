// Path: /backend/src/models/Driver.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vehicleSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 2015, // Only recent electric vehicles
    max: new Date().getFullYear() + 1
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    match: [/^[A-Z]{2}[\s-]?\d{2}[\s-]?[A-Z]{2}[\s-]?\d{4}$/, 'Invalid Indian license plate format']
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'car'],
    required: true
  },
  
  // Electric Vehicle Specific
  batteryCapacity: {
    type: Number, // in kWh
    required: true
  },
  range: {
    type: Number, // in km
    required: true
  },
  chargingType: {
    type: String,
    enum: ['slow', 'fast', 'super_fast'],
    default: 'fast'
  },
  
  // Registration & Insurance
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  registrationExpiry: {
    type: Date,
    required: true
  },
  insuranceNumber: {
    type: String,
    required: true
  },
  insuranceExpiry: {
    type: Date,
    required: true
  },
  
  // Vehicle Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastService: Date,
  nextServiceDue: Date
});

const locationSchema = new mongoose.Schema({
  coordinates: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  address: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['driving_license', 'vehicle_registration', 'insurance', 'puc', 'aadhar', 'pan'],
    required: true
  },
  number: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  expiryDate: Date
});

const earningsSchema = new mongoose.Schema({
  today: {
    type: Number,
    default: 0
  },
  thisWeek: {
    type: Number,
    default: 0
  },
  thisMonth: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const driverSchema = new mongoose.Schema({
  // Personal Information
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  profilePicture: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Invalid pincode']
    }
  },
  
  // Authentication
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Driver License
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  licenseExpiry: {
    type: Date,
    required: true
  },
  licenseType: {
    type: String,
    enum: ['LMV', 'MCWG', 'MCWOG'], // Light Motor Vehicle, Motorcycle With Gear, Motorcycle Without Gear
    required: true
  },
  
  // Vehicle Information
  vehicle: vehicleSchema,
  
  // Location & Availability
  currentLocation: locationSchema,
  homeLocation: locationSchema,
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  workingHours: {
    start: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    end: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    isFlexible: {
      type: Boolean,
      default: true
    }
  },
  
  // Documents
  documents: [documentSchema],
  
  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNotes: String,
  verifiedAt: Date,
  
  // Ratings & Performance
  rating: {
    average: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    distribution: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    }
  },
  
  // Statistics
  stats: {
    totalRides: {
      type: Number,
      default: 0
    },
    completedRides: {
      type: Number,
      default: 0
    },
    cancelledRides: {
      type: Number,
      default: 0
    },
    totalDistance: {
      type: Number,
      default: 0 // in km
    },
    totalHours: {
      type: Number,
      default: 0
    },
    acceptanceRate: {
      type: Number,
      default: 100 // percentage
    },
    cancellationRate: {
      type: Number,
      default: 0 // percentage
    }
  },
  
  // Earnings
  earnings: earningsSchema,
  
  // Bank Details
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  
  // App Settings
  settings: {
    notifications: {
      rideRequests: { type: Boolean, default: true },
      earnings: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      updates: { type: Boolean, default: true }
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en'
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Current Ride
  currentRideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
driverSchema.index({ phone: 1 });
driverSchema.index({ email: 1 });
driverSchema.index({ 'currentLocation.coordinates': '2dsphere' });
driverSchema.index({ isOnline: 1, isAvailable: 1 });
driverSchema.index({ 'vehicle.vehicleType': 1, isOnline: 1 });
driverSchema.index({ verificationStatus: 1 });

// Virtual for age
driverSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for completion rate
driverSchema.virtual('completionRate').get(function() {
  if (this.stats.totalRides === 0) return 100;
  return Math.round((this.stats.completedRides / this.stats.totalRides) * 100);
});

// Pre-save middleware to hash password
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
driverSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

driverSchema.methods.updateLocation = function(latitude, longitude, address = null) {
  this.currentLocation = {
    coordinates: { latitude, longitude },
    address,
    timestamp: new Date()
  };
};

driverSchema.methods.updateRating = function(newRating) {
  const oldTotal = this.rating.totalRatings;
  const oldAverage = this.rating.average;
  
  this.rating.totalRatings += 1;
  this.rating.average = ((oldAverage * oldTotal) + newRating) / this.rating.totalRatings;
  
  // Update distribution
  this.rating.distribution[this.getRatingKey(newRating)] += 1;
};

driverSchema.methods.getRatingKey = function(rating) {
  const ratingMap = { 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'one' };
  return ratingMap[rating] || 'one';
};

driverSchema.methods.updateEarnings = function(amount) {
  this.earnings.today += amount;
  this.earnings.thisWeek += amount;
  this.earnings.thisMonth += amount;
  this.earnings.total += amount;
  this.earnings.lastUpdated = new Date();
};

driverSchema.methods.canAcceptRide = function() {
  return this.isActive && 
         this.isOnline && 
         this.isAvailable && 
         this.verificationStatus === 'approved' &&
         !this.currentRideId;
};

driverSchema.methods.toJSON = function() {
  const driver = this.toObject();
  delete driver.password;
  delete driver.__v;
  return driver;
};

// Static methods
driverSchema.statics.findNearbyDrivers = function(coordinates, vehicleType, radius = 5) {
  return this.find({
    isOnline: true,
    isAvailable: true,
    verificationStatus: 'approved',
    'vehicle.vehicleType': vehicleType,
    'vehicle.isActive': true,
    currentRideId: null,
    'currentLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: radius * 1000 // Convert km to meters
      }
    }
  }).sort({ 'rating.average': -1 });
};

module.exports = mongoose.model('Driver', driverSchema);