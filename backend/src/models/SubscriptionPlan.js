// Path: /backend/src/models/SubscriptionPlan.js
const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  // Plan Identification
  planId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 100
  },
  
  // Plan Type
  vehicleType: {
    type: String,
    enum: ['bike', 'car'],
    required: true
  },
  
  // Pricing Structure
  price: {
    monthly: {
      type: Number,
      required: true
    },
    weekly: {
      type: Number,
      default: function() {
        return Math.round(this.price.monthly * 0.3); // ~30% of monthly
      }
    },
    daily: {
      type: Number,
      default: function() {
        return Math.round(this.price.monthly * 0.08); // ~8% of monthly
      }
    }
  },
  
  // Original pricing for comparison
  originalPrice: {
    monthly: Number,
    weekly: Number,
    daily: Number
  },
  
  // Benefits & Features
  benefits: {
    includedKm: {
      type: Number,
      required: true,
      default: 100
    },
    unlimitedRides: {
      type: Boolean,
      default: true
    },
    extraKmRate: {
      type: Number, // Rate per km after included km exhausted
      default: function() {
        return this.vehicleType === 'bike' ? 3 : 8; // 50% discount on regular rates
      }
    },
    priorityBooking: {
      type: Boolean,
      default: true
    },
    noSurgeCharges: {
      type: Boolean,
      default: true
    },
    freeCancellation: {
      type: Boolean,
      default: true
    },
    customerSupport: {
      type: String,
      enum: ['basic', 'priority', '24x7'],
      default: 'priority'
    }
  },
  
  // Plan Duration
  duration: {
    type: Number,
    required: true,
    default: 30 // days
  },
  
  // Features List for UI
  features: [{
    title: String,
    description: String,
    included: {
      type: Boolean,
      default: true
    }
  }],
  
  // Discount & Offers
  discount: {
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    validFrom: Date,
    validTill: Date,
    description: String,
    couponCode: String,
    maxRedemptions: Number,
    currentRedemptions: {
      type: Number,
      default: 0
    }
  },
  
  // Plan Status & Visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  
  // Availability
  availability: {
    cities: [{
      type: String,
      lowercase: true
    }],
    isUniversal: {
      type: Boolean,
      default: true
    }
  },
  
  // Eligibility Criteria
  eligibility: {
    minAge: {
      type: Number,
      default: 18
    },
    maxAge: {
      type: Number,
      default: 70
    },
    requiresVerification: {
      type: Boolean,
      default: true
    },
    excludeNewUsers: {
      type: Boolean,
      default: false
    }
  },
  
  // Terms & Conditions
  terms: [{
    title: String,
    description: String
  }],
  
  // Marketing
  badge: {
    text: String,
    color: String,
    backgroundColor: String
  },
  icon: String,
  color: {
    primary: String,
    secondary: String
  },
  
  // Analytics & Performance
  stats: {
    totalSubscribers: {
      type: Number,
      default: 0
    },
    activeSubscribers: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    averageUsage: {
      type: Number,
      default: 0
    },
    renewalRate: {
      type: Number,
      default: 0
    }
  },
  
  // SEO & Meta
  meta: {
    title: String,
    description: String,
    keywords: [String]
  },
  
  // Ordering
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Auto-renewal settings
  autoRenewal: {
    enabled: {
      type: Boolean,
      default: true
    },
    discountPercentage: {
      type: Number,
      default: 0
    },
    reminderDays: {
      type: Number,
      default: 3
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
subscriptionPlanSchema.index({ planId: 1 });
subscriptionPlanSchema.index({ vehicleType: 1, isActive: 1 });
subscriptionPlanSchema.index({ 'price.monthly': 1 });
subscriptionPlanSchema.index({ isPopular: 1, isActive: 1 });
subscriptionPlanSchema.index({ displayOrder: 1, isActive: 1 });
subscriptionPlanSchema.index({ 'availability.cities': 1 });

// Virtual fields
subscriptionPlanSchema.virtual('savingsPerMonth').get(function() {
  // Calculate savings compared to per-ride pricing
  const avgKmPerMonth = this.benefits.includedKm;
  let regularCost;
  
  if (this.vehicleType === 'bike') {
    // ₹15 base + ₹6 per km for additional distance
    const avgRides = Math.ceil(avgKmPerMonth / 3); // ~3km per ride
    regularCost = avgRides * 15 + Math.max(0, avgKmPerMonth - avgRides) * 6;
  } else {
    // ₹30 base + ₹15 per km for additional distance  
    const avgRides = Math.ceil(avgKmPerMonth / 5); // ~5km per ride
    regularCost = avgRides * 30 + Math.max(0, avgKmPerMonth - avgRides * 2) * 15;
  }
  
  return Math.max(0, regularCost - this.price.monthly);
});

subscriptionPlanSchema.virtual('costPerKm').get(function() {
  return Math.round((this.price.monthly / this.benefits.includedKm) * 100) / 100;
});

subscriptionPlanSchema.virtual('discountedPrice').get(function() {
  if (this.discount.percentage > 0 && this.isDiscountValid()) {
    return {
      monthly: Math.round(this.price.monthly * (1 - this.discount.percentage / 100)),
      weekly: Math.round(this.price.weekly * (1 - this.discount.percentage / 100)),
      daily: Math.round(this.price.daily * (1 - this.discount.percentage / 100))
    };
  }
  return this.price;
});

subscriptionPlanSchema.virtual('savingsPercentage').get(function() {
  if (this.originalPrice && this.originalPrice.monthly) {
    return Math.round(((this.originalPrice.monthly - this.price.monthly) / this.originalPrice.monthly) * 100);
  }
  return 0;
});

// Instance Methods
subscriptionPlanSchema.methods.getDiscountedPrice = function(durationType = 'monthly') {
  const basePrice = this.price[durationType];
  if (this.discount.percentage > 0 && this.isDiscountValid()) {
    return Math.round(basePrice * (1 - this.discount.percentage / 100));
  }
  return basePrice;
};

subscriptionPlanSchema.methods.isDiscountValid = function() {
  const now = new Date();
  return (
    (!this.discount.validFrom || now >= this.discount.validFrom) &&
    (!this.discount.validTill || now <= this.discount.validTill) &&
    (!this.discount.maxRedemptions || this.discount.currentRedemptions < this.discount.maxRedemptions)
  );
};

subscriptionPlanSchema.methods.isEligibleForUser = function(user) {
  // Check if plan is active
  if (!this.isActive) return false;
  
  // Check user verification
  if (this.eligibility.requiresVerification && !user.isPhoneVerified) {
    return false;
  }
  
  // Check user age if date of birth is available
  if (user.dateOfBirth) {
    const age = Math.floor((Date.now() - user.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < this.eligibility.minAge || age > this.eligibility.maxAge) {
      return false;
    }
  }
  
  // Check if new users are excluded
  if (this.eligibility.excludeNewUsers && user.ecoStats.totalRides === 0) {
    return false;
  }
  
  return true;
};

subscriptionPlanSchema.methods.isAvailableInCity = function(city) {
  if (this.availability.isUniversal) return true;
  return this.availability.cities.includes(city.toLowerCase());
};

subscriptionPlanSchema.methods.updateStats = function(statsUpdate) {
  Object.keys(statsUpdate).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] = statsUpdate[key];
    }
  });
};

