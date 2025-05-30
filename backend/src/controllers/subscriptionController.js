const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/user');
const { processPayment, createSubscription, cancelSubscription } = require('../services/paymentService');
const { sendSubscriptionNotification } = require('../services/smsService');

/**
 * @desc    Get all active subscription plans
 * @route   GET /api/subscriptions/plans
 * @access  Private
 */
const getSubscriptionPlans = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    
    const plans = await SubscriptionPlan.getActivePlans(vehicleType);
    const popularPlans = await SubscriptionPlan.getPopularPlans();
    
    res.status(200).json({
      success: true,
      data: {
        plans,
        popularPlans,
        total: plans.length
      }
    });
    
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user's current subscription
 * @route   GET /api/subscriptions/current
 * @access  Private
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).populate('subscription.planId');
    
    if (!user.subscription || user.subscription.status !== 'active') {
      return res.status(200).json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscription: null
        }
      });
    }
    
    // Check if subscription has expired
    if (new Date() > user.subscription.expiresAt) {
      user.subscription.status = 'expired';
      await user.save();
      
      return res.status(200).json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscription: user.subscription,
          message: 'Subscription has expired'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        hasActiveSubscription: true,
        subscription: user.subscription
      }
    });
    
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Subscribe to a plan
 * @route   POST /api/subscriptions/subscribe
 * @access  Private
 */
const subscribeToPlan = async (req, res) => {
  try {
    const { planId, durationType = 'monthly', paymentMethodId } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!planId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID and payment method are required'
      });
    }
    
    if (!['daily', 'weekly', 'monthly'].includes(durationType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid duration type'
      });
    }
    
    // Get plan details
    const plan = await SubscriptionPlan.findOne({ planId, isActive: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user is eligible
    if (!plan.isEligibleForUser(user)) {
      return res.status(400).json({
        success: false,
        error: 'You are not eligible for this plan'
      });
    }
    
    // Check if user already has an active subscription
    if (user.subscription && 
        user.subscription.status === 'active' && 
        new Date() < user.subscription.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active subscription'
      });
    }
    
    // Calculate pricing
    const amount = plan.getDiscountedPrice(durationType);
    const durationDays = durationType === 'daily' ? 1 : 
                        durationType === 'weekly' ? 7 : 30;
    
    try {
      // Process payment
      const paymentResult = await processPayment({
        amount: amount * 100, // Convert to paisa
        currency: 'INR',
        paymentMethodId,
        description: `${plan.name} - ${durationType} subscription`,
        userId,
        metadata: {
          planId,
          durationType,
          subscriptionType: 'new'
        }
      });
      
      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Payment failed. Please try again.'
        });
      }
      
      // Create subscription
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      
      user.subscription = {
        planId: plan._id,
        planType: plan.vehicleType,
        status: 'active',
        startDate: new Date(),
        expiresAt: expiresAt,
        remainingKm: plan.benefits.includedKm,
        totalKmUsed: 0,
        autoRenewal: true
      };
      
      await user.save();
      
      // Update plan statistics
      plan.totalSubscribers += 1;
      plan.revenue += amount;
      await plan.save();
      
      // Send confirmation SMS
      await sendSubscriptionNotification(user.phone, {
        type: 'subscription_activated',
        planName: plan.name,
        amount: amount,
        expiresAt: expiresAt.toLocaleDateString('en-IN'),
        includedKm: plan.benefits.includedKm
      });
      
      res.status(200).json({
        success: true,
        message: 'Subscription activated successfully',
        data: {
          subscription: user.subscription,
          payment: {
            id: paymentResult.paymentId,
            amount: amount,
            status: 'completed'
          }
        }
      });
      
    } catch (paymentError) {
      console.error('Subscription payment error:', paymentError);
      return res.status(400).json({
        success: false,
        error: 'Payment processing failed. Please try again.'
      });
    }
    
  } catch (error) {
    console.error('Subscribe to plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/subscriptions/cancel
 * @access  Private
 */
const cancelUserSubscription = async (req, res) => {
  try {
    const { reason, immediateCancel = false } = req.body;
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user || !user.subscription || user.subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    if (immediateCancel) {
      // Cancel immediately
      user.subscription.status = 'cancelled';
      user.subscription.autoRenewal = false;
      
      // Calculate refund if applicable
      const remainingDays = Math.max(0, 
        Math.ceil((user.subscription.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
      );
      
      const plan = await SubscriptionPlan.findById(user.subscription.planId);
      const dailyRate = plan ? plan.price.monthly / 30 : 0;
      const refundAmount = Math.round(remainingDays * dailyRate);
      
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: {
          refundAmount: refundAmount > 10 ? refundAmount : 0, // Minimum ₹10 refund
          cancelledAt: new Date()
        }
      });
    } else {
      // Cancel at end of current period
      user.subscription.autoRenewal = false;
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Subscription will not renew automatically',
        data: {
          validTill: user.subscription.expiresAt
        }
      });
    }
    
    // Send cancellation SMS
    await sendSubscriptionNotification(user.phone, {
      type: 'subscription_cancelled',
      immediateCancel,
      validTill: user.subscription.expiresAt.toLocaleDateString('en-IN')
    });
    
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get subscription history
 * @route   GET /api/subscriptions/history
 * @access  Private
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // This would typically be in a separate SubscriptionHistory model
    // For now, we'll return the current subscription data
    const user = await User.findById(userId).populate('subscription.planId');
    
    const subscriptions = user.subscription ? [user.subscription] : [];
    
    res.status(200).json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          total: subscriptions.length,
          hasMore: false
        }
      }
    });
    
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get subscription usage statistics
 * @route   GET /api/subscriptions/usage
 * @access  Private
 */
const getSubscriptionUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).populate('subscription.planId');
    
    if (!user.subscription || user.subscription.status !== 'active') {
      return res.status(200).json({
        success: true,
        data: {
          hasActiveSubscription: false,
          usage: null
        }
      });
    }
    
    const plan = await SubscriptionPlan.findById(user.subscription.planId);
    const daysRemaining = Math.max(0, 
      Math.ceil((user.subscription.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
    );
    
    const usageStats = {
      plan: {
        name: plan?.name,
        vehicleType: user.subscription.planType,
        includedKm: plan?.benefits.includedKm || 100
      },
      usage: {
        totalKmUsed: user.subscription.totalKmUsed || 0,
        remainingKm: user.subscription.remainingKm || 0,
        usagePercentage: plan ? 
          Math.round((user.subscription.totalKmUsed / plan.benefits.includedKm) * 100) : 0
      },
      validity: {
        startDate: user.subscription.startDate,
        expiresAt: user.subscription.expiresAt,
        daysRemaining,
        autoRenewal: user.subscription.autoRenewal
      },
      savings: {
        totalSaved: plan ? plan.savingsPerMonth : 0,
        costPerKm: plan ? plan.costPerKm : 0
      }
    };
    
    res.status(200).json({
      success: true,
      data: {
        hasActiveSubscription: true,
        usage: usageStats
      }
    });
    
  } catch (error) {
    console.error('Get subscription usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Renew subscription
 * @route   POST /api/subscriptions/renew
 * @access  Private
 */
const renewSubscription = async (req, res) => {
  try {
    const { durationType = 'monthly', paymentMethodId } = req.body;
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user.subscription) {
      return res.status(400).json({
        success: false,
        error: 'No subscription found to renew'
      });
    }
    
    const plan = await SubscriptionPlan.findById(user.subscription.planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Subscription plan is no longer available'
      });
    }
    
    // Calculate pricing and new expiry
    const amount = plan.getDiscountedPrice(durationType);
    const durationDays = durationType === 'daily' ? 1 : 
                        durationType === 'weekly' ? 7 : 30;
    
    const newExpiryDate = new Date(Math.max(
      user.subscription.expiresAt.getTime(),
      Date.now()
    ));
    newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);
    
    try {
      // Process payment
      const paymentResult = await processPayment({
        amount: amount * 100,
        currency: 'INR',
        paymentMethodId,
        description: `${plan.name} - ${durationType} renewal`,
        userId,
        metadata: {
          planId: plan.planId,
          durationType,
          subscriptionType: 'renewal'
        }
      });
      
      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Payment failed. Please try again.'
        });
      }
      
      // Update subscription
      user.subscription.status = 'active';
      user.subscription.expiresAt = newExpiryDate;
      user.subscription.remainingKm += plan.benefits.includedKm; // Add new km allowance
      user.subscription.autoRenewal = true;
      
      await user.save();
      
      // Update plan revenue
      plan.revenue += amount;
      await plan.save();
      
      // Send confirmation
      await sendSubscriptionNotification(user.phone, {
        type: 'subscription_renewed',
        planName: plan.name,
        amount: amount,
        expiresAt: newExpiryDate.toLocaleDateString('en-IN'),
        totalKm: user.subscription.remainingKm
      });
      
      res.status(200).json({
        success: true,
        message: 'Subscription renewed successfully',
        data: {
          subscription: user.subscription,
          payment: {
            id: paymentResult.paymentId,
            amount: amount,
            status: 'completed'
          }
        }
      });
      
    } catch (paymentError) {
      console.error('Subscription renewal payment error:', paymentError);
      return res.status(400).json({
        success: false,
        error: 'Payment processing failed. Please try again.'
      });
    }
    
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  getSubscriptionPlans,
  getCurrentSubscription,
  subscribeToPlan,
  cancelUserSubscription,
  getSubscriptionHistory,
  getSubscriptionUsage,
  renewSubscription
};