/**
 * SystemStatus Component
 * Displays real-time system status and API endpoint health
 */

import React, { useState, useEffect } from 'react';
import apiService from '../api/api';
import config from '../config/config';
import './SystemStatus.css';

function SystemStatus() {
  const [systemStatus, setSystemStatus] = useState('checking');
  const [endpointStatus, setEndpointStatus] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkingEndpoints, setCheckingEndpoints] = useState(false);

  // Check system status on mount and interval
  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, config.systemStatus.checkInterval);
    return () => clearInterval(interval);
  }, []);

  /**
   * Check overall system status
   */
  const checkSystemStatus = async () => {
    try {
      const isOnline = await apiService.isBackendOnline();
      setSystemStatus(isOnline ? 'online' : 'offline');
      setLastChecked(new Date());
    } catch (error) {
      setSystemStatus('offline');
      setLastChecked(new Date());
    }
  };

  /**
   * Check all endpoints
   */
  const checkEndpoints = async () => {
    setCheckingEndpoints(true);
    try {
      const results = await apiService.testAllEndpoints();
      setEndpointStatus(results);
    } catch (error) {
      console.error('Error checking endpoints:', error);
    } finally {
      setCheckingEndpoints(false);
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'success':
        return config.ui.theme.success;
      case 'offline':
      case 'error':
        return config.ui.theme.danger;
      case 'checking':
      case 'skipped':
        return config.ui.theme.warning;
      default:
        return config.ui.theme.info;
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
      case 'success':
        return '🟢';
      case 'offline':
      case 'error':
        return '🔴';
      case 'checking':
        return '🟡';
      case 'skipped':
        return '⚪';
      default:
        return '⚫';
    }
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const endpointStats = {
    total: endpointStatus.length,
    success: endpointStatus.filter(ep => ep.status === 'success').length,
    error: endpointStatus.filter(ep => ep.status === 'error').length,
    skipped: endpointStatus.filter(ep => ep.status === 'skipped').length
  };

  return (
    <div className="system-status">
      <div className="system-status-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="system-status-main">
          <div className="system-status-title">
            <span className="system-status-icon">📡</span>
            <span className="system-status-text">SYSTEM STATUS</span>
          </div>
          <div className="system-status-indicator">
            <span className={`status-dot status-${systemStatus}`}></span>
            <span className="status-text">{systemStatus.toUpperCase()}</span>
          </div>
        </div>
        <div className="system-status-meta">
          <span className="last-checked">
            Last checked: {formatTimeAgo(lastChecked)}
          </span>
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="system-status-details">
          {/* Backend Connection Status */}
          <div className="status-section">
            <h4>Backend Connection</h4>
            <div className="status-item">
              <span className="status-label">{config.api.baseUrl}</span>
              <span className="status-value">
                {getStatusIcon(systemStatus)} {systemStatus}
              </span>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="status-section">
            <div className="section-header">
              <h4>API Endpoints</h4>
              <button 
                className="check-endpoints-btn"
                onClick={checkEndpoints}
                disabled={checkingEndpoints}
              >
                {checkingEndpoints ? 'Checking...' : 'Check All'}
              </button>
            </div>

            {endpointStatus.length > 0 && (
              <div className="endpoint-stats">
                <span className="stat success">✓ {endpointStats.success}</span>
                <span className="stat error">✗ {endpointStats.error}</span>
                <span className="stat skipped">○ {endpointStats.skipped}</span>
                <span className="stat total">Total: {endpointStats.total}</span>
              </div>
            )}

            <div className="endpoints-list">
              {endpointStatus.map((endpoint, index) => (
                <div key={index} className="endpoint-item">
                  <div className="endpoint-method">{endpoint.method}</div>
                  <div className="endpoint-path">{endpoint.path}</div>
                  <div className="endpoint-name">{endpoint.name}</div>
                  <div className="endpoint-status">
                    <span 
                      className="status-indicator"
                      style={{ color: getStatusColor(endpoint.status) }}
                    >
                      {getStatusIcon(endpoint.status)}
                    </span>
                    <span className="status-text-small">{endpoint.status}</span>
                  </div>
                  {endpoint.error && (
                    <div className="endpoint-error">{endpoint.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* System Information */}
          <div className="status-section">
            <h4>System Information</h4>
            <div className="system-info">
              <div className="info-item">
                <span className="info-label">Frontend:</span>
                <span className="info-value">{window.location.origin}</span>
              </div>
              <div className="info-item">
                <span className="info-label">API Version:</span>
                <span className="info-value">v1</span>
              </div>
              <div className="info-item">
                <span className="info-label">Mesh Network:</span>
                <span className="info-value">
                  {config.features.meshNetwork ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value user-id">{apiService.getUserId()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemStatus;
