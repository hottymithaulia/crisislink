/**
 * Mesh Network Routes
 * Enhanced API endpoints for mesh network management and monitoring
 */

const express = require('express');
const router = express.Router();

/**
 * GET /mesh/status
 * Get comprehensive mesh network status
 */
router.get('/status', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    
    if (!meshSimulator.config.enabled) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          message: 'Mesh network is disabled'
        }
      });
    }

    const stats = meshSimulator.getStatistics();
    const topology = meshSimulator.getNetworkTopology();

    res.json({
      success: true,
      data: {
        enabled: true,
        statistics: stats,
        topology: {
          nodeCount: topology.nodes.length,
          connectionCount: topology.links.length,
          health: stats.networkHealth
        },
        config: {
          adaptiveRouting: meshSimulator.config.adaptiveRouting,
          messageCompression: meshSimulator.config.messageCompression,
          batterySimulation: meshSimulator.config.batterySimulation
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get mesh status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /mesh/topology
 * Get detailed network topology for visualization
 */
router.get('/topology', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    
    if (!meshSimulator.config.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Mesh network is disabled'
      });
    }

    const topology = meshSimulator.getNetworkTopology();
    
    res.json({
      success: true,
      data: topology
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get network topology',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /mesh/nodes
 * Get list of all mesh nodes
 */
router.get('/nodes', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    
    if (!meshSimulator.config.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Mesh network is disabled'
      });
    }

    const nodes = Array.from(meshSimulator.nodes.values()).map(node => ({
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
    }));

    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get mesh nodes',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /mesh/nodes/:nodeId
 * Get detailed information about a specific node
 */
router.get('/nodes/:nodeId', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    const { nodeId } = req.params;
    
    if (!meshSimulator.config.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Mesh network is disabled'
      });
    }

    const nodeDetails = meshSimulator.getNodeDetails(nodeId);
    
    if (!nodeDetails) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }

    res.json({
      success: true,
      data: nodeDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get node details',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /mesh/nodes
 * Add a new node to the mesh network
 */
router.post('/nodes', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    
    if (!meshSimulator.config.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Mesh network is disabled'
      });
    }

    const nodeData = req.body;
    
    // Validate required fields
    if (!nodeData.id || !nodeData.lat || !nodeData.lon) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, lat, lon'
      });
    }

    // Check if node already exists
    if (meshSimulator.nodes.has(nodeData.id)) {
      return res.status(409).json({
        success: false,
        error: 'Node already exists'
      });
    }

    const newNode = meshSimulator.addNode(nodeData);
    
    res.status(201).json({
      success: true,
      data: newNode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add node',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /mesh/nodes/:nodeId
 * Remove a node from the mesh network
 */
router.delete('/nodes/:nodeId', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    const { nodeId } = req.params;
    
    if (!meshSimulator.config.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Mesh network is disabled'
      });
    }

    const removed = meshSimulator.removeNode(nodeId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }

    res.json({
      success: true,
      data: { message: 'Node removed successfully' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove node',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /mesh/activity
 * Get recent mesh network activity
 */
router.get('/activity', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!meshSimulator.config.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Mesh network is disabled'
      });
    }

    const activity = meshSimulator.getRecentActivity(limit);
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get mesh activity',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /mesh/test-propagation
 * Test event propagation through the mesh network
 */
router.post('/test-propagation', (req, res) => {
  try {
    const meshSimulator = req.app.locals.services.meshSimulator;
    
    if (!meshSimulator.config.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Mesh network is disabled'
      });
    }

    // Create a test event
    const testEvent = {
      id: 'test_' + Date.now(),
      type: 'test',
      urgency: 'medium',
      lat: 19.9762,
      lon: 75.8456,
      timestamp: Date.now()
    };

    // Start propagation
    meshSimulator.logEventCreation(testEvent);
    
    res.json({
      success: true,
      data: {
        eventId: testEvent.id,
        message: 'Test propagation started',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start test propagation',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
