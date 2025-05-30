// Path: /backend/src/controllers/paymentController.js
const User = require('../models/user');
const Ride = require('../models/ride');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { 
  processPayment, 
  verifyPaymentSignature, 
  getPaymentDetails: getPaymentDetailsService,
  processRefund: processRefundService 
} = require('../services/paymentService');

/**
 * @desc    Process payment for a ride
 * @route   POST /api/payments/process/ride
 * @access  Private
 */
const processRidePayment = async (req, res) => {
  try {
    const { rideId, paymentMethodId, amount, tip = 0 } = req.body;
    const userId = req.user.id;

    // Find the ride
    const ride = await Ride.findOne({ rideId, userId });
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    // Check if ride is eligible for payment
    if (!['completed', 'in_progress'].includes(ride.status)) {
      return res.status(400).json({
        success: false,
        error: 'Ride is not eligible for payment'
      });
    }

    // Check if payment already processed
    if (ride.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment already processed for this ride'
      });
    }

    // Calculate total amount (fare + tip)
    const totalAmount = (amount || ride.fareBreakdown.total) + tip;

    // For subscription rides, amount should be 0 or just tip
    if (ride.isSubscriptionRide && amount > tip) {
      return res.status(400).json({
        success: false,
        error: 'Subscription rides are already paid for'
      });
    }

    // Process payment only if amount > 0
    let paymentResult = { success: true, paymentId: null };
    
    if (totalAmount > 0) {
      paymentResult = await processPayment({
        amount: totalAmount * 100, // Convert to paisa
        currency: 'INR',
        paymentMethodId,
        description: `Eco Ride - ${rideId}`,
        userId,
        metadata: {
          rideId,
          vehicleType: ride.vehicleType,
          tip: tip
        }
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Payment processing failed'
        });
      }
    }

    // Update ride payment status
    ride.paymentStatus = 'completed';
    ride.paymentId = paymentResult.paymentId;
    ride.paymentMethod = getPaymentMethodFromId(paymentMethodId);
    
    // Add tip to fare breakdown
    if (tip > 0) {
      ride.fareBreakdown.tip = tip;
      ride.fareBreakdown.total += tip;
    }

    await ride.save();

    // Update user's subscription usage if applicable
    const user = await User.findById(userId);
    if (ride.isSubscriptionRide && user.subscription) {
      user.updateSubscriptionUsage(ride.actualDistance || ride.estimatedDistance);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        paymentId: paymentResult.paymentId,
        amount: totalAmount,
        rideId: ride.rideId,
        paymentStatus: 'completed'
      }
    });

  } catch (error) {
    console.error('Process ride payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Process payment for subscription
 * @route   POST /api/payments/process/subscription
 * @access  Private
 */
const processSubscriptionPayment = async (req, res) => {
  try {
    const { planId, durationType, paymentMethodId } = req.body;
    const userId = req.user.id;

    // Get subscription plan
    const plan = await SubscriptionPlan.findOne({ planId, isActive: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user already has active subscription
    if (user.subscription && 
        user.subscription.status === 'active' && 
        new Date() < user.subscription.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active subscription'
      });
    }

    // Calculate amount
    const amount = plan.getDiscountedPrice(durationType);
    
    // Process payment
    const paymentResult = await processPayment({
      amount: amount * 100, // Convert to paisa
      currency: 'INR',
      paymentMethodId,
      description: `${plan.name} - ${durationType} subscription`,
      userId,
      metadata: {
        planId: plan.planId,
        durationType,
        subscriptionType: 'new'
      }
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment processing failed'
      });
    }

    // Create/update subscription
    const durationDays = durationType === 'daily' ? 1 : 
                        durationType === 'weekly' ? 7 : 30;
    
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
    plan.addSubscriber(amount);
    await plan.save();

    res.status(200).json({
      success: true,
      message: 'Subscription payment processed successfully',
      data: {
        paymentId: paymentResult.paymentId,
        amount: amount,
        subscription: user.subscription,
        planName: plan.name
      }
    });

  } catch (error) {
    console.error('Process subscription payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Verify payment after processing
 * @route   POST /api/payments/verify
 * @access  Private
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify payment signature
    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Get payment details from Razorpay
    const paymentDetails = await getPaymentDetailsService(razorpay_payment_id);

    if (!paymentDetails.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to verify payment details'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: razorpay_payment_id,
        status: paymentDetails.payment.status,
        amount: paymentDetails.payment.amount / 100, // Convert to rupees
        method: paymentDetails.payment.method
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get payment history
 * @route   GET /api/payments/history
 * @access  Private
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // Get payments from rides
    const ridePayments = await Ride.find({
      userId,
      paymentStatus: 'completed'
    })
    .select('rideId paymentId paymentMethod fareBreakdown.total createdAt vehicleType')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    // Format payment history
    const paymentHistory = ridePayments.map(ride => ({
      id: ride.paymentId || ride._id,
      type: 'ride',
      rideId: ride.rideId,
      amount: ride.fareBreakdown.total,
      method: ride.paymentMethod,
      vehicleType: ride.vehicleType,
      status: 'completed',
      date: ride.createdAt,
      description: `Eco Ride - ${ride.vehicleType}`
    }));

    // Get total count for pagination
    const totalPayments = await Ride.countDocuments({
      userId,
      paymentStatus: 'completed'
    });

    res.status(200).json({
      success: true,
      data: {
        payments: paymentHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / parseInt(limit)),
          total: totalPayments,
          hasMore: totalPayments > parseInt(page) * parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user's payment methods
 * @route   GET /api/payments/methods
 * @access  Private
 */
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('paymentMethods');

    // Filter out sensitive data and only show active methods
    const paymentMethods = user.paymentMethods
      .filter(method => method.isActive)
      .map(method => ({
        _id: method._id,
        type: method.type,
        details: {
          // Only show safe details based on type
          ...(method.type === 'card' && {
            last4: method.details.last4,
            brand: method.details.brand
          }),
          ...(method.type === 'upi' && {
            upiId: method.details.upiId
          }),
          ...(method.type === 'wallet' && {
            walletType: method.details.walletType
          })
        },
        isDefault: method.isDefault
      }));

    res.status(200).json({
      success: true,
      data: {
        paymentMethods
      }
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Add new payment method
 * @route   POST /api/payments/methods
 * @access  Private
 */
const addPaymentMethod = async (req, res) => {
  try {
    const { type, details } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate payment method details based on type
    const validationResult = validatePaymentMethodDetails(type, details);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.error
      });
    }

    // Add new payment method
    const newPaymentMethod = {
      type,
      details: validationResult.cleanedDetails,
      isDefault: user.paymentMethods.length === 0,
      isActive: true
    };

    user.paymentMethods.push(newPaymentMethod);
    await user.save();

    // Return safe version
    const safePaymentMethod = {
      _id: newPaymentMethod._id,
      type: newPaymentMethod.type,
      details: getSafePaymentDetails(newPaymentMethod),
      isDefault: newPaymentMethod.isDefault
    };

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: {
        paymentMethod: safePaymentMethod
      }
    });

  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Remove payment method
 * @route   DELETE /api/payments/methods/:methodId
 * @access  Private
 */
const removePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const paymentMethod = user.paymentMethods.id(methodId);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    const wasDefault = paymentMethod.isDefault;
    user.paymentMethods.pull(methodId);

    // If deleted method was default, make first remaining method default
    if (wasDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment method removed successfully'
    });

  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get payment details
 * @route   GET /api/payments/:paymentId
 * @access  Private
 */
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Find ride associated with this payment
    const ride = await Ride.findOne({ 
      paymentId, 
      userId 
    }).select('rideId paymentId paymentMethod fareBreakdown vehicleType createdAt completedAt');

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Get payment details from payment service
    const paymentDetails = await getPaymentDetailsService(paymentId);

    const response = {
      paymentId: ride.paymentId,
      rideId: ride.rideId,
      amount: ride.fareBreakdown.total,
      method: ride.paymentMethod,
      vehicleType: ride.vehicleType,
      status: 'completed',
      createdAt: ride.createdAt,
      completedAt: ride.completedAt,
      fareBreakdown: ride.fareBreakdown
    };

    // Add service details if available
    if (paymentDetails.success) {
      response.serviceDetails = paymentDetails.payment;
    }

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Process refund
 * @route   POST /api/payments/refund
 * @access  Private
 */
const processRefund = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    const userId = req.user.id;

    // Find ride associated with this payment
    const ride = await Ride.findOne({ 
      paymentId, 
      userId,
      paymentStatus: 'completed'
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found or not eligible for refund'
      });
    }

    // Check if refund is eligible (ride cancelled or other valid reasons)
    if (!['cancelled', 'failed'].includes(ride.status)) {
      return res.status(400).json({
        success: false,
        error: 'Ride is not eligible for refund'
      });
    }

    // Process refund
    const refundAmount = amount || (ride.fareBreakdown.total * 100); // Convert to paisa
    const refundResult = await processRefundService(paymentId, refundAmount);

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Refund processing failed'
      });
    }

    // Update ride status
    ride.paymentStatus = 'refunded';
    await ride.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refundResult.refundId,
        amount: refundResult.amount / 100, // Convert to rupees
        status: refundResult.status,
        originalPaymentId: paymentId
      }
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

