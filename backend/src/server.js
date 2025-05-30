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
const userRoutes = require('./routes/users'); // Ensure this path is correct
const rideRoutes = require('./routes/rides'); // Uncomment this
//const subscriptionRoutes = require('./routes/subscriptions');
//const paymentRoutes = require('./routes/payments');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-ride', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join driver to location-based room
  socket.on('driver:join', (data) => {
    const { driverId, location } = data;
    socket.join(`driver-${driverId}`);
    socket.driverData = { driverId, location };
    console.log(`🚗 Driver ${driverId} joined`);
  });

  // Join user to ride room
  socket.on('user:join', (data) => {
    const { userId, rideId } = data;
    socket.join(`ride-${rideId}`);
    socket.userData = { userId, rideId };
    console.log(`👤 User ${userId} joined ride ${rideId}`);
  });

  // Handle driver location updates
  socket.on('driver:location', (data) => {
    const { driverId, location } = data;
    // Broadcast to all users in nearby area
    socket.broadcast.emit('driver:location-update', {
      driverId,
      location,
      timestamp: new Date()
    });
  });

  // Handle ride status updates
  socket.on('ride:status', (data) => {
    const { rideId, status, location } = data;
    io.to(`ride-${rideId}`).emit('ride:status-update', {
      status,
      location,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
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
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/rides', authenticateToken, rideRoutes); // This should work now
//app.use('/api/subscriptions', authenticateToken, subscriptionRoutes);
//app.use('/api/payments', authenticateToken, paymentRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🌱 Eco Ride API Server',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      rides: '/api/rides',
      subscriptions: '/api/subscriptions',
      payments: '/api/payments'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Eco Ride Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };