// Path: /backend/src/controllers/userController.js
const User = require('../models/user');
const Ride = require('../models/ride');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('referredBy', 'name phone')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    const { name, email, language } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields if provided
    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (language) user.language = language;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email is already registered'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Upload profile picture
 * @route   POST /api/users/profile/picture
 * @access  Private
 */
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image file'
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Upload to Cloudinary (implement this service)
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'eco-ride/profiles',
      public_id: `user_${userId}`,
      overwrite: true,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    user.profilePicture = uploadResult.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user addresses
 * @route   GET /api/users/addresses
 * @access  Private
 */
const getUserAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('addresses');

    res.status(200).json({
      success: true,
      data: {
        addresses: user.addresses || []
      }
    });

  } catch (error) {
    console.error('Get user addresses error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Add new address
 * @route   POST /api/users/addresses
 * @access  Private
 */
const addUserAddress = async (req, res) => {
  try {
    const { type, label, address, coordinates } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user already has 5 addresses (limit)
    if (user.addresses.length >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 5 addresses allowed'
      });
    }

    const newAddress = {
      type,
      label: label.trim(),
      address: address.trim(),
      coordinates,
      isDefault: user.addresses.length === 0 // First address is default
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: {
        address: newAddress
      }
    });

  } catch (error) {
    console.error('Add user address error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/users/addresses/:addressId
 * @access  Private
 */
const updateUserAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { type, label, address, coordinates, isDefault } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const addressToUpdate = user.addresses.id(addressId);
    if (!addressToUpdate) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }

    // Update fields
    if (type) addressToUpdate.type = type;
    if (label) addressToUpdate.label = label.trim();
    if (address) addressToUpdate.address = address.trim();
    if (coordinates) addressToUpdate.coordinates = coordinates;

    // Handle default address
    if (isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = addr._id.toString() === addressId;
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: {
        address: addressToUpdate
      }
    });

  } catch (error) {
    console.error('Update user address error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private
 */
const deleteUserAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const addressToDelete = user.addresses.id(addressId);
    if (!addressToDelete) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }

    const wasDefault = addressToDelete.isDefault;
    user.addresses.pull(addressId);

    // If deleted address was default, make first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Delete user address error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user payment methods
 * @route   GET /api/users/payment-methods
 * @access  Private
 */
const getUserPaymentMethods = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('paymentMethods');

    // Filter out sensitive data
    const paymentMethods = user.paymentMethods.map(method => ({
      _id: method._id,
      type: method.type,
      details: {
        ...method.details,
        token: undefined // Remove token for security
      },
      isDefault: method.isDefault,
      isActive: method.isActive
    }));

    res.status(200).json({
      success: true,
      data: {
        paymentMethods
      }
    });

  } catch (error) {
    console.error('Get user payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Add payment method
 * @route   POST /api/users/payment-methods
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
    if (type === 'card' && (!details.last4 || !details.brand)) {
      return res.status(400).json({
        success: false,
        error: 'Card details are incomplete'
      });
    }

    if (type === 'upi' && !details.upiId) {
      return res.status(400).json({
        success: false,
        error: 'UPI ID is required'
      });
    }

    const newPaymentMethod = {
      type,
      details,
      isDefault: user.paymentMethods.length === 0, // First payment method is default
      isActive: true
    };

    user.paymentMethods.push(newPaymentMethod);
    await user.save();

    // Remove sensitive data before sending response
    const responseMethod = {
      _id: newPaymentMethod._id,
      type: newPaymentMethod.type,
      details: {
        ...newPaymentMethod.details,
        token: undefined
      },
      isDefault: newPaymentMethod.isDefault,
      isActive: newPaymentMethod.isActive
    };

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: {
        paymentMethod: responseMethod
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
 * @desc    Update payment method
 * @route   PUT /api/users/payment-methods/:methodId
 * @access  Private
 */
const updatePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const { isDefault } = req.body;
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

    // Handle default payment method
    if (isDefault) {
      user.paymentMethods.forEach(method => {
        method.isDefault = method._id.toString() === methodId;
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment method updated successfully'
    });

  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Delete payment method
 * @route   DELETE /api/users/payment-methods/:methodId
 * @access  Private
 */
const deletePaymentMethod = async (req, res) => {
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
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user ride history
 * @route   GET /api/users/ride-history
 * @access  Private
 */
const getUserRideHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const rides = await Ride.getUserRideHistory(
      userId,
      parseInt(limit),
      (parseInt(page) - 1) * parseInt(limit)
    );

    const totalRides = await Ride.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        rides,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRides / parseInt(limit)),
          total: totalRides,
          hasMore: totalRides > parseInt(page) * parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user ride history error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user eco statistics
 * @route   GET /api/users/eco-stats
 * @access  Private
 */
const getUserEcoStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('ecoStats');
    const ecoStatsFromRides = await Ride.getEcoStatsForUser(userId);

    const combinedStats = {
      ...user.ecoStats.toObject(),
      ...ecoStatsFromRides[0] || {}
    };

    res.status(200).json({
      success: true,
      data: {
        ecoStats: combinedStats
      }
    });

  } catch (error) {
    console.error('Get user eco stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Update user preferences
 * @route   PUT /api/users/preferences
 * @access  Private
 */
const updateUserPreferences = async (req, res) => {
  try {
    const { notifications, theme, language } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update preferences
    if (notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...notifications };
    }
    if (theme) user.settings.theme = theme;
    if (language) user.language = language;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        settings: user.settings,
        language: user.language
      }
    });

  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Add referral code
 * @route   POST /api/users/referral
 * @access  Private
 */
const addReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.referredBy) {
      return res.status(400).json({
        success: false,
        error: 'You have already used a referral code'
      });
    }

    // Find referrer
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code'
      });
    }

    if (referrer._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot use your own referral code'
      });
    }

    // Add referral
    user.referredBy = referrer._id;
    user.referralCredits += 5; // 5km free ride credit

    referrer.referrals.push({
      userId: user._id,
      dateReferred: new Date(),
      rewardClaimed: false
    });
    referrer.referralCredits += 5; // Referrer also gets 5km credit

    await user.save();
    await referrer.save();

    res.status(200).json({
      success: true,
      message: 'Referral code applied successfully! You received 5km of free rides.',
      data: {
        referralCredits: user.referralCredits
      }
    });

  } catch (error) {
    console.error('Add referral error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get referral statistics
 * @route   GET /api/users/referral/stats
 * @access  Private
 */
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('referrals.userId', 'name phone')
      .select('referralCode referrals referralCredits');

    const stats = {
      referralCode: user.referralCode,
      totalReferrals: user.referrals.length,
      referralCredits: user.referralCredits,
      referrals: user.referrals.map(ref => ({
        user: ref.userId,
        dateReferred: ref.dateReferred,
        rewardClaimed: ref.rewardClaimed
      }))
    };

    res.status(200).json({
      success: true,
      data: {
        referralStats: stats
      }
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/users/notifications
 * @access  Private
 */
const getUserNotifications = async (req, res) => {
  try {
    // For now, return mock notifications
    // In production, you'd have a Notification model
    const notifications = [];

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: 0
      }
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/users/notifications/:notificationId/read
 * @access  Private
 */
const markNotificationAsRead = async (req, res) => {
  try {
    // Implementation would depend on Notification model
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
const deleteUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Soft delete - mark as inactive
    user.isActive = false;
    await user.save();

    // Log deletion reason for analytics
    console.log(`User ${userId} deleted account. Reason: ${reason || 'Not provided'}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getUserAddresses,
  addPaymentMethod,
  getUserPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
  getUserRideHistory,
  getUserEcoStats,
  updateUserPreferences,
  addReferral,
  getReferralStats,
  uploadProfilePicture,
  deleteUser,
  getUserNotifications,
  markNotificationAsRead
};