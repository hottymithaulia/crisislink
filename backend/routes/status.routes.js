/**
 * Status Routes
 * Handles system status and monitoring endpoints
 */

const express = require('express');
const router = express.Router();

function createStatusRoutes() {
  // GET /status - System status
  router.get('/', async (req, res) => {
    try {
      const { services, config } = req.app.locals;
      
      // Get system metrics
      const totalEvents = services.eventStore.events.size;
      const totalUsers = services.eventStore.userReputation.size;
      const activeEvents = Array.from(services.eventStore.events.values())
        .filter(event => !event.isResolved()).length;

      // Calculate reputation distribution
      const reputationDistribution = {};
      Object.keys(config.reputation.tiers).forEach(tier => {
        reputationDistribution[tier] = 0;
      });

      for (const [userId, repData] of services.eventStore.userReputation.entries()) {
        const score = services.reputationEngine.calculateScore(userId, repData);
        const tier = services.reputationEngine.getDisplayTier(score);
        reputationDistribution[tier.id]++;
      }

      // Event type distribution
      const eventTypeDistribution = {};
      for (const event of services.eventStore.events.values()) {
        eventTypeDistribution[event.type] = (eventTypeDistribution[event.type] || 0) + 1;
      }

      // Urgency distribution
      const urgencyDistribution = {};
      for (const event of services.eventStore.events.values()) {
        urgencyDistribution[event.urgency] = (urgencyDistribution[event.urgency] || 0) + 1;
      }

      const status = {
        system: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: config.api.version,
          timestamp: new Date().toISOString()
        },
        services: {
          eventStore: {
            active: true,
            totalEvents,
            activeEvents,
            totalUsers,
            maxEvents: config.eventStore.maxEvents
          },
          reputationEngine: {
            active: true,
            distribution: reputationDistribution
          },
          escalationTimer: {
            active: true,
            interval: config.escalation.checkIntervalSeconds,
            stages: Object.keys(config.escalation.stages)
          },
          voiceProcessor: {
            active: true,
            supportedTypes: Object.keys(config.voice.eventTypes)
          },
          meshNetwork: {
            active: config.network.mesh.enabled,
            simulationMode: config.network.mesh.simulationMode,
            maxHops: config.network.mesh.maxHops
          }
        },
        statistics: {
          events: {
            total: totalEvents,
            active: activeEvents,
            byType: eventTypeDistribution,
            byUrgency: urgencyDistribution
          },
          users: {
            total: totalUsers,
            reputationDistribution
          }
        }
      };

      res.apiSuccess(status, 'System status retrieved successfully');

    } catch (error) {
      console.error('Error fetching status:', error);
      res.apiError('Failed to fetch system status', 500);
    }
  });

  // GET /status/endpoints - API endpoint status
  router.get('/endpoints', async (req, res) => {
    try {
      const endpoints = [
        { method: 'POST', path: '/events', description: 'Create new incident', status: 'active' },
        { method: 'GET', path: '/events/nearby', description: 'Get nearby incidents', status: 'active' },
        { method: 'POST', path: '/events/:id/confirm', description: 'Confirm incident', status: 'active' },
        { method: 'POST', path: '/events/:id/fake', description: 'Report incident as fake', status: 'active' },
        { method: 'GET', path: '/events/all', description: 'Get all events (admin)', status: 'active' },
        { method: 'POST', path: '/voice/analyze', description: 'Analyze voice input', status: 'active' },
        { method: 'GET', path: '/voice/types', description: 'Get incident types', status: 'active' },
        { method: 'GET', path: '/voice/keywords', description: 'Get voice keywords', status: 'active' },
        { method: 'GET', path: '/voice/urgency', description: 'Get urgency keywords', status: 'active' },
        { method: 'GET', path: '/status', description: 'System status', status: 'active' },
        { method: 'GET', path: '/status/endpoints', description: 'Endpoint status', status: 'active' },
        { method: 'GET', path: '/health', description: 'Health check', status: 'active' }
      ];

      res.apiSuccess({
        endpoints,
        total: endpoints.length,
        active: endpoints.filter(ep => ep.status === 'active').length
      }, 'Endpoint status retrieved successfully');

    } catch (error) {
      console.error('Error fetching endpoint status:', error);
      res.apiError('Failed to fetch endpoint status', 500);
    }
  });

  // GET /status/mesh - Mesh network status
  router.get('/mesh', async (req, res) => {
    try {
      const { services, config } = req.app.locals;
      
      const meshStatus = {
        enabled: config.network.mesh.enabled,
        simulationMode: config.network.mesh.simulationMode,
        maxHops: config.network.mesh.maxHops,
        propagationDelayMs: config.network.mesh.propagationDelayMs,
        statistics: services.meshSimulator.getStatistics(),
        recentActivity: services.meshSimulator.getRecentActivity(10)
      };

      res.apiSuccess(meshStatus, 'Mesh network status retrieved successfully');

    } catch (error) {
      console.error('Error fetching mesh status:', error);
      res.apiError('Failed to fetch mesh network status', 500);
    }
  });

  // GET /status/connections - WebSocket connections count
  router.get('/connections', async (req, res) => {
    try {
      const io = req.app.get('io');
      const count = io?.engine?.clientsCount ?? 0;

      res.apiSuccess({
        connectedDevices: count
      }, 'Connection count retrieved successfully');

    } catch (error) {
      console.error('Error fetching connection count:', error);
      res.apiError('Failed to fetch connection count', 500);
    }
  });

  return router;
}

module.exports = createStatusRoutes;
