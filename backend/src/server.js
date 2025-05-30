// Path: /backend/src/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const driverRoutes = require('./routes/drivers');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-ride';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB connected successfully to: ${mongoose.connection.name}`);
    
    // Set up database event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 New client connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', (data) => {
    const { userId, userType } = data; // userType: 'rider' or 'driver'
    socket.userId = userId;
    socket.userType = userType;
    socket.join(`${userType}-${userId}`);
    console.log(`🔐 ${userType} authenticated:`, userId);
  });

  // Driver-specific events
  socket.on('driver:join', (data) => {
    const { driverId, location, vehicleType } = data;
    socket.join(`driver-${driverId}`);
    socket.join(`drivers-${vehicleType}`); // Join vehicle type room
    socket.driverData = { driverId, location, vehicleType };
    console.log(`🚗 Driver ${driverId} joined (${vehicleType})`);
    
    // Broadcast driver availability to nearby users
    socket.broadcast.emit('driver:available', {
      driverId,
      location,
      vehicleType
    });
  });

  // Driver location updates
  socket.on('driver:location', (data) => {
    const { driverId, location, isAvailable } = data;
    
    // Update driver data
    if (socket.driverData) {
      socket.driverData.location = location;
    }
    
    // Broadcast location to users in ride rooms
    socket.broadcast.emit('driver:location-update', {
      driverId,
      location,
      isAvailable,
      timestamp: new Date()
    });
  });

  // Ride-specific events
  socket.on('ride:join', (data) => {
    const { rideId, userId } = data;
    socket.join(`ride-${rideId}`);
    socket.rideId = rideId;
    console.log(`🚙 User ${userId} joined ride ${rideId}`);
  });

  // Ride status updates
  socket.on('ride:status', (data) => {
    const { rideId, status, location, message } = data;
    
    io.to(`ride-${rideId}`).emit('ride:status-update', {
      status,
      location,
      message,
      timestamp: new Date()
    });
    
    console.log(`📍 Ride ${rideId} status updated to: ${status}`);
  });

  // Emergency SOS
  socket.on('ride:sos', (data) => {
    const { rideId, location, userId } = data;
    
    // Alert all relevant parties
    io.to(`ride-${rideId}`).emit('ride:emergency', {
      rideId,
      location,
      userId,
      timestamp: new Date()
    });
    
    console.log(`🚨 SOS activated for ride ${rideId}`);
  });

  // Driver accepts ride
  socket.on('driver:accept-ride', (data) => {
    const { rideId, driverId, eta } = data;
    
    io.to(`ride-${rideId}`).emit('ride:driver-assigned', {
      driverId,
      eta,
      timestamp: new Date()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.driverData) {
      // Notify about driver going offline
      socket.broadcast.emit('driver:offline', {
        driverId: socket.driverData.driverId
      });
    }
    console.log('👋 Client disconnected:', socket.id);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/rides', authenticateToken, rideRoutes);
app.use('/api/subscriptions', authenticateToken, subscriptionRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/drivers', driverRoutes); // Drivers have their own auth in routes

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    message: '🌱 Eco Ride API Server',
    version: '1.0.0',
    status: 'Running',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      rides: '/api/rides',
      subscriptions: '/api/subscriptions',
      payments: '/api/payments',
      drivers: '/api/drivers'
    },
    documentation: {
      auth: {
        'POST /api/auth/send-otp': 'Send OTP for phone verification',
        'POST /api/auth/verify-otp': 'Verify OTP and login/register',
        'POST /api/auth/refresh-token': 'Refresh access token',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/me': 'Get current user profile'
      },
      rides: {
        'POST /api/rides/estimate': 'Get fare estimate',
        'POST /api/rides/book': 'Book a new ride',
        'GET /api/rides/history': 'Get ride history',
        'GET /api/rides/:rideId/track': 'Track active ride'
      },
      subscriptions: {
        'GET /api/subscriptions/plans': 'Get available subscription plans',
        'GET /api/subscriptions/current': 'Get current subscription',
        'POST /api/subscriptions/subscribe': 'Subscribe to a plan'
      }
    }
  });
});

// Handle 404 for API routes
app.use('/api/*', notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle 404 for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/send-otp',
      'POST /api/auth/verify-otp',
      'GET /api/users/profile',
      'POST /api/rides/book'
    ]
  });
});

const PORT = process.env.PORT || 3000;

// Graceful startup
const startServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log('🚀 ========================================');
      console.log(`🌱 Eco Ride Server Started Successfully`);
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
      console.log(`🔗 Socket.IO ready for real-time connections`);
      console.log(`📋 API Documentation: http://localhost:${PORT}/`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
      console.log('🚀 ========================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    console.log('🔌 HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('💾 Database connection closed');
      console.log('👋 Eco Ride Server shut down successfully');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

module.exports = { app, io, server };