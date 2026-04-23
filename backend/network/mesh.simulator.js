/**
 * Mesh Network Simulator
 * Simulates peer-to-peer message propagation for offline communication
 * Demonstrates how incidents would spread through a mesh network
 */

class MeshSimulator {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled || false,
      simulationMode: config.simulationMode || true,
      maxHops: config.maxHops || 5,
      propagationDelayMs: config.propagationDelayMs || 100,
      ...config
    };

    // Network state
    this.nodes = new Map(); // node_id -> { id, lastSeen, events, connections }
    this.propagationLog = []; // Log of all message propagations
    this.eventPropagation = new Map(); // event_id -> propagation tracking

    // Initialize with some demo nodes
    if (this.config.simulationMode) {
      this.initializeDemoNodes();
    }
  }

  /**
   * Initialize demo nodes for simulation
   */
  initializeDemoNodes() {
    const demoNodes = [
      { id: 'node_alpha', lat: 19.9762, lon: 75.8456, name: 'Alpha Station' },
      { id: 'node_beta', lat: 19.9780, lon: 75.8470, name: 'Beta Station' },
      { id: 'node_gamma', lat: 19.9745, lon: 75.8440, name: 'Gamma Station' },
      { id: 'node_delta', lat: 19.9790, lon: 75.8430, name: 'Delta Station' },
      { id: 'node_epsilon', lat: 19.9720, lon: 75.8480, name: 'Epsilon Station' }
    ];

    demoNodes.forEach(node => {
      this.nodes.set(node.id, {
        ...node,
        lastSeen: Date.now(),
        events: new Set(),
        connections: this.calculateConnections(node, demoNodes)
      });
    });

    console.log(`🌐 Initialized ${this.nodes.size} mesh nodes in simulation mode`);
  }

  /**
   * Calculate connections between nodes based on distance
   */
  calculateConnections(node, allNodes) {
    const connections = [];
    const maxDistance = 2; // 2km connection range

    for (const otherNode of allNodes) {
      if (otherNode.id !== node.id) {
        const distance = this.calculateDistance(
          node.lat, node.lon, otherNode.lat, otherNode.lon
        );
        
        if (distance <= maxDistance) {
          connections.push({
            nodeId: otherNode.id,
            distance,
            quality: Math.max(0.1, 1 - (distance / maxDistance))
          });
        }
      }
    }

    return connections;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Log event creation in mesh network
   */
  logEventCreation(event) {
    if (!this.config.enabled) return;

    const propagation = {
      eventId: event.id,
      startTime: Date.now(),
      hops: [],
      totalNodesReached: 0,
      completed: false
    };

    this.eventPropagation.set(event.id, propagation);

    // Find nearest node
    const nearestNode = this.findNearestNode(event.lat, event.lon);
    
    if (nearestNode) {
      this.propagateEvent(event, nearestNode.id, 0);
    }
  }

  /**
   * Find nearest node to a location
   */
  findNearestNode(lat, lon) {
    let nearestNode = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      const distance = this.calculateDistance(lat, lon, node.lat, node.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }

    return nearestNode;
  }

  /**
   * Propagate event through mesh network
   */
  async propagateEvent(event, fromNodeId, hopCount) {
    if (hopCount >= this.config.maxHops) return;

    const fromNode = this.nodes.get(fromNodeId);
    if (!fromNode) return;

    // Add event to node
    fromNode.events.add(event.id);

    // Log propagation step
    const propagationStep = {
      eventId: event.id,
      fromNodeId,
      toNodeId: fromNodeId,
      hopCount,
      timestamp: Date.now(),
      distance: 0,
      nodeInfo: {
        name: fromNode.name,
        totalEvents: fromNode.events.size
      }
    };

    this.propagationLog.push(propagationStep);

    // Update propagation tracking
    const propagation = this.eventPropagation.get(event.id);
    if (propagation) {
      propagation.hops.push(propagationStep);
      propagation.totalNodesReached = this.countNodesWithEvent(event.id);
    }

    // Propagate to connected nodes
    for (const connection of fromNode.connections) {
      setTimeout(() => {
        this.propagateEvent(event, connection.nodeId, hopCount + 1);
      }, this.config.propagationDelayMs);
    }
  }

  /**
   * Count nodes that have received an event
   */
  countNodesWithEvent(eventId) {
    let count = 0;
    for (const node of this.nodes.values()) {
      if (node.events.has(eventId)) count++;
    }
    return count;
  }

  /**
   * Log event confirmation in mesh network
   */
  logEventConfirmation(event, userId) {
    if (!this.config.enabled) return;

    const logEntry = {
      type: 'confirmation',
      eventId: event.id,
      userId,
      timestamp: Date.now(),
      propagated: true
    };

    this.propagationLog.push(logEntry);
    console.log(`🌐 Event ${event.id} confirmation propagated through mesh`);
  }

  /**
   * Log event fake report in mesh network
   */
  logEventFakeReport(event, userId) {
    if (!this.config.enabled) return;

    const logEntry = {
      type: 'fake_report',
      eventId: event.id,
      userId,
      timestamp: Date.now(),
      propagated: true
    };

    this.propagationLog.push(logEntry);
    console.log(`🌐 Event ${event.id} fake report propagated through mesh`);
  }

  /**
   * Propagate escalated events
   */
  propagateEscalatedEvents(eventStore) {
    if (!this.config.enabled) return;

    for (const event of eventStore.events.values()) {
      if (event.escalation_stage && !this.eventPropagation.has(`escalated_${event.id}`)) {
        this.propagateEvent(event, 'node_alpha', 0);
        this.eventPropagation.set(`escalated_${event.id}`, true);
      }
    }
  }

  /**
   * Get mesh network statistics
   */
  getStatistics() {
    const totalEvents = new Set();
    let totalConnections = 0;

    for (const node of this.nodes.values()) {
      node.events.forEach(eventId => totalEvents.add(eventId));
      totalConnections += node.connections.length;
    }

    return {
      totalNodes: this.nodes.size,
      totalConnections: totalConnections / 2, // Divide by 2 as connections are bidirectional
      totalEventsPropagated: totalEvents.size,
      totalPropagationSteps: this.propagationLog.length,
      averageConnectionsPerNode: totalConnections / this.nodes.size,
      enabled: this.config.enabled,
      simulationMode: this.config.simulationMode
    };
  }

  /**
   * Get recent propagation activity
   */
  getRecentActivity(limit = 10) {
    return this.propagationLog
      .slice(-limit)
      .reverse()
      .map(entry => ({
        ...entry,
        timeAgo: Date.now() - entry.timestamp
      }));
  }

  /**
   * Get network topology for visualization
   */
  getNetworkTopology() {
    const nodes = Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      name: node.name,
      lat: node.lat,
      lon: node.lon,
      eventCount: node.events.size,
      lastSeen: node.lastSeen
    }));

    const links = [];
    for (const node of this.nodes.values()) {
      for (const connection of node.connections) {
        // Avoid duplicate links
        if (node.id < connection.nodeId) {
          links.push({
            source: node.id,
            target: connection.nodeId,
            distance: connection.distance,
            quality: connection.quality
          });
        }
      }
    }

    return { nodes, links };
  }
}

module.exports = MeshSimulator;
