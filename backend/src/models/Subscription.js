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
  
  // Plan Type
  vehicleType: {
    type: String,
    enum: ['bike', 'car'],
    required: true
  },
  
  // Pricing
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
  
  // Benefits
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
    }
  },
  
  // Validity
  duration: {
    type: Number,
    required: true,
    default: 30 // days
  },
  
  // Features
  features: [{
    type: String
  }],
  
  // Discount & Offers
  discount: {
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    validTill: Date,
    description: String
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  
  // Terms
  terms: [{
    type: String
  }],
  
  // Analytics
  totalSubscribers: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
subscriptionPlanSchema.index({ planId: 1 });
subscriptionPlanSchema.index({ vehicleType: 1, isActive: 1 });
subscriptionPlanSchema.index({ 'price.monthly': 1 });

// Virtuals
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

// Methods
subscriptionPlanSchema.methods.getDiscountedPrice = function(durationType = 'monthly') {
  const basePrice = this.price[durationType];
  if (this.discount.percentage > 0 && 
      (!this.discount.validTill || new Date() <= this.discount.validTill)) {
    return Math.round(basePrice * (1 - this.discount.percentage / 100));
  }
  return basePrice;
};

subscriptionPlanSchema.methods.isEligibleForUser = function(user) {
  // Check if user is eligible for this plan
  if (!this.isActive) return false;
  
  // Add custom eligibility logic here
  // For example, check if user has completed verification
  if (!user.isPhoneVerified) return false;
  
  return true;
};

// Statics
subscriptionPlanSchema.statics.getActivePlans = function(vehicleType = null) {
  const query = { isActive: true };
  if (vehicleType) {
    query.vehicleType = vehicleType;
  }
  return this.find(query).sort({ 'price.monthly': 1 });
};

subscriptionPlanSchema.statics.getPopularPlans = function() {
  return this.find({ isActive: true, isPopular: true })
             .sort({ totalSubscribers: -1 })
             .limit(3);
};

// Pre-save middleware
subscriptionPlanSchema.pre('save', function(next) {
  if (this.isNew && !this.planId) {
    // Generate plan ID
    this.planId = `${this.vehicleType.toUpperCase()}_${this.price.monthly}_${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);