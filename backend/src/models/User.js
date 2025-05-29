const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    required: true
  },
  label: {
    type: String,
    required: true
  },
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
  isDefault: {
    type: Boolean,
    default: false
  }
});

const paymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['card', 'upi', 'wallet', 'cash'],
    required: true
  },
  details: {
    // For cards
    last4: String,
    brand: String,
    // For UPI
    upiId: String,
    // For wallets
    walletType: String,
    // Common
    token: String // Razorpay token
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const subscriptionSchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan'
  },
  planType: {
    type: String,
    enum: ['bike', 'car'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  remainingKm: {
    type: Number,
    default: 100 // Based on spec: 100km included
  },
  totalKmUsed: {
    type: Number,
    default: 0
  },
  autoRenewal: {
    type: Boolean,
    default: true
  }
});

const ecoStatsSchema = new mongoose.Schema({
  totalCO2Saved: {
    type: Number,
    default: 0 // in kg
  },
  treesEquivalent: {
    type: Number,
    default: 0
  },
  totalDistanceTraveled: {
    type: Number,
    default: 0 // in km
  },
  totalRides: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  // Basic Information
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
  
  // Verification
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Authentication
  password: {
    type: String,
    minlength: 6
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Location & Preferences
  addresses: [addressSchema],
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en'
  },
  
  // Payment
  paymentMethods: [paymentMethodSchema],
  
  // Subscription
  subscription: subscriptionSchema,
  
  // Referral System
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referrals: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dateReferred: {
      type: Date,
      default: Date.now
    },
    rewardClaimed: {
      type: Boolean,
      default: false
    }
  }],
  referralCredits: {
    type: Number,
    default: 0 // in km
  },
  
  // Eco Impact
  ecoStats: ecoStatsSchema,
  
  // App Settings
  settings: {
    notifications: {
      rides: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      ecoReports: { type: Boolean, default: true },
      subscription: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Rating
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
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ 'addresses.coordinates': '2dsphere' });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode && this.isNew) {
    // Generate unique referral code
    this.referralCode = 'ECO' + this.phone.slice(-4) + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateEcoStats = function(rideData) {
  this.ecoStats.totalCO2Saved += rideData.co2Saved || 0;
  this.ecoStats.treesEquivalent = Math.floor(this.ecoStats.totalCO2Saved / 21.77); // 1 tree = ~21.77 kg CO2/year
  this.ecoStats.totalDistanceTraveled += rideData.distance || 0;
  this.ecoStats.totalRides += 1;
  this.ecoStats.lastUpdated = Date.now();
};

userSchema.methods.updateSubscriptionUsage = function(distance) {
  if (this.subscription && this.subscription.status === 'active') {
    this.subscription.remainingKm = Math.max(0, this.subscription.remainingKm - distance);
    this.subscription.totalKmUsed += distance;
  }
};

userSchema.methods.addReferralCredit = function(kmCredit = 5) {
  this.referralCredits += kmCredit;
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Static methods
userSchema.statics.findByPhoneOrEmail = function(identifier) {
  return this.findOne({
    $or: [
      { phone: identifier },
      { email: identifier }
    ]
  });
};

module.exports = mongoose.model('User', userSchema);