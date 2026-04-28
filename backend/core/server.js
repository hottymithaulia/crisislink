/**
 * CrisisLink Backend Server
 * Main entry point - initializes all services and starts the HTTP server.
 */

const createApp = require('./app');
const config = require('../config/config');

// Import services
const EventStore = require('../services/EventStore');
const ReputationEngine = require('../services/ReputationEngine');
const EscalationTimer = require('../services/EscalationTimer');
const VoiceProcessor = require('../services/VoiceProcessor');
const MeshSimulator = require('../network/mesh.simulator');

class CrisisLinkServer {
  constructor() {
    this.app = null;
    this.httpServer = null;
    this.services = {};
    this.escalationInterval = null;
  }

  /**
   * Initialize all services
   */
  initializeServices() {
    console.log('🔧 Initializing services...');

    this.services.eventStore = new EventStore(config.eventStore);
    this.services.reputationEngine = new ReputationEngine(config.reputation);
    this.services.escalationTimer = new EscalationTimer(config.escalation);
    this.services.voiceProcessor = new VoiceProcessor(config.voice);

    // Mesh simulator - always disabled for MVP; won't crash even if enabled=false
    this.services.meshSimulator = new MeshSimulator({
      ...config.network.mesh,
      enabled: false  // Disabled as requested
    });

    console.log('✅ Services initialized');
  }

  /**
   * Start escalation timer interval
   */
  startEscalationTimer() {
    const intervalMs = (config.escalation.checkIntervalSeconds || 10) * 1000;

    this.escalationInterval = setInterval(() => {
      try {
        const updated = this.services.escalationTimer.checkAndEscalate(
          this.services.eventStore
        );
        if (updated > 0) {
          console.log(`⏰ Escalated ${updated} events`);
        }
      } catch (err) {
        console.error('Escalation error:', err.message);
      }
    }, intervalMs);

    console.log(`⏰ Escalation timer started (${config.escalation.checkIntervalSeconds}s interval)`);
  }

  /**
   * Create and configure Express app with WebSocket
   */
  createApp() {
    const { app, httpServer } = createApp();
    this.app = app;
    this.httpServer = httpServer;

    // Make services available to routes via app.locals
    this.app.locals.services = this.services;
    this.app.locals.config = config;

    // Also attach services directly on httpServer for socket handlers
    this.httpServer.services = this.services;

    console.log('🌐 Express app configured with WebSocket support');
  }

  /**
   * Start the HTTP server
   */
  async start() {
    try {
      console.log('\n🚀 Starting CrisisLink Server...\n');

      this.initializeServices();
      this.createApp();
      this.startEscalationTimer();

      const port = config.server.port || 3001;
      const host = config.server.host || '0.0.0.0';

      this.httpServer.listen(port, host, () => {
        console.log('');
        console.log('🎯 CrisisLink Server is RUNNING!');
        console.log(`📍 Local:   http://localhost:${port}`);
        console.log(`📍 Network: http://${host}:${port}`);
        console.log('');
        console.log('🔗 API Endpoints:');
        console.log(`   POST   /events              - Create incident`);
        console.log(`   GET    /events/nearby       - Get nearby incidents`);
        console.log(`   POST   /events/:id/confirm  - Confirm incident`);
        console.log(`   POST   /events/:id/fake     - Report as fake`);
        console.log(`   GET    /status              - System status`);
        console.log(`   GET    /health              - Health check`);
        console.log(`   POST   /voice/analyze       - Analyze voice text`);
        console.log('');
        console.log('🔊 Voice Processing: Ready');
        console.log('⏱️  Escalation Timer: Active');
        console.log('📊 Event Store: Ready');
        console.log('🏆 Reputation System: Active');
        console.log('📡 WebSocket: Ready for real-time updates');
        console.log('🌐 Mesh Network: Disabled (MVP mode)');
        console.log('');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n🛑 Shutting down CrisisLink Server...');

    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
    }

    if (this.services.eventStore) {
      this.services.eventStore.stopCleanupInterval();
    }

    if (this.httpServer) {
      this.httpServer.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new CrisisLinkServer();
  server.start();
}

module.exports = CrisisLinkServer;
