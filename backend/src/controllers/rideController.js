const Ride = require('../models/ride');
const User = require('../models/user');
const { sendRideNotification } = require('../services/smsService');

/**
 * @desc    Get fare estimate for a ride
 * @route   POST /api/rides/estimate
 * @access  Private
 */
const getFareEstimate = async (req, res) => {
  try {
    const { pickup, destination, vehicleType } = req.body;

    // Validate input
    if (!pickup || !destination || !vehicleType) {
      return res.status(400).json({
        success: false,
        error: 'Pickup location, destination, and vehicle type are required'
      });
    }

    if (!['bike', 'car'].includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle type must be either "bike" or "car"'
      });
    }

    // Calculate distance (mock calculation - in real app use Google Distance Matrix API)
    const distance = calculateDistance(pickup.coordinates, destination.coordinates);
    const duration = Math.round(distance * 3); // 3 mins per km estimate

    // Calculate fare based on vehicle type
    let fareBreakdown;
    if (vehicleType === 'bike') {
      const baseFare = 15;
      const additionalDistance = Math.max(0, distance - 1);
      const distanceFare = additionalDistance * 6;
      
      fareBreakdown = {
        baseFare: baseFare,
        distanceFare: distanceFare,
        timeFare: 0,
        surgePricing: 0,
        discount: 0,
        subscriptionDiscount: 0,
        taxes: 0,
        tip: 0,
        total: baseFare + distanceFare
      };
    } else { // car
      const baseFare = 30;
      const additionalDistance = Math.max(0, distance - 2);
      const distanceFare = additionalDistance * 15;
      
      fareBreakdown = {
        baseFare: baseFare,
        distanceFare: distanceFare,
        timeFare: 0,
        surgePricing: 0,
        discount: 0,
        subscriptionDiscount: 0,
        taxes: 0,
        tip: 0,
        total: baseFare + distanceFare
      };
    }

    // Check user subscription for discount
    const user = await User.findById(req.user.id);
    if (user.subscription && 
        user.subscription.status === 'active' && 
        user.subscription.planType === vehicleType &&
        user.subscription.remainingKm > 0) {
      
      fareBreakdown.subscriptionDiscount = fareBreakdown.total;
      fareBreakdown.total = 0;
    }

    // Calculate environmental impact
    const fuelSaved = distance / 15; // 15 km/liter average
    const co2Saved = fuelSaved * 2.31; // 2.31 kg CO2 per liter
    const treesEquivalent = co2Saved / 21.77;

    const ecoImpact = {
      co2Saved: parseFloat(co2Saved.toFixed(2)),
      treesEquivalent: parseFloat(treesEquivalent.toFixed(4)),
      fuelSaved: parseFloat(fuelSaved.toFixed(2))
    };

    res.status(200).json({
      success: true,
      data: {
        distance: parseFloat(distance.toFixed(2)),
        duration,
        fareBreakdown,
        ecoImpact,
        vehicleType,
        isSubscriptionRide: fareBreakdown.subscriptionDiscount > 0
      }
    });

  } catch (error) {
    console.error('Get fare estimate error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Book a new ride
 * @route   POST /api/rides/book
 * @access  Private
 */
const bookRide = async (req, res) => {
  try {
    const { pickup, destination, vehicleType, specialRequests } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!pickup || !destination || !vehicleType) {
      return res.status(400).json({
        success: false,
        error: 'Pickup location, destination, and vehicle type are required'
      });
    }

    // Check if user has an active ride
    const activeRide = await Ride.findActiveRideForUser(userId);
    if (activeRide) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active ride'
      });
    }

    // Calculate fare and distance
    const distance = calculateDistance(pickup.coordinates, destination.coordinates);
    const duration = Math.round(distance * 3);

    // Create new ride
    const ride = new Ride({
      userId,
      pickup: {
        address: pickup.address,
        coordinates: pickup.coordinates,
        placeId: pickup.placeId
      },
      destination: {
        address: destination.address,
        coordinates: destination.coordinates,
        placeId: destination.placeId
      },
      vehicleType,
      estimatedDistance: distance,
      estimatedDuration: duration,
      specialRequests: specialRequests || [],
      status: 'requested'
    });

    // Calculate fare
    ride.calculateFare();

    // Check subscription
    const user = await User.findById(userId);
    if (user.subscription && 
        user.subscription.status === 'active' && 
        user.subscription.planType === vehicleType &&
        user.subscription.remainingKm > 0) {
      
      ride.isSubscriptionRide = true;
      ride.serviceType = 'subscription';
    }

    await ride.save();

    // Emit socket event for driver matching
    if (req.io) {
      req.io.emit('new-ride-request', {
        rideId: ride.rideId,
        pickup: ride.pickup,
        vehicleType: ride.vehicleType,
        fareAmount: ride.fareBreakdown.total
      });
    }

    // Mock driver assignment (in real app, this would be handled by a matching algorithm)
    setTimeout(async () => {
      try {
        const mockDriver = {
          driverId: '507f1f77bcf86cd799439011', // Mock ObjectId
          name: 'Rajesh Kumar',
          phone: '+919876543210',
          rating: 4.8,
          vehicleDetails: {
            make: vehicleType === 'bike' ? 'TVS' : 'Tata',
            model: vehicleType === 'bike' ? 'iQube' : 'Nexon EV',
            color: vehicleType === 'bike' ? 'Blue' : 'White',
            licensePlate: vehicleType === 'bike' ? 'DL 01 AA 1234' : 'DL 02 BB 5678',
            batteryLevel: 85
          }
        };

        const updatedRide = await Ride.findById(ride._id);
        updatedRide.status = 'driver_assigned';
        updatedRide.driverInfo = mockDriver;
        updatedRide.tracking.estimatedArrival = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        await updatedRide.save();

        // Send notification
        await sendRideNotification(user.phone, {
          type: 'ride_confirmed',
          driverName: mockDriver.name,
          vehicleDetails: `${mockDriver.vehicleDetails.color} ${mockDriver.vehicleDetails.make} ${mockDriver.vehicleDetails.model}`,
          eta: 5
        });

        // Emit socket event
        if (req.io) {
          req.io.to(`ride-${ride.rideId}`).emit('ride:status-update', {
            status: 'driver_assigned',
            driverInfo: mockDriver,
            estimatedArrival: updatedRide.tracking.estimatedArrival
          });
        }
      } catch (error) {
        console.error('Driver assignment error:', error);
      }
    }, 3000); // 3 second delay to simulate driver matching

    res.status(201).json({
      success: true,
      message: 'Ride booked successfully',
      data: {
        ride: ride.toJSON()
      }
    });

  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get ride tracking information
 * @route   GET /api/rides/:rideId/track
 * @access  Private
 */
const trackRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findOne({ rideId, userId });
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ride: ride.toJSON()
      }
    });

  } catch (error) {
    console.error('Track ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Complete a ride
 * @route   PUT /api/rides/:rideId/complete
 * @access  Private
 */
const completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { actualDistance, paymentMethod } = req.body;
    const userId = req.user.id;

    const ride = await Ride.findOne({ rideId, userId });
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    if (ride.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Ride is not in progress'
      });
    }

    // Update ride details
    ride.actualDistance = actualDistance || ride.estimatedDistance;
    ride.actualDuration = Math.round((new Date() - ride.tracking.rideStarted) / (1000 * 60));
    ride.paymentMethod = paymentMethod || 'cash';
    ride.updateStatus('completed');

    await ride.save();

    // Update user eco stats
    const user = await User.findById(userId);
    user.updateEcoStats({
      co2Saved: ride.ecoImpact.co2Saved,
      distance: ride.actualDistance
    });

    // Update subscription usage if applicable
    if (ride.isSubscriptionRide) {
      user.updateSubscriptionUsage(ride.actualDistance);
    }

    await user.save();

    // Send completion notification
    await sendRideNotification(user.phone, {
      type: 'ride_completed',
      distance: ride.actualDistance,
      fare: ride.fareBreakdown.total,
      co2Saved: ride.ecoImpact.co2Saved
    });

    // Emit socket event
    if (req.io) {
      req.io.to(`ride-${rideId}`).emit('ride:completed', {
        ride: ride.toJSON()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride completed successfully',
      data: {
        ride: ride.toJSON()
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
 * @desc    Cancel a ride
 * @route   PUT /api/rides/:rideId/cancel
 * @access  Private
 */
const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const ride = await Ride.findOne({ rideId, userId });
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel this ride'
      });
    }

    // Calculate cancellation fee
    let cancellationFee = 0;
    if (ride.status === 'driver_assigned' || ride.status === 'driver_arriving') {
      cancellationFee = 20; // ₹20 cancellation fee
    }

    ride.status = 'cancelled';
    ride.cancellationReason = reason;
    ride.cancelledBy = 'user';
    ride.cancellationFee = cancellationFee;

    await ride.save();

    // Emit socket event
    if (req.io) {
      req.io.to(`ride-${rideId}`).emit('ride:cancelled', {
        rideId,
        cancelledBy: 'user',
        cancellationFee
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully',
      data: {
        cancellationFee
      }
    });

  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Rate a ride
 * @route   POST /api/rides/:rideId/rate
 * @access  Private
 */
const rateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, feedback, tags } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const ride = await Ride.findOne({ rideId, userId });
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Can only rate completed rides'
      });
    }

    if (ride.userRating && ride.userRating.rating) {
      return res.status(400).json({
        success: false,
        error: 'Ride already rated'
      });
    }

    ride.userRating = {
      rating,
      feedback: feedback || '',
      tags: tags || [],
      ratedAt: new Date()
    };

    await ride.save();

    res.status(200).json({
      success: true,
      message: 'Ride rated successfully'
    });

  } catch (error) {
    console.error('Rate ride error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

/**
 * @desc    Get user's ride history
 * @route   GET /api/rides/history
 * @access  Private
 */
const getRideHistory = async (req, res) => {
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
    console.error('Get ride history error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error. Please try again later.'
    });
  }
};

// Helper function to calculate distance between two coordinates
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

module.exports = {
  getFareEstimate,
  bookRide,
  trackRide,
  completeRide,
  cancelRide,
  rateRide,
  getRideHistory
};