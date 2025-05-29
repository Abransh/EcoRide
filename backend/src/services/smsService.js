const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number in format +91XXXXXXXXXX
 * @param {string} otp - 6-digit OTP
 * @returns {Object} - Success status and message
 */
const sendOTP = async (phone, otp) => {
  try {
    // Format phone number for international use
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    
    // Create OTP message
    const message = `Your Eco Ride verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.\n\n- Eco Ride Team`;
    
    // Development mode - log OTP instead of sending
    if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_ACCOUNT_SID) {
      console.log(`📱 SMS to ${formattedPhone}: ${message}`);
      return {
        success: true,
        message: 'OTP sent successfully (development mode)',
        messageId: `dev_${Date.now()}`
      };
    }
    
    // Production - send actual SMS
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER || '+1234567890', // Your Twilio phone number
      to: formattedPhone
    });
    
    console.log(`✅ SMS sent successfully to ${formattedPhone}, SID: ${result.sid}`);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      messageId: result.sid
    };
    
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    
    // Handle specific Twilio errors
    if (error.code === 21614) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }
    
    if (error.code === 21211) {
      return {
        success: false,
        error: 'Invalid phone number'
      };
    }
    
    if (error.code === 20003) {
      return {
        success: false,
        error: 'Authentication failed - check Twilio credentials'
      };
    }
    
    return {
      success: false,
      error: 'Failed to send SMS. Please try again later.'
    };
  }
};

/**
 * Send ride notification SMS
 * @param {string} phone - Phone number
 * @param {Object} rideData - Ride information
 * @returns {Object} - Success status and message
 */
const sendRideNotification = async (phone, rideData) => {
  try {
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    
    let message = '';
    
    switch (rideData.type) {
      case 'ride_confirmed':
        message = `🚗 Ride Confirmed!\n\nDriver: ${rideData.driverName}\nVehicle: ${rideData.vehicleDetails}\nETA: ${rideData.eta} mins\n\nTrack your ride in the Eco Ride app.`;
        break;
        
      case 'driver_arrived':
        message = `📍 Your driver has arrived!\n\nDriver: ${rideData.driverName}\nLocation: ${rideData.location}\n\nPlease head to the pickup point.`;
        break;
        
      case 'ride_completed':
        message = `✅ Ride Completed!\n\nDistance: ${rideData.distance} km\nFare: ₹${rideData.fare}\nCO2 Saved: ${rideData.co2Saved} kg\n\nThank you for choosing Eco Ride!`;
        break;
        
      case 'sos_alert':
        message = `🚨 EMERGENCY ALERT\n\nSOS activated for ride ${rideData.rideId}\nLocation: ${rideData.location}\nTime: ${new Date().toLocaleString()}\n\nImmediate assistance required.`;
        break;
        
      default:
        message = `Eco Ride Update: ${rideData.message}`;
    }
    
    // Development mode
    if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_ACCOUNT_SID) {
      console.log(`📱 Notification to ${formattedPhone}: ${message}`);
      return {
        success: true,
        message: 'Notification sent successfully (development mode)'
      };
    }
    
    // Production - send actual SMS
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    return {
      success: true,
      message: 'Notification sent successfully',
      messageId: result.sid
    };
    
  } catch (error) {
    console.error('❌ Notification SMS failed:', error);
    return {
      success: false,
      error: 'Failed to send notification'
    };
  }
};

/**
 * Send promotional SMS
 * @param {string} phone - Phone number
 * @param {Object} promoData - Promotion information
 * @returns {Object} - Success status and message
 */
const sendPromoSMS = async (phone, promoData) => {
  try {
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    
    const message = `🌱 Eco Ride Special Offer!\n\n${promoData.title}\n${promoData.description}\n\nCode: ${promoData.code}\nValid till: ${promoData.validTill}\n\nBook now and save the planet! 🌍`;
    
    // Development mode
    if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_ACCOUNT_SID) {
      console.log(`📱 Promo SMS to ${formattedPhone}: ${message}`);
      return {
        success: true,
        message: 'Promotional SMS sent successfully (development mode)'
      };
    }
    
    // Production
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    return {
      success: true,
      message: 'Promotional SMS sent successfully',
      messageId: result.sid
    };
    
  } catch (error) {
    console.error('❌ Promotional SMS failed:', error);
    return {
      success: false,
      error: 'Failed to send promotional SMS'
    };
  }
};

/**
 * Verify phone number format
 * @param {string} phone - Phone number to verify
 * @returns {Object} - Validation result
 */
const validatePhoneNumber = (phone) => {
  // Remove any spaces, dashes, or brackets
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if it's a valid Indian mobile number
  const indianMobileRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
  
  if (!indianMobileRegex.test(cleanPhone)) {
    return {
      valid: false,
      error: 'Invalid Indian mobile number format'
    };
  }
  
  // Extract 10-digit number
  const normalizedPhone = cleanPhone.replace(/^(\+91|91|0)/, '');
  
  return {
    valid: true,
    phone: normalizedPhone,
    international: `+91${normalizedPhone}`
  };
};

/**
 * Get SMS delivery status
 * @param {string} messageId - Twilio message SID
 * @returns {Object} - Delivery status
 */
const getSMSStatus = async (messageId) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        status: 'delivered',
        message: 'Development mode - simulated delivery'
      };
    }
    
    const message = await client.messages(messageId).fetch();
    
    return {
      success: true,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    };
    
  } catch (error) {
    console.error('❌ Failed to get SMS status:', error);
    return {
      success: false,
      error: 'Failed to get delivery status'
    };
  }
};

module.exports = {
  sendOTP,
  sendRideNotification,
  sendPromoSMS,
  validatePhoneNumber,
  getSMSStatus
};