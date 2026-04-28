/**
 * Express App Configuration
 * Sets up middleware, routes, and error handling with WebSocket support
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const ApiResponse = require('../api/response');
const config = require('../config/config');

// Import route factories
const createEventsRoutes = require('../routes/events.routes');
const createVoiceRoutes = require('../routes/voice.routes');
const createStatusRoutes = require('../routes/status.routes');
// mesh routes are a plain router (not a factory), import directly
const meshRoutes = require('../routes/mesh.routes');

function createApp() {
  const app = express();

  // Create HTTP server and attach Socket.IO
  const httpServer = http.createServer(app);

  // Initialize Socket.IO with CORS support for phones on hotspot
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store io instance on app for routes to access
  app.set('io', io);

  // Track devices by deviceId instead of socket.id
  const deviceConnections = new Map();
  const getDeviceCount = () => deviceConnections.size;

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    const deviceId = socket.handshake.query.deviceId || socket.id;
    console.log(`📱 WebSocket client connected: ${socket.id}, Device: ${deviceId}`);

    // Track device connection
    if (!deviceConnections.has(deviceId)) {
      deviceConnections.set(deviceId, new Set());
    }
    deviceConnections.get(deviceId).add(socket.id);

    // Broadcast updated device count to all clients
    io.emit('connectionCountUpdate', { connectedDevices: getDeviceCount() });
    console.log(`📊 Device count updated: ${getDeviceCount()}`);

    // Handle nearby events requests
    socket.on('requestNearbyEvents', (data) => {
      try {
        const services = app.locals.services;
        const eventStore = services && services.eventStore;

        if (eventStore && data) {
          const { lat, lon, radius = 5 } = data;
          const nearbyEvents = eventStore.getNearbyEvents(
            parseFloat(lat) || 0,
            parseFloat(lon) || 0,
            parseFloat(radius)
          );

          socket.emit('initialEvents', {
            events: nearbyEvents,
            count: nearbyEvents.length
          });
        }
      } catch (error) {
        console.error('Error sending nearby events:', error);
        socket.emit('initialEvents', { events: [], count: 0 });
      }
    });

    socket.on('disconnect', () => {
      console.log(`📱 WebSocket client disconnected: ${socket.id}`);

      if (deviceConnections.has(deviceId)) {
        deviceConnections.get(deviceId).delete(socket.id);
        if (deviceConnections.get(deviceId).size === 0) {
          deviceConnections.delete(deviceId);
        }
      }

      io.emit('connectionCountUpdate', { connectedDevices: getDeviceCount() });
    });
  });

  // Security middleware
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS configuration - allow all for local dev
  app.use(cors({ origin: true, credentials: true }));

  // Request logging
  app.use(morgan('dev'));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 500
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API response middleware
  app.use(ApiResponse.middleware);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.apiSuccess({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: 'v1'
    });
  });

  // API routes - call factory functions to get routers
  app.use('/events', createEventsRoutes());
  app.use('/voice', createVoiceRoutes());
  app.use('/status', createStatusRoutes());
  // mesh routes is already a plain Express router
  app.use('/mesh', meshRoutes);

  // 404 handler
  app.use('*', (req, res) => {
    res.apiError('Endpoint not found', 404);
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.apiError(err.message || 'Internal server error', 500);
  });

  return { app, httpServer };
}

module.exports = createApp;
