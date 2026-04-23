/**
 * Express App Configuration
 * Sets up middleware, routes, and error handling
 */

const express = require('express');
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

function createApp() {
  const app = express();

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

  return app;
}

module.exports = createApp;
