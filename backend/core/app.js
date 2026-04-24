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
  
  // Track devices by deviceId instead of socket.id
  // Map: deviceId -> Set of socket connections
  const deviceConnections = new Map();
  
  // Get unique device count
  const getDeviceCount = () => deviceConnections.size;
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    const deviceId = socket.handshake.query.deviceId;
    console.log(`📱 WebSocket client connected: ${socket.id}, Device: ${deviceId}`);
    
    // Track device connection
    if (!deviceConnections.has(deviceId)) {
      deviceConnections.set(deviceId, new Set());
    }
    deviceConnections.get(deviceId).add(socket.id);
    
    // Broadcast updated device count to all clients
    const connectedDevices = getDeviceCount();
    io.emit('connectionCountUpdate', { connectedDevices });
    console.log(`📊 Device count updated: ${connectedDevices}`);
    
    // Send initial state on connection
    const sendInitialState = async () => {
      try {
        const services = httpServer.services;
        const meshSimulator = services?.meshSimulator;
        
        // Send mesh data if enabled
        if (meshSimulator && meshSimulator.config.enabled) {
          const meshStatus = {
            enabled: true,
            statistics: meshSimulator.getStatistics(),
            topology: meshSimulator.getNetworkTopology(),
            nodes: Array.from(meshSimulator.nodes.values()).map(node => ({
              id: node.id,
              name: node.name,
              type: node.type,
              status: node.status,
              battery: node.battery,
              load: node.load,
              reputation: node.reputation,
              eventCount: node.events.size,
              connections: node.connections.length,
              bandwidth: node.bandwidth,
              range: node.range,
              lastSeen: node.lastSeen
            })),
            activity: meshSimulator.getRecentActivity(10)
          };
          socket.emit('meshInitialState', meshStatus);
        }
      } catch (error) {
        console.error('Error sending initial state:', error);
      }
    };
    
    sendInitialState();
    
    // Handle mesh data requests
    socket.on('requestMeshData', async () => {
      try {
        const services = httpServer.services;
        const meshSimulator = services?.meshSimulator;
        
        if (meshSimulator && meshSimulator.config.enabled) {
          const meshData = {
            status: {
              enabled: true,
              statistics: meshSimulator.getStatistics(),
              config: {
                adaptiveRouting: meshSimulator.config.adaptiveRouting,
                messageCompression: meshSimulator.config.messageCompression,
                batterySimulation: meshSimulator.config.batterySimulation
              }
            },
            topology: meshSimulator.getNetworkTopology(),
            nodes: Array.from(meshSimulator.nodes.values()).map(node => ({
              id: node.id,
              name: node.name,
              type: node.type,
              status: node.status,
              battery: node.battery,
              load: node.load,
              reputation: node.reputation,
              eventCount: node.events.size,
              connections: node.connections.length,
              bandwidth: node.bandwidth,
              range: node.range,
              lastSeen: node.lastSeen
            })),
            activity: meshSimulator.getRecentActivity(10)
          };
          socket.emit('meshDataUpdate', meshData);
        }
      } catch (error) {
        console.error('Error sending mesh data:', error);
      }
    });

    // Handle nearby events requests
    socket.on('requestNearbyEvents', async (data) => {
      try {
        const services = httpServer.services;
        const eventStore = services?.eventStore;
        
        if (eventStore) {
          const { lat, lon, radius = 5 } = data;
          const nearbyEvents = eventStore.getNearbyEvents(lat, lon, radius);
          
          socket.emit('initialEvents', {
            events: nearbyEvents.map(event => event.toJSON()),
            count: nearbyEvents.length
          });
        }
      } catch (error) {
        console.error('Error sending nearby events:', error);
        socket.emit('initialEvents', { events: [], count: 0 });
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`📱 WebSocket client disconnected: ${socket.id}, Device: ${deviceId}`);
      
      // Remove socket from device connections
      if (deviceConnections.has(deviceId)) {
        deviceConnections.get(deviceId).delete(socket.id);
        
        // If no more connections for this device, remove device entry
        if (deviceConnections.get(deviceId).size === 0) {
          deviceConnections.delete(deviceId);
        }
      }
      
      // Broadcast updated device count
      const connectedDevices = getDeviceCount();
      io.emit('connectionCountUpdate', { connectedDevices });
      console.log(`📊 Device count updated: ${connectedDevices}`);
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