// Helper functions
const getPaymentMethodFromId = (paymentMethodId) => {
  // In real implementation, you'd look up the actual payment method
  // For now, return a default
  return 'upi';
};

const validatePaymentMethodDetails = (type, details) => {
  switch (type) {
    case 'card':
      if (!details.last4 || !details.brand) {
        return { isValid: false, error: 'Card details are incomplete' };
      }
      return { 
        isValid: true, 
        cleanedDetails: { 
          last4: details.last4, 
          brand: details.brand 
        } 
      };
    
    case 'upi':
      if (!details.upiId) {
        return { isValid: false, error: 'UPI ID is required' };
      }
      return { 
        isValid: true, 
        cleanedDetails: { 
          upiId: details.upiId 
        } 
      };
    
    case 'wallet':
      if (!details.walletType) {
        return { isValid: false, error: 'Wallet type is required' };
      }
      return { 
        isValid: true, 
        cleanedDetails: { 
          walletType: details.walletType 
        } 
      };
    
    default:
      return { isValid: false, error: 'Invalid payment method type' };
  }
};

const getSafePaymentDetails = (paymentMethod) => {
  switch (paymentMethod.type) {
    case 'card':
      return {
        last4: paymentMethod.details.last4,
        brand: paymentMethod.details.brand
      };
    case 'upi':
      return {
        upiId: paymentMethod.details.upiId
      };
    case 'wallet':
      return {
        walletType: paymentMethod.details.walletType
      };
    default:
      return {};
  }
};

module.exports = {
  processRidePayment,
  processSubscriptionPayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  getPaymentDetails,
  processRefund
};