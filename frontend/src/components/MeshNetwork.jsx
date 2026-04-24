import React, { useState, useEffect } from 'react';
import apiService from '../api/api';
import socketService from '../services/socket';

const MeshNetwork = () => {
  const [meshData, setMeshData] = useState({
    status: null,
    topology: null,
    nodes: [],
    activity: []
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // WebSocket connection for real-time mesh data
  useEffect(() => {
    const socket = socketService.connect();

    socketService.on('connect', () => {
      console.log('🔌 MeshNetwork WebSocket connected');
      setSocketConnected(true);
      setLoading(false);
      setError(null);
    });

    socketService.on('disconnect', (reason) => {
      console.log('🔌 MeshNetwork WebSocket disconnected:', reason);
      setSocketConnected(false);
    });

    // Receive initial mesh state on connection
    socketService.on('meshInitialState', (initialData) => {
      console.log('📡 Received initial mesh state');
      setMeshData({
        status: initialData.status,
        topology: initialData.topology,
        nodes: initialData.nodes,
        activity: initialData.activity
      });
      setLoading(false);
      setError(null);
    });

    // Receive mesh data updates
    socketService.on('meshDataUpdate', (updatedData) => {
      console.log('📡 Received mesh data update');
      setMeshData({
        status: updatedData.status,
        topology: updatedData.topology,
        nodes: updatedData.nodes,
        activity: updatedData.activity
      });
      setError(null);
    });

    // Cleanup on unmount
    return () => {
      socketService.off('connect');
      socketService.off('disconnect');
      socketService.off('meshInitialState');
      socketService.off('meshDataUpdate');
    };
  }, []);

  const fetchMeshData = async () => {
    // Use WebSocket to request fresh data
    if (socketService.isConnected()) {
      socketService.emit('requestMeshData');
    } else {
      // Fallback to HTTP if WebSocket not connected
      try {
        setLoading(true);
        const [statusRes, topologyRes, nodesRes, activityRes] = await Promise.all([
          apiService.getMeshNetworkStatus(),
          apiService.getMeshTopology(),
          apiService.getMeshNodes(),
          apiService.getMeshActivity(10)
        ]);

        setMeshData({
          status: statusRes.data,
          topology: topologyRes.data,
          nodes: nodesRes.data,
          activity: activityRes.data
        });
        setError(null);
      } catch (err) {
        setError('Failed to fetch mesh network data');
        console.error('Mesh data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNodeClick = async (nodeId) => {
    try {
      const nodeDetails = await apiService.getMeshNode(nodeId);
      setSelectedNode(nodeDetails.data);
    } catch (err) {
      console.error('Failed to fetch node details:', err);
    }
  };

  const handleAddNode = async () => {
    const newNode = {
      id: `node_user_${Date.now()}`,
      name: 'User Device',
      lat: 19.9762 + (Math.random() - 0.5) * 0.01,
      lon: 75.8456 + (Math.random() - 0.5) * 0.01,
      type: 'civilian',
      battery: 80 + Math.random() * 20,
      bandwidth: 250 + Math.random() * 250,
      range: 1.5 + Math.random() * 1.5
    };

    try {
      await apiService.addMeshNode(newNode);
      fetchMeshData(); // Refresh data
    } catch (err) {
      console.error('Failed to add node:', err);
    }
  };

  const handleTestPropagation = async () => {
    try {
      await apiService.testMeshPropagation();
      fetchMeshData(); // Refresh data
    } catch (err) {
      console.error('Failed to test propagation:', err);
    }
  };

  const getNodeColor = (node) => {
    if (node.status === 'inactive') return '#9ca3af';
    if (node.type === 'emergency') return '#dc2626';
    if (node.type === 'relay') return '#059669';
    if (node.type === 'mobile') return '#2563eb';
    if (node.type === 'aerial') return '#7c3aed';
    return '#6b7280';
  };

  const getNodeIcon = (type) => {
    const icons = {
      fixed: '🏢',
      mobile: '📱',
      relay: '📡',
      emergency: '🚨',
      civilian: '👤',
      aerial: '🚁'
    };
    return icons[type] || '📡';
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="mesh-network">
        <h3>🌐 Mesh Network</h3>
        <div className="loading">Loading mesh network data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mesh-network">
        <h3>🌐 Mesh Network</h3>
        <div className="error">{error}</div>
        <button onClick={fetchMeshData} className="retry-btn">Retry</button>
      </div>
    );
  }

  const { status, topology, nodes, activity } = meshData;

  return (
    <div className="mesh-network">
      <div className="mesh-header">
        <h3>🌐 Enhanced Mesh Network</h3>
        <div className="mesh-controls">
          <button onClick={handleAddNode} className="add-node-btn">
            ➕ Add Node
          </button>
          <button onClick={handleTestPropagation} className="test-btn">
            🧪 Test Propagation
          </button>
          <button onClick={fetchMeshData} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Network Status Overview */}
      {status && (
        <div className="mesh-status">
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className={`status-value ${status.enabled ? 'enabled' : 'disabled'}`}>
                {status.enabled ? '🟢 Enabled' : '🔴 Disabled'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Nodes:</span>
              <span className="status-value">{status.statistics?.totalNodes || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Active:</span>
              <span className="status-value">{status.statistics?.activeNodes || 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Health:</span>
              <span className="status-value">{status.statistics?.networkHealth?.toFixed(1) || 0}%</span>
            </div>
          </div>
          
          {/* Feature Flags */}
          <div className="feature-flags">
            {status.config?.adaptiveRouting && <span className="flag">🧭 Adaptive</span>}
            {status.config?.messageCompression && <span className="flag">📦 Compression</span>}
            {status.config?.batterySimulation && <span className="flag">🔋 Battery</span>}
          </div>
        </div>
      )}

      {/* Network Visualization */}
      {topology && (
        <div className="network-visualization">
          <h4>Network Topology</h4>
          <div className="topology-map">
            <div className="nodes-container">
              {topology.nodes.map(node => (
                <div
                  key={node.id}
                  className={`node ${node.status} ${selectedNode?.id === node.id ? 'selected' : ''}`}
                  style={{
                    left: `${((node.lon - 75.84) * 10000) + 50}%`,
                    top: `${((19.98 - node.lat) * 10000) + 50}%`,
                    backgroundColor: getNodeColor(node)
                  }}
                  onClick={() => handleNodeClick(node.id)}
                  title={`${node.name} - ${node.type}`}
                >
                  <span className="node-icon">{getNodeIcon(node.type)}</span>
                  <span className="node-label">{node.name.split(' ')[0]}</span>
                  {node.eventCount > 0 && (
                    <span className="event-badge">{node.eventCount}</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Connections */}
            <svg className="connections-overlay">
              {topology.links.map((link, index) => {
                const sourceNode = topology.nodes.find(n => n.id === link.source);
                const targetNode = topology.nodes.find(n => n.id === link.target);
                
                if (!sourceNode || !targetNode) return null;
                
                const x1 = ((sourceNode.lon - 75.84) * 10000) + 50;
                const y1 = ((19.98 - sourceNode.lat) * 10000) + 50;
                const x2 = ((targetNode.lon - 75.84) * 10000) + 50;
                const y2 = ((19.98 - targetNode.lat) * 10000) + 50;
                
                return (
                  <line
                    key={index}
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    stroke={link.active ? '#22c55e' : '#9ca3af'}
                    strokeWidth={link.quality * 3}
                    strokeOpacity={link.quality}
                    strokeDasharray={link.reliability < 0.7 ? '5,5' : '0'}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="node-details">
          <div className="details-header">
            <h4>🔍 Node Details: {selectedNode.name}</h4>
            <button onClick={() => setSelectedNode(null)} className="close-btn">✕</button>
          </div>
          
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{selectedNode.type}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className={`detail-value ${selectedNode.status}`}>
                {selectedNode.status}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Battery:</span>
              <span className="detail-value">{selectedNode.battery.toFixed(1)}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Load:</span>
              <span className="detail-value">{(selectedNode.load * 100).toFixed(1)}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Reputation:</span>
              <span className="detail-value">{(selectedNode.reputation * 100).toFixed(1)}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Events:</span>
              <span className="detail-value">{selectedNode.eventCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Connections:</span>
              <span className="detail-value">{selectedNode.connections?.length || 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Bandwidth:</span>
              <span className="detail-value">{selectedNode.bandwidth} Mbps</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Range:</span>
              <span className="detail-value">{selectedNode.range} km</span>
            </div>
          </div>

          {/* Connections */}
          {selectedNode.connections && selectedNode.connections.length > 0 && (
            <div className="connections-list">
              <h5>Connections</h5>
              {selectedNode.connections.map(conn => (
                <div key={conn.nodeId} className="connection-item">
                  <span className="conn-target">{conn.targetNode}</span>
                  <div className="conn-metrics">
                    <span className="conn-distance">{conn.distance.toFixed(2)} km</span>
                    <span className="conn-quality">Quality: {(conn.quality * 100).toFixed(0)}%</span>
                    <span className="conn-latency">{conn.latency} ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Feed */}
      {activity && activity.length > 0 && (
        <div className="mesh-activity">
          <h4>📡 Recent Activity</h4>
          <div className="activity-list">
            {activity.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                <span className="activity-event">
                  Event {activity.eventId} → Node {activity.toNodeId}
                  {activity.nodeInfo?.routingMethod && (
                    <span className="routing-method">({activity.nodeInfo.routingMethod})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeshNetwork;
