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

// Import routes
const eventsRoutes = require('../routes/events.routes');
const voiceRoutes = require('../routes/voice.routes');
const statusRoutes = require('../routes/status.routes');
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
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`📱 WebSocket client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`📱 WebSocket client disconnected: ${socket.id}`);
    });
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow inline styles for demo
  }));

  // CORS configuration
  app.use(cors(config.server.cors));

  // Request logging
  app.use(morgan(config.logging.format));

  // Rate limiting
  const limiter = rateLimit(config.api.rateLimit);
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
      version: config.api.version
    });
  });

  // API routes
  app.use('/events', eventsRoutes);
  app.use('/voice', voiceRoutes);
  app.use('/status', statusRoutes);
  app.use('/mesh', meshRoutes);

  // 404 handler
  app.use('*', (req, res) => {
    res.apiError('Endpoint not found', 404);
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.apiError(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      500
    );
  });

  return { app, httpServer };
}

module.exports = createApp;
