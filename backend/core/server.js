/**
 * CrisisLink Backend Server
 * Minimal startup script that initializes all services and starts the server
 */

const createApp = require('./app');
const config = require('../config/config');

// Import services
const EventStore = require('../services/EventStore');
const ReputationEngine = require('../services/ReputationEngine');
const EscalationTimer = require('../services/EscalationTimer');
const VoiceProcessor = require('../services/VoiceProcessor');

// Import network module
const MeshSimulator = require('../network/mesh.simulator');

class CrisisLinkServer {
  constructor() {
    this.app = null;
    this.server = null;
    this.services = {};
    this.escalationInterval = null;
  }

  /**
   * Initialize all services with configuration
   */
  initializeServices() {
    console.log('🔧 Initializing services...');

    // Core services with config injection
    this.services.eventStore = new EventStore(config.eventStore);
    this.services.reputationEngine = new ReputationEngine(config.reputation);
    this.services.escalationTimer = new EscalationTimer(config.escalation);
    this.services.voiceProcessor = new VoiceProcessor(config.voice);

    // Network module
    this.services.meshSimulator = new MeshSimulator(config.network.mesh);

    console.log('✅ Services initialized successfully');
  }

  /**
   * Start escalation timer interval
   */
  startEscalationTimer() {
    const intervalMs = config.escalation.checkIntervalSeconds * 1000;
    
    this.escalationInterval = setInterval(() => {
      const updated = this.services.escalationTimer.checkAndEscalate(
        this.services.eventStore
      );
      
      if (updated > 0) {
        console.log(`⏰ Escalated ${updated} events`);
        
        // Propagate escalated events through mesh network
        this.services.meshSimulator.propagateEscalatedEvents(
          this.services.eventStore
        );
      }
    }, intervalMs);

    console.log(`⏰ Escalation timer started (${config.escalation.checkIntervalSeconds}s interval)`);
  }

  /**
   * Create and configure Express app
   */
  createApp() {
    this.app = createApp();
    
    // Make services available to routes
    this.app.locals.services = this.services;
    this.app.locals.config = config;

    console.log('🌐 Express app configured');
  }

  /**
   * Start the HTTP server
   */
  async start() {
    try {
      console.log('🚀 Starting CrisisLink Server...');

      // Initialize services
      this.initializeServices();

      // Create Express app
      this.createApp();

      // Start escalation timer
      this.startEscalationTimer();

      // Start HTTP server
      const port = config.server.port;
      const host = config.server.host;

      this.server = this.app.listen(port, host, () => {
        console.log('');
        console.log('🎯 CrisisLink Server is running!');
        console.log(`📍 Server: http://${host}:${port}`);
        console.log(`🔗 API Endpoints:`);
        console.log(`   POST   /events          - Create incident`);
        console.log(`   GET    /events/nearby   - Get nearby incidents`);
        console.log(`   POST   /events/:id/confirm - Confirm incident`);
        console.log(`   POST   /events/:id/fake    - Report as fake`);
        console.log(`   GET    /status          - System status`);
        console.log(`   GET    /health          - Health check`);
        console.log('');
        console.log('🌐 Mesh Network:', config.network.mesh.enabled ? 'Enabled' : 'Disabled');
        console.log('🔊 Voice Processing: Ready');
        console.log('⏱️  Escalation Timer: Active');
        console.log('📊 Event Store: Initialized');
        console.log('🏆 Reputation System: Active');
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

    if (this.server) {
      this.server.close(() => {
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
  const crisisLinkServer = new CrisisLinkServer();
  crisisLinkServer.start();
}

module.exports = CrisisLinkServer;
