/**
 * Enhanced Mesh Network Simulator
 * Advanced peer-to-peer message propagation with dynamic topology,
 * real-time node management, and adaptive routing.
 */

class MeshSimulator {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled || false,
      simulationMode: config.simulationMode || true,
      maxHops: config.maxHops || 8,
      propagationDelayMs: config.propagationDelayMs || 100,
      nodeTimeoutMs: config.nodeTimeoutMs || 30000,
      adaptiveRouting: config.adaptiveRouting || true,
      messageCompression: config.messageCompression || true,
      batterySimulation: config.batterySimulation || true,
      ...config
    };

    // Enhanced network state
    this.nodes = new Map(); // node_id -> enhanced node object
    this.propagationLog = []; // Log of all message propagations
    this.eventPropagation = new Map(); // event_id -> propagation tracking
    this.messageQueue = new Map(); // node_id -> queued messages
    this.networkMetrics = {
      totalMessages: 0,
      failedPropagations: 0,
      averageLatency: 0,
      networkHealth: 100
    };

    // Initialize with enhanced demo nodes
    if (this.config.simulationMode) {
      this.initializeEnhancedDemoNodes();
    }
  }

  /**
   * Initialize enhanced demo nodes with realistic properties
   */
  initializeEnhancedDemoNodes() {
    const demoNodes = [
      { 
        id: 'node_alpha', 
        lat: 19.9762, 
        lon: 75.8456, 
        name: 'Alpha Station',
        type: 'fixed',
        battery: 100,
        bandwidth: 1000,
        range: 3.0
      },
      { 
        id: 'node_beta', 
        lat: 19.9780, 
        lon: 75.8470, 
        name: 'Beta Mobile Unit',
        type: 'mobile',
        battery: 85,
        bandwidth: 500,
        range: 2.5
      },
      { 
        id: 'node_gamma', 
        lat: 19.9745, 
        lon: 75.8440, 
        name: 'Gamma Relay',
        type: 'relay',
        battery: 95,
        bandwidth: 750,
        range: 4.0
      },
      { 
        id: 'node_delta', 
        lat: 19.9790, 
        lon: 75.8430, 
        name: 'Delta Emergency',
        type: 'emergency',
        battery: 100,
        bandwidth: 1500,
        range: 5.0
      },
      { 
        id: 'node_epsilon', 
        lat: 19.9720, 
        lon: 75.8480, 
        name: 'Epsilon Civilian',
        type: 'civilian',
        battery: 60,
        bandwidth: 250,
        range: 1.5
      },
      {
        id: 'node_zeta',
        lat: 19.9810,
        lon: 75.8490,
        name: 'Zeta Drone',
        type: 'aerial',
        battery: 75,
        bandwidth: 800,
        range: 8.0
      }
    ];

    demoNodes.forEach(node => {
      this.nodes.set(node.id, {
        ...node,
        lastSeen: Date.now(),
        events: new Set(),
        connections: this.calculateEnhancedConnections(node, demoNodes),
        messageCount: 0,
        status: 'active',
        load: 0,
        reputation: 0.8,
        lastPing: Date.now()
      });
    });

    console.log(`🌐 Initialized ${this.nodes.size} enhanced mesh nodes`);
    this.startNetworkMaintenance();
  }

  /**
   * Calculate enhanced connections between nodes based on multiple factors
   */
  calculateEnhancedConnections(node, allNodes) {
    const connections = [];

    for (const otherNode of allNodes) {
      if (otherNode.id !== node.id) {
        const distance = this.calculateDistance(
          node.lat, node.lon, otherNode.lat, otherNode.lon
        );
        
        // Use node-specific range instead of fixed max distance
        const maxDistance = Math.min(node.range || 2, otherNode.range || 2);
        
        if (distance <= maxDistance) {
          // Enhanced quality calculation considering multiple factors
          const baseQuality = Math.max(0.1, 1 - (distance / maxDistance));
          const bandwidthFactor = Math.min(node.bandwidth, otherNode.bandwidth) / 1000;
          const batteryFactor = Math.min(node.battery, otherNode.battery) / 100;
          
          const quality = baseQuality * (0.5 + 0.3 * bandwidthFactor + 0.2 * batteryFactor);
          
          connections.push({
            nodeId: otherNode.id,
            distance,
            quality: Math.round(quality * 100) / 100,
            bandwidth: Math.min(node.bandwidth, otherNode.bandwidth),
            latency: Math.round(distance * 50 + Math.random() * 20), // Simulated latency
            reliability: this.calculateReliability(node, otherNode)
          });
        }
      }
    }

    // Sort connections by quality (best first)
    return connections.sort((a, b) => b.quality - a.quality);
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
   * Calculate connection reliability between nodes
   */
  calculateReliability(node1, node2) {
    const batteryReliability = Math.min(node1.battery, node2.battery) / 100;
    const reputationReliability = (node1.reputation + node2.reputation) / 2;
    const typeBonus = node1.type === 'emergency' || node2.type === 'emergency' ? 0.1 : 0;
    
    return Math.min(1, batteryReliability * reputationReliability + typeBonus);
  }

  /**
   * Start network maintenance interval
   */
  startNetworkMaintenance() {
    setInterval(() => {
      this.performNetworkMaintenance();
    }, 5000); // Every 5 seconds
  }

  /**
   * Perform network maintenance tasks
   */
  performNetworkMaintenance() {
    const now = Date.now();
    let activeNodes = 0;
    
    for (const [nodeId, node] of this.nodes) {
      // Check node timeout
      if (now - node.lastSeen > this.config.nodeTimeoutMs) {
        node.status = 'inactive';
      } else {
        node.status = 'active';
        activeNodes++;
      }
      
      // Simulate battery drain
      if (this.config.batterySimulation && node.type !== 'fixed') {
        node.battery = Math.max(0, node.battery - 0.1);
      }
      
      // Update node load
      node.load = node.messageCount / 10; // Simple load calculation
      node.messageCount = 0; // Reset for next interval
      
      // Recalculate connections if node moved or battery changed
      if (node.type === 'mobile' && Math.random() < 0.1) {
        this.simulateNodeMovement(node);
      }
    }
    
    // Update network health
    this.networkMetrics.networkHealth = (activeNodes / this.nodes.size) * 100;
    
    // Process message queues
    this.processMessageQueues();
  }

  /**
   * Simulate node movement for mobile nodes
   */
  simulateNodeMovement(node) {
    // Small random movement
    node.lat += (Math.random() - 0.5) * 0.001;
    node.lon += (Math.random() - 0.5) * 0.001;
    
    // Recalculate connections
    const allNodes = Array.from(this.nodes.values());
    node.connections = this.calculateEnhancedConnections(node, allNodes);
    
    console.log(`🚶 Node ${node.id} moved to new location`);
  }

  /**
   * Process queued messages
   */
  processMessageQueues() {
    for (const [nodeId, queue] of this.messageQueue) {
      if (queue.length > 0) {
        const node = this.nodes.get(nodeId);
        if (node && node.status === 'active') {
          // Process messages based on node capacity
          const capacity = Math.floor(node.bandwidth / 100);
          const toProcess = queue.splice(0, capacity);
          
          toProcess.forEach(message => {
            this.deliverMessage(nodeId, message);
          });
        }
      }
    }
  }

  /**
   * Deliver message to node
   */
  deliverMessage(nodeId, message) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    node.messageCount++;
    node.lastPing = Date.now();
    
    // Simulate message processing
    const processingTime = message.size / node.bandwidth;
    
    setTimeout(() => {
      if (message.type === 'event') {
        node.events.add(message.eventId);
      }
      
      console.log(`📨 Message delivered to ${nodeId}`);
    }, processingTime);
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
   * Enhanced event propagation with adaptive routing
   */
  async propagateEvent(event, fromNodeId, hopCount) {
    if (hopCount >= this.config.maxHops) return;

    const fromNode = this.nodes.get(fromNodeId);
    if (!fromNode || fromNode.status !== 'active') {
      this.networkMetrics.failedPropagations++;
      return;
    }

    // Add event to node
    fromNode.events.add(event.id);
    this.networkMetrics.totalMessages++;

    // Enhanced propagation step logging
    const propagationStep = {
      eventId: event.id,
      fromNodeId,
      toNodeId: fromNodeId,
      hopCount,
      timestamp: Date.now(),
      distance: 0,
      nodeInfo: {
        name: fromNode.name,
        type: fromNode.type,
        totalEvents: fromNode.events.size,
        battery: fromNode.battery,
        load: fromNode.load,
        quality: this.getNodeQuality(fromNode)
      },
      routingMethod: this.config.adaptiveRouting ? 'adaptive' : 'basic'
    };

    this.propagationLog.push(propagationStep);

    // Update propagation tracking
    const propagation = this.eventPropagation.get(event.id);
    if (propagation) {
      propagation.hops.push(propagationStep);
      propagation.totalNodesReached = this.countNodesWithEvent(event.id);
    }

    // Enhanced propagation with adaptive routing
    const connections = this.config.adaptiveRouting ? 
      this.getOptimalConnections(fromNode, event) : 
      fromNode.connections;

    // Propagate to selected connections
    for (const connection of connections) {
      const targetNode = this.nodes.get(connection.nodeId);
      if (targetNode && targetNode.status === 'active' && !targetNode.events.has(event.id)) {
        const message = {
          type: 'event',
          eventId: event.id,
          size: this.config.messageCompression ? 200 : 500,
          priority: this.getEventPriority(event),
          timestamp: Date.now()
        };

        // Queue message for delivery
        this.queueMessage(connection.nodeId, message);
        
        // Propagate after delay
        setTimeout(() => {
          this.propagateEvent(event, connection.nodeId, hopCount + 1);
        }, this.config.propagationDelayMs + connection.latency);
      }
    }
  }

  /**
   * Get optimal connections for event propagation
   */
  getOptimalConnections(node, event) {
    return node.connections
      .filter(conn => {
        const targetNode = this.nodes.get(conn.nodeId);
        return targetNode && 
               targetNode.status === 'active' && 
               !targetNode.events.has(event.id) &&
               targetNode.battery > 10 && // Minimum battery requirement
               targetNode.load < 0.8; // Maximum load threshold
      })
      .sort((a, b) => {
        // Prioritize by reliability, then quality, then latency
        const scoreA = a.reliability * 0.4 + a.quality * 0.4 + (1 / a.latency) * 0.2;
        const scoreB = b.reliability * 0.4 + b.quality * 0.4 + (1 / b.latency) * 0.2;
        return scoreB - scoreA;
      })
      .slice(0, 3); // Limit to top 3 connections
  }

  /**
   * Get node quality score
   */
  getNodeQuality(node) {
    const batteryScore = node.battery / 100;
    const loadScore = 1 - node.load;
    const reputationScore = node.reputation;
    const typeBonus = node.type === 'emergency' ? 0.2 : node.type === 'relay' ? 0.1 : 0;
    
    return Math.min(1, (batteryScore + loadScore + reputationScore) / 3 + typeBonus);
  }

  /**
   * Get event priority for routing
   */
  getEventPriority(event) {
    if (event.urgency === 'critical') return 3;
    if (event.urgency === 'high') return 2;
    if (event.urgency === 'medium') return 1;
    return 0;
  }

  /**
   * Queue message for node
   */
  queueMessage(nodeId, message) {
    if (!this.messageQueue.has(nodeId)) {
      this.messageQueue.set(nodeId, []);
    }
    
    const queue = this.messageQueue.get(nodeId);
    queue.push(message);
    
    // Sort by priority
    queue.sort((a, b) => b.priority - a.priority);
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
   * Enhanced mesh network statistics
   */
  getStatistics() {
    const totalEvents = new Set();
    let totalConnections = 0;
    let activeNodes = 0;
    let totalBattery = 0;
    let totalLoad = 0;
    let nodesByType = {};

    for (const node of this.nodes.values()) {
      node.events.forEach(eventId => totalEvents.add(eventId));
      totalConnections += node.connections.length;
      
      if (node.status === 'active') {
        activeNodes++;
        totalBattery += node.battery;
        totalLoad += node.load;
      }
      
      // Count nodes by type
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      activeNodes,
      totalConnections: totalConnections / 2, // Divide by 2 as connections are bidirectional
      totalEventsPropagated: totalEvents.size,
      totalPropagationSteps: this.propagationLog.length,
      averageConnectionsPerNode: totalConnections / this.nodes.size,
      averageBattery: activeNodes > 0 ? totalBattery / activeNodes : 0,
      averageLoad: activeNodes > 0 ? totalLoad / activeNodes : 0,
      networkHealth: this.networkMetrics.networkHealth,
      nodesByType,
      messageQueueSize: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      totalMessages: this.networkMetrics.totalMessages,
      failedPropagations: this.networkMetrics.failedPropagations,
      successRate: this.networkMetrics.totalMessages > 0 ? 
        ((this.networkMetrics.totalMessages - this.networkMetrics.failedPropagations) / this.networkMetrics.totalMessages * 100).toFixed(2) : 100,
      enabled: this.config.enabled,
      simulationMode: this.config.simulationMode,
      adaptiveRouting: this.config.adaptiveRouting,
      messageCompression: this.config.messageCompression
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
   * Enhanced network topology for visualization
   */
  getNetworkTopology() {
    const nodes = Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      lat: node.lat,
      lon: node.lon,
      eventCount: node.events.size,
      lastSeen: node.lastSeen,
      status: node.status,
      battery: node.battery,
      load: node.load,
      reputation: node.reputation,
      quality: this.getNodeQuality(node),
      connections: node.connections.length,
      bandwidth: node.bandwidth,
      range: node.range
    }));

    const links = [];
    for (const node of this.nodes.values()) {
      for (const connection of node.connections) {
        // Avoid duplicate links
        if (node.id < connection.nodeId) {
          const targetNode = this.nodes.get(connection.nodeId);
          links.push({
            source: node.id,
            target: connection.nodeId,
            distance: connection.distance,
            quality: connection.quality,
            bandwidth: connection.bandwidth,
            latency: connection.latency,
            reliability: connection.reliability,
            active: node.status === 'active' && targetNode?.status === 'active'
          });
        }
      }
    }

    return { 
      nodes, 
      links,
      metrics: this.getStatistics()
    };
  }

  /**
   * Get detailed node information
   */
  getNodeDetails(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    return {
      ...node,
      connections: node.connections.map(conn => ({
        ...conn,
        targetNode: this.nodes.get(conn.nodeId)?.name || 'Unknown'
      })),
      messageQueueSize: this.messageQueue.get(nodeId)?.length || 0,
      recentActivity: this.propagationLog
        .filter(log => log.fromNodeId === nodeId || log.toNodeId === nodeId)
        .slice(-5)
    };
  }

  /**
   * Add new node to network
   */
  addNode(nodeData) {
    const node = {
      id: nodeData.id,
      name: nodeData.name || nodeData.id,
      lat: nodeData.lat,
      lon: nodeData.lon,
      type: nodeData.type || 'civilian',
      battery: nodeData.battery || 100,
      bandwidth: nodeData.bandwidth || 250,
      range: nodeData.range || 2.0,
      lastSeen: Date.now(),
      events: new Set(),
      connections: [],
      messageCount: 0,
      status: 'active',
      load: 0,
      reputation: 0.5,
      lastPing: Date.now()
    };

    // Calculate connections with existing nodes
    const allNodes = Array.from(this.nodes.values()).concat([node]);
    node.connections = this.calculateEnhancedConnections(node, allNodes);

    // Update existing nodes' connections
    for (const existingNode of this.nodes.values()) {
      existingNode.connections = this.calculateEnhancedConnections(existingNode, allNodes);
    }

    this.nodes.set(node.id, node);
    console.log(`🔗 Added new node: ${node.name} (${node.type})`);
    
    return node;
  }

  /**
   * Remove node from network
   */
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    this.nodes.delete(nodeId);
    this.messageQueue.delete(nodeId);

    // Update remaining nodes' connections
    const allNodes = Array.from(this.nodes.values());
    for (const remainingNode of allNodes) {
      remainingNode.connections = remainingNode.connections
        .filter(conn => conn.nodeId !== nodeId);
    }

    console.log(`❌ Removed node: ${node.name}`);
    return true;
  }
}

module.exports = MeshSimulator;
