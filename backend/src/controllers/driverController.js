// Path: /backend/src/controllers/driverController.js
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { generateTokens } = require('../utils/jwtHelpers');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { sendRideNotification } = require('../services/smsService');

/**
 * @desc    Register new driver
 * @route   POST /api/drivers/register
 * @access  Public
 */
const registerDriver = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      dateOfBirth,
      gender,
      address,
      licenseNumber,
      licenseExpiry,
      licenseType,
      vehicle
    } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [
        { phone },
        { email },
        { licenseNumber },
        { 'vehicle.licensePlate': vehicle.licensePlate }
      ]
    });

    if (existingDriver) {
      let errorMessage = 'Driver already exists with this ';
      if (existingDriver.phone === phone) errorMessage += 'phone number';
      else if (existingDriver.email === email) errorMessage += 'email';
      else if (existingDriver.licenseNumber === licenseNumber) errorMessage += 'license number';
      else if (existingDriver.vehicle.licensePlate === vehicle.licensePlate) errorMessage += 'vehicle registration';
      
      return res.status(400).json({
        success: false,
        error: errorMessage
      });
    }

    // Validate age (must be 18-70)
    const age = Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18 || age > 70) {
      return res.status(400).json({
        success: false,
        error: 'Driver must be between 18 and 70 years old'
      });
    }

    // Validate license expiry
    if (new Date(licenseExpiry) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Driving license has expired'
      });
    }

    // Validate vehicle registration expiry
    if (new Date(vehicle.registrationExpiry) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle registration has expired'
      });
    }

    // Create new driver
    const newDriver = new Driver({
      name: name.trim(),
      phone,
      email: email?.trim().toLowerCase(),
      password,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      address,
      licenseNumber: licenseNumber.toUpperCase(),
      licenseExpiry: new Date(licenseExpiry),
      licenseType,
      vehicle: {
        ...vehicle,
        licensePlate: vehicle.licensePlate.toUpperCase(),
        registrationExpiry: new Date(vehicle.registrationExpiry),
        insuranceExpiry: new Date(vehicle.insuranceExpiry)
      },
      verificationStatus: 'pending',
      isPhoneVerified: false // Will be verified later via OTP
    });

    await newDriver.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newDriver._id);

    // Remove sensitive data from response
    const driverResponse = newDriver.toJSON();

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully. Please complete document verification.',
      data: {
        driver: driverResponse,
        tokens: {
          accessToken,
          refreshToken
        },
        nextSteps: [
          'Upload required documents',
          'Complete profile verification',
          'Wait for admin approval'
        ]
      }
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} is already registered`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Driver login
 * @route   POST /api/drivers/login
 * @access  Public
 */
const loginDriver = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find driver by phone
    const driver = await Driver.findOne({ phone }).select('+password');
    
    if (!driver) {
      return res.status(401).json({
        success: false,
        error: 'Invalid phone number or password'
      });
    }

    // Check password
    const isPasswordMatch = await driver.comparePassword(password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid phone number or password'
      });
    }

    // Check if driver account is active
    if (!driver.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(driver._id);

    // Update last login
    driver.lastLogin = new Date();
    await driver.save();

    // Remove sensitive data
    const driverResponse = driver.toJSON();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        driver: driverResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get driver profile
 * @route   GET /api/drivers/profile
 * @access  Private
 */
const getDriverProfile = async (req, res) => {
  try {
    const driverId = req.user.id;

    const driver = await Driver.findById(driverId)
      .populate('currentRideId', 'rideId status pickup destination')
      .select('-password');

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Calculate additional stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRides = await Ride.countDocuments({
      'driverInfo.driverId': driverId,
      status: 'completed',
      completedAt: { $gte: todayStart }
    });

    const profileData = {
      ...driver.toJSON(),
      todayStats: {
        ridesCompleted: todayRides,
        hoursOnline: calculateOnlineHours(driver),
        earnings: driver.earnings.today
      }
    };

    res.status(200).json({
      success: true,
      data: {
        profile: profileData
      }
    });

  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Update driver profile
 * @route   PUT /api/drivers/profile
 * @access  Private
 */
const updateDriverProfile = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { name, email, address, workingHours, emergencyContact, settings } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Update fields if provided
    if (name) driver.name = name.trim();
    if (email) driver.email = email.trim().toLowerCase();
    if (address) driver.address = { ...driver.address, ...address };
    if (workingHours) driver.workingHours = { ...driver.workingHours, ...workingHours };
    if (emergencyContact) driver.emergencyContact = { ...driver.emergencyContact, ...emergencyContact };
    if (settings) {
      driver.settings = {
        ...driver.settings,
        ...settings,
        notifications: { ...driver.settings.notifications, ...settings.notifications }
      };
    }

    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: driver.toJSON()
      }
    });

  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Update driver location
 * @route   PUT /api/drivers/location
 * @access  Private
 */
const updateDriverLocation = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { latitude, longitude, address } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Update location
    driver.updateLocation(latitude, longitude, address);
    await driver.save();

    // Emit location update via Socket.io
    if (req.io && driver.isOnline) {
      req.io.emit('driver:location-update', {
        driverId: driver._id,
        location: {
          latitude,
          longitude,
          address
        },
        vehicleType: driver.vehicle.vehicleType,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: driver.currentLocation
      }
    });

  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Toggle driver availability
 * @route   PUT /api/drivers/availability
 * @access  Private
 */
const toggleDriverAvailability = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { isOnline, isAvailable } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Check if driver can go online
    if (isOnline && driver.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Driver verification pending. Cannot go online until approved.'
      });
    }

    // Update availability
    driver.isOnline = isOnline;
    if (isAvailable !== undefined) {
      driver.isAvailable = isAvailable;
    }

    // If going offline, set unavailable
    if (!isOnline) {
      driver.isAvailable = false;
    }

    await driver.save();

    // Emit availability change via Socket.io
    if (req.io) {
      req.io.emit('driver:availability-change', {
        driverId: driver._id,
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable,
        location: driver.currentLocation,
        vehicleType: driver.vehicle.vehicleType
      });
    }

    res.status(200).json({
      success: true,
      message: `Driver is now ${isOnline ? 'online' : 'offline'}`,
      data: {
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable
      }
    });

  } catch (error) {
    console.error('Toggle driver availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get driver statistics
 * @route   GET /api/drivers/stats
 * @access  Private
 */
const getDriverStats = async (req, res) => {
  try {
    const driverId = req.user.id;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Get additional stats from rides
    const rideStats = await Ride.aggregate([
      { $match: { 'driverInfo.driverId': driver._id } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          completedRides: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledRides: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalDistance: { $sum: '$actualDistance' },
          averageRating: { $avg: '$driverRating.rating' }
        }
      }
    ]);

    const stats = rideStats[0] || {};

    // Calculate completion and acceptance rates
    const completionRate = stats.totalRides > 0 ? 
      Math.round((stats.completedRides / stats.totalRides) * 100) : 100;
    
    const cancellationRate = stats.totalRides > 0 ? 
      Math.round((stats.cancelledRides / stats.totalRides) * 100) : 0;

    // Get today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRides = await Ride.countDocuments({
      'driverInfo.driverId': driverId,
      status: 'completed',
      completedAt: { $gte: todayStart }
    });

    const driverStats = {
      overall: {
        totalRides: stats.totalRides || 0,
        completedRides: stats.completedRides || 0,
        totalDistance: Math.round(stats.totalDistance || 0),
        averageRating: stats.averageRating ? parseFloat(stats.averageRating.toFixed(2)) : 5.0,
        completionRate,
        cancellationRate,
        acceptanceRate: driver.stats.acceptanceRate
      },
      today: {
        ridesCompleted: todayRides,
        earnings: driver.earnings.today,
        hoursOnline: calculateOnlineHours(driver)
      },
      earnings: driver.earnings,
      rating: driver.rating
    };

    res.status(200).json({
      success: true,
      data: {
        stats: driverStats
      }
    });

  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get driver earnings
 * @route   GET /api/drivers/earnings
 * @access  Private
 */
const getDriverEarnings = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { period = 'all' } = req.query;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    let dateFilter = {};
    const today = new Date();

    switch (period) {
      case 'today':
        dateFilter = {
          $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        };
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        dateFilter = { $gte: weekStart };
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFilter = { $gte: monthStart };
        break;
    }

    // Get detailed earnings from rides
    const earningsData = await Ride.aggregate([
      {
        $match: {
          'driverInfo.driverId': driver._id,
          status: 'completed',
          ...(period !== 'all' && { completedAt: dateFilter })
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$fareBreakdown.total' },
          totalRides: { $sum: 1 },
          averageFare: { $avg: '$fareBreakdown.total' },
          totalDistance: { $sum: '$actualDistance' }
        }
      }
    ]);

    const earnings = earningsData[0] || {
      totalEarnings: 0,
      totalRides: 0,
      averageFare: 0,
      totalDistance: 0
    };

    res.status(200).json({
      success: true,
      data: {
        period,
        earnings: {
          total: earnings.totalEarnings,
          ridesCompleted: earnings.totalRides,
          averageFarePerRide: Math.round(earnings.averageFare || 0),
          totalDistance: Math.round(earnings.totalDistance || 0),
          earningsPerKm: earnings.totalDistance > 0 ? 
            Math.round(earnings.totalEarnings / earnings.totalDistance) : 0
        },
        driverEarnings: driver.earnings
      }
    });

  } catch (error) {
    console.error('Get driver earnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Update driver vehicle information
 * @route   PUT /api/drivers/vehicle
 * @access  Private
 */
const updateDriverVehicle = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { batteryCapacity, range, chargingType } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Update vehicle information
    if (batteryCapacity) driver.vehicle.batteryCapacity = batteryCapacity;
    if (range) driver.vehicle.range = range;
    if (chargingType) driver.vehicle.chargingType = chargingType;

    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle information updated successfully',
      data: {
        vehicle: driver.vehicle
      }
    });

  } catch (error) {
    console.error('Update driver vehicle error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Upload driver documents
 * @route   POST /api/drivers/documents
 * @access  Private
 */
const uploadDriverDocuments = async (req, res) => {
  try {
    const driverId = req.user.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload at least one document'
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      const uploadResult = await uploadToCloudinary(file.buffer, {
        folder: 'eco-ride/driver-documents',
        public_id: `driver_${driverId}_${file.fieldname}_${Date.now()}`,
        resource_type: 'auto'
      });

      return {
        type: file.fieldname, // 'driving_license', 'vehicle_registration', etc.
        imageUrl: uploadResult.secure_url,
        isVerified: false,
        uploadedAt: new Date()
      };
    });

    const uploadedDocuments = await Promise.all(uploadPromises);

    // Add documents to driver
    uploadedDocuments.forEach(doc => {
      // Remove existing document of same type
      driver.documents = driver.documents.filter(d => d.type !== doc.type);
      // Add new document
      driver.documents.push(doc);
    });

    // Update verification status to 'in_review' if all required documents uploaded
    const requiredDocs = ['driving_license', 'vehicle_registration', 'insurance', 'aadhar'];
    const uploadedDocTypes = driver.documents.map(d => d.type);
    const hasAllRequiredDocs = requiredDocs.every(type => uploadedDocTypes.includes(type));

    if (hasAllRequiredDocs && driver.verificationStatus === 'pending') {
      driver.verificationStatus = 'in_review';
    }

    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        uploadedDocuments: uploadedDocuments.length,
        verificationStatus: driver.verificationStatus,
        documents: driver.documents.map(doc => ({
          type: doc.type,
          isVerified: doc.isVerified,
          uploadedAt: doc.uploadedAt || doc.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Upload driver documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get nearby ride requests
 * @route   GET /api/drivers/rides/nearby
 * @access  Private
 */
const getNearbyRides = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { radius = 5 } = req.query; // Default 5km radius

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Check if driver can accept rides
    if (!driver.canAcceptRide()) {
      return res.status(403).json({
        success: false,
        error: 'Driver not available for rides'
      });
    }

    if (!driver.currentLocation || !driver.currentLocation.coordinates) {
      return res.status(400).json({
        success: false,
        error: 'Driver location not available'
      });
    }

    // Find nearby ride requests
    const nearbyRides = await Ride.find({
      status: { $in: ['requested', 'searching'] },
      vehicleType: driver.vehicle.vehicleType,
      'pickup.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              driver.currentLocation.coordinates.longitude,
              driver.currentLocation.coordinates.latitude
            ]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    })
    .populate('userId', 'name phone rating')
    .sort({ requestedAt: 1 }) // Oldest first
    .limit(10);

    // Calculate distance and ETA for each ride
    const ridesWithDistance = nearbyRides.map(ride => {
      const distance = calculateDistance(
        driver.currentLocation.coordinates,
        ride.pickup.coordinates
      );
      
      return {
        ...ride.toJSON(),
        distanceToPickup: Math.round(distance * 100) / 100, // Round to 2 decimal places
        estimatedArrival: Math.round(distance * 3) // 3 minutes per km
      };
    });

    res.status(200).json({
      success: true,
      data: {
        rides: ridesWithDistance,
        driverLocation: driver.currentLocation,
        searchRadius: radius
      }
    });

  } catch (error) {
    console.error('Get nearby rides error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Accept a ride request
 * @route   POST /api/drivers/rides/:rideId/accept
 * @access  Private
 */
const acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user.id;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Check if driver can accept rides
    if (!driver.canAcceptRide()) {
      return res.status(403).json({
        success: false,
        error: 'Driver not available for rides'
      });
    }

    // Find the ride
    const ride = await Ride.findOne({ rideId, status: { $in: ['requested', 'searching'] } })
      .populate('userId', 'name phone');

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found or already assigned'
      });
    }

    // Check vehicle type match
    if (ride.vehicleType !== driver.vehicle.vehicleType) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle type mismatch'
      });
    }

    // Assign driver to ride
    ride.status = 'driver_assigned';
    ride.driverInfo = {
      driverId: driver._id,
      name: driver.name,
      phone: driver.phone,
      rating: driver.rating.average,
      vehicleDetails: {
        make: driver.vehicle.make,
        model: driver.vehicle.model,
        color: driver.vehicle.color,
        licensePlate: driver.vehicle.licensePlate,
        batteryLevel: 85 // Mock battery level
      }
    };

    // Calculate ETA
    const distance = calculateDistance(
      driver.currentLocation.coordinates,
      ride.pickup.coordinates
    );
    const eta = Math.round(distance * 3); // 3 minutes per km
    ride.tracking.estimatedArrival = new Date(Date.now() + eta * 60 * 1000);

    await ride.save();

    // Update driver status
    driver.isAvailable = false;
    driver.currentRideId = ride._id;
    await driver.save();

    // Send notification to user
    await sendRideNotification(ride.userId.phone, {
      type: 'ride_confirmed',
      driverName: driver.name,
      vehicleDetails: `${driver.vehicle.color} ${driver.vehicle.make} ${driver.vehicle.model}`,
      eta: eta
    });

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`ride-${rideId}`).emit('ride:driver-assigned', {
        driverInfo: ride.driverInfo,
        eta: eta,
        status: 'driver_assigned'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully',
      data: {
        ride: ride.toJSON(),
        eta: eta
      }
    });

  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Start a ride
 * @route   POST /api/drivers/rides/:rideId/start
 * @access  Private
 */
const startRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user.id;

    const ride = await Ride.findOne({ 
      rideId, 
      'driverInfo.driverId': driverId,
      status: { $in: ['driver_assigned', 'driver_arriving', 'driver_arrived'] }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found or not assigned to you'
      });
    }

    // Update ride status
    ride.updateStatus('in_progress');
    ride.tracking.rideStarted = new Date();
    await ride.save();

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`ride-${rideId}`).emit('ride:started', {
        rideId,
        startTime: ride.tracking.rideStarted,
        status: 'in_progress'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride started successfully',
      data: {
        rideId: ride.rideId,
        startTime: ride.tracking.rideStarted,
        status: ride.status
      }
    });

  } catch (error) {
    console.error('Start ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Complete a ride
 * @route   POST /api/drivers/rides/:rideId/complete
 * @access  Private
 */
const completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { actualDistance, actualDuration } = req.body;
    const driverId = req.user.id;

    const ride = await Ride.findOne({ 
      rideId, 
      'driverInfo.driverId': driverId,
      status: 'in_progress'
    }).populate('userId', 'name phone');

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found or not in progress'
      });
    }

    const driver = await Driver.findById(driverId);
    
    // Update ride details
    if (actualDistance) ride.actualDistance = actualDistance;
    if (actualDuration) ride.actualDuration = actualDuration;
    
    // Calculate duration if not provided
    if (!ride.actualDuration && ride.tracking.rideStarted) {
      ride.actualDuration = Math.round((new Date() - ride.tracking.rideStarted) / (1000 * 60));
    }

    ride.updateStatus('completed');
    await ride.save();

    // Update driver stats and earnings
    const fareAmount = ride.fareBreakdown.total;
    const driverEarnings = Math.round(fareAmount * 0.8); // 80% to driver, 20% commission

    driver.updateEarnings(driverEarnings);
    driver.stats.totalRides += 1;
    driver.stats.completedRides += 1;
    driver.stats.totalDistance += ride.actualDistance || ride.estimatedDistance;
    
    // Reset driver availability
    driver.isAvailable = true;
    driver.currentRideId = null;
    
    await driver.save();

    // Update user eco stats
    const user = await User.findById(ride.userId._id);
    if (user) {
      user.updateEcoStats({
        co2Saved: ride.ecoImpact.co2Saved,
        distance: ride.actualDistance || ride.estimatedDistance
      });
      
      if (ride.isSubscriptionRide) {
        user.updateSubscriptionUsage(ride.actualDistance || ride.estimatedDistance);
      }
      
      await user.save();
    }

    // Send completion notification
    await sendRideNotification(ride.userId.phone, {
      type: 'ride_completed',
      distance: ride.actualDistance || ride.estimatedDistance,
      fare: fareAmount,
      co2Saved: ride.ecoImpact.co2Saved
    });

    // Emit Socket.io event
    if (req.io) {
      req.io.to(`ride-${rideId}`).emit('ride:completed', {
        rideId,
        completedAt: ride.completedAt,
        earnings: driverEarnings,
        ecoImpact: ride.ecoImpact
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride completed successfully',
      data: {
        ride: ride.toJSON(),
        driverEarnings: driverEarnings,
        totalEarnings: driver.earnings.total
      }
    });

  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get driver ride history
 * @route   GET /api/drivers/rides/history
 * @access  Private
 */
const getDriverRideHistory = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { page = 1, limit = 20, status = 'all' } = req.query;

    let statusFilter = {};
    if (status !== 'all') {
      statusFilter.status = status;
    }

    const rides = await Ride.find({
      'driverInfo.driverId': driverId,
      ...statusFilter
    })
    .populate('userId', 'name phone rating')
    .sort({ requestedAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const totalRides = await Ride.countDocuments({
      'driverInfo.driverId': driverId,
      ...statusFilter
    });

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
    console.error('Get driver ride history error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

// Helper functions
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
};

const toRad = (deg) => {
  return deg * (Math.PI/180);
};

const calculateOnlineHours = (driver) => {
  // Mock calculation - in real app, track online/offline timestamps
  return Math.round(Math.random() * 8); // 0-8 hours
};

module.exports = {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile,
  updateDriverLocation,
  toggleDriverAvailability,
  getDriverStats,
  getDriverEarnings,
  updateDriverVehicle,
  uploadDriverDocuments,
  getNearbyRides,
  acceptRide,
  startRide,
  completeRide,
  getDriverRideHistory
};