subscriptionPlanSchema.methods.addSubscriber = function(revenue = null) {
  this.stats.totalSubscribers += 1;
  this.stats.activeSubscribers += 1;
  if (revenue) {
    this.stats.revenue += revenue;
  }
};

subscriptionPlanSchema.methods.removeSubscriber = function() {
  this.stats.activeSubscribers = Math.max(0, this.stats.activeSubscribers - 1);
};

// Static Methods
subscriptionPlanSchema.statics.getActivePlans = function(vehicleType = null, city = null) {
  const query = { isActive: true };
  
  if (vehicleType) {
    query.vehicleType = vehicleType;
  }
  
  let plans = this.find(query).sort({ displayOrder: 1, 'price.monthly': 1 });
  
  if (city) {
    plans = plans.find({
      $or: [
        { 'availability.isUniversal': true },
        { 'availability.cities': city.toLowerCase() }
      ]
    });
  }
  
  return plans;
};

subscriptionPlanSchema.statics.getPopularPlans = function(limit = 3) {
  return this.find({ 
    isActive: true, 
    isPopular: true 
  })
  .sort({ 'stats.totalSubscribers': -1, displayOrder: 1 })
  .limit(limit);
};

subscriptionPlanSchema.statics.getFeaturedPlans = function(vehicleType = null) {
  const query = { 
    isActive: true, 
    isFeatured: true 
  };
  
  if (vehicleType) {
    query.vehicleType = vehicleType;
  }
  
  return this.find(query).sort({ displayOrder: 1 });
};

subscriptionPlanSchema.statics.getRecommendedPlan = function(user) {
  // Simple recommendation logic based on user's ride history
  const preferredVehicle = user.ecoStats.totalRides > 0 ? 
    (user.ecoStats.averageDistance < 5 ? 'bike' : 'car') : 'bike';
  
  return this.findOne({
    isActive: true,
    vehicleType: preferredVehicle,
    isRecommended: true
  }).sort({ 'stats.conversionRate': -1 });
};

subscriptionPlanSchema.statics.searchPlans = function(searchQuery) {
  return this.find({
    isActive: true,
    $or: [
      { name: { $regex: searchQuery, $options: 'i' } },
      { description: { $regex: searchQuery, $options: 'i' } },
      { 'features.title': { $regex: searchQuery, $options: 'i' } }
    ]
  }).sort({ 'stats.totalSubscribers': -1 });
};

// Pre-save middleware
subscriptionPlanSchema.pre('save', function(next) {
  // Generate plan ID if not exists
  if (this.isNew && !this.planId) {
    this.planId = `${this.vehicleType.toUpperCase()}_${this.price.monthly}_${Date.now()}`;
  }
  
  // Set original price for first time
  if (this.isNew && !this.originalPrice.monthly) {
    this.originalPrice = {
      monthly: this.price.monthly,
      weekly: this.price.weekly,
      daily: this.price.daily
    };
  }
  
  // Ensure only one plan is marked as recommended per vehicle type
  if (this.isRecommended && this.isModified('isRecommended')) {
    this.constructor.updateMany(
      { vehicleType: this.vehicleType, _id: { $ne: this._id } },
      { isRecommended: false }
    ).exec();
  }
  
  next();
});

// Post-save middleware
subscriptionPlanSchema.post('save', function(doc) {
  console.log(`📋 Subscription plan ${doc.isNew ? 'created' : 'updated'}: ${doc.name} (${doc.planId})`);
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);