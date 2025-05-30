// Path: /backend/src/services/paymentService.js
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Process payment using Razorpay
 * @param {Object} paymentData - Payment information
 * @returns {Object} Payment result
 */
const processPayment = async (paymentData) => {
  try {
    const { amount, currency, paymentMethodId, description, userId, metadata } = paymentData;

    // Development mode - simulate successful payment
    if (process.env.NODE_ENV === 'development' && !process.env.RAZORPAY_KEY_ID) {
      console.log('💳 Simulating payment:', {
        amount: amount / 100, // Convert paisa to rupees
        currency,
        description,
        userId
      });

      return {
        success: true,
        paymentId: `pay_dev_${Date.now()}`,
        status: 'captured',
        amount: amount,
        currency: currency,
        method: 'upi', // Simulated method
        fee: Math.round(amount * 0.02), // 2% fee simulation
        captured: true
      };
    }

    // Production - actual Razorpay payment
    const options = {
      amount: amount, // amount in paisa
      currency: currency || 'INR',
      receipt: `receipt_${userId}_${Date.now()}`,
      payment_capture: 1, // Auto capture
      notes: {
        userId,
        description,
        ...metadata
      }
    };

    const order = await razorpay.orders.create(options);

    // For actual payment, you would need to handle the payment flow
    // This is a simplified version - in real implementation, you'd:
    // 1. Create order
    // 2. Send order to frontend
    // 3. Frontend processes payment with Razorpay
    // 4. Verify payment on backend

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'created'
    };

  } catch (error) {
    console.error('❌ Payment processing failed:', error);
    return {
      success: false,
      error: error.description || 'Payment processing failed'
    };
  }
};

/**
 * Verify payment signature
 * @param {Object} paymentData - Payment verification data
 * @returns {Boolean} Verification result
 */
const verifyPaymentSignature = (paymentData) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    if (process.env.NODE_ENV === 'development') {
      return true; // Skip verification in development
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('❌ Payment verification failed:', error);
    return false;
  }
};

/**
 * Create subscription
 * @param {Object} subscriptionData - Subscription details
 * @returns {Object} Subscription result
 */
const createSubscription = async (subscriptionData) => {
  try {
    const { planId, customerId, totalCount, notes } = subscriptionData;

    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        subscriptionId: `sub_dev_${Date.now()}`,
        status: 'active',
        planId,
        customerId
      };
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_id: customerId,
      total_count: totalCount || 12, // 12 months by default
      notes: notes || {}
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      planId: subscription.plan_id
    };

  } catch (error) {
    console.error('❌ Subscription creation failed:', error);
    return {
      success: false,
      error: error.description || 'Subscription creation failed'
    };
  }
};

/**
 * Cancel subscription
 * @param {String} subscriptionId - Subscription ID
 * @returns {Object} Cancellation result
 */
const cancelSubscription = async (subscriptionId) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        subscriptionId,
        status: 'cancelled'
      };
    }

    const subscription = await razorpay.subscriptions.cancel(subscriptionId);

    return {
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status
    };

  } catch (error) {
    console.error('❌ Subscription cancellation failed:', error);
    return {
      success: false,
      error: error.description || 'Subscription cancellation failed'
    };
  }
};

/**
 * Get payment details
 * @param {String} paymentId - Payment ID
 * @returns {Object} Payment details
 */
const getPaymentDetails = async (paymentId) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        payment: {
          id: paymentId,
          amount: 50000, // ₹500
          currency: 'INR',
          status: 'captured',
          method: 'upi'
        }
      };
    }

    const payment = await razorpay.payments.fetch(paymentId);

    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        created_at: payment.created_at
      }
    };

  } catch (error) {
    console.error('❌ Get payment details failed:', error);
    return {
      success: false,
      error: error.description || 'Failed to get payment details'
    };
  }
};

/**
 * Process refund
 * @param {String} paymentId - Payment ID
 * @param {Number} amount - Refund amount in paisa
 * @returns {Object} Refund result
 */
const processRefund = async (paymentId, amount = null) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        refundId: `rfnd_dev_${Date.now()}`,
        amount: amount || 50000,
        status: 'processed'
      };
    }

    const refundData = {
      payment_id: paymentId
    };

    if (amount) {
      refundData.amount = amount;
    }

    const refund = await razorpay.payments.refund(paymentId, refundData);

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status
    };

  } catch (error) {
    console.error('❌ Refund processing failed:', error);
    return {
      success: false,
      error: error.description || 'Refund processing failed'
    };
  }
};

/**
 * Create customer
 * @param {Object} customerData - Customer details
 * @returns {Object} Customer creation result
 */
const createCustomer = async (customerData) => {
  try {
    const { name, email, contact } = customerData;

    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        customerId: `cust_dev_${Date.now()}`,
        email,
        contact
      };
    }

    const customer = await razorpay.customers.create({
      name,
      email,
      contact,
      notes: {
        platform: 'eco-ride'
      }
    });

    return {
      success: true,
      customerId: customer.id,
      email: customer.email,
      contact: customer.contact
    };

  } catch (error) {
    console.error('❌ Customer creation failed:', error);
    return {
      success: false,
      error: error.description || 'Customer creation failed'
    };
  }
};

module.exports = {
  processPayment,
  verifyPaymentSignature,
  createSubscription,
  cancelSubscription,
  getPaymentDetails,
  processRefund,
  createCustomer
};