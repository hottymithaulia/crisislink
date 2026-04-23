/**
 * CrisisLink API Service
 * Centralized API client for all backend communication
 */

import config from '../config/config';

class ApiService {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
    this.retryAttempts = config.api.retryAttempts;
    this.retryDelay = config.api.retryDelay;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // Retry logic
      if (options.retry !== false && this.retryAttempts > 0) {
        console.warn(`API request failed, retrying... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.request(endpoint, { ...options, retry: false });
      }

      throw error;
    }
  }

  /**
   * Get user ID from localStorage
   */
  getUserId() {
    let userId = localStorage.getItem(config.user.storage.keys.userId);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(config.user.storage.keys.userId, userId);
    }
    return userId;
  }

  // ========== EVENT ENDPOINTS ==========

  /**
   * Create new event
   */
  async createEvent(eventData) {
    const payload = {
      ...eventData,
      user_id: this.getUserId()
    };

    return await this.request('/events', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Get nearby events
   */
  async getNearbyEvents(lat, lon, radius = 5) {
    const params = new URLSearchParams({ lat, lon, radius });
    return await this.request(`/events/nearby?${params}`);
  }

  /**
   * Confirm event
   */
  async confirmEvent(eventId) {
    return await this.request(`/events/${eventId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ user_id: this.getUserId() })
    });
  }

  /**
   * Report event as fake
   */
  async reportFakeEvent(eventId) {
    return await this.request(`/events/${eventId}/fake`, {
      method: 'POST',
      body: JSON.stringify({ user_id: this.getUserId() })
    });
  }

  /**
   * Get all events (admin/debug)
   */
  async getAllEvents() {
    return await this.request('/events/all');
  }

  // ========== VOICE ENDPOINTS ==========

  /**
   * Analyze voice text
   */
  async analyzeVoice(text) {
    return await this.request('/voice/analyze', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }

  /**
   * Get incident types
   */
  async getIncidentTypes() {
    return await this.request('/voice/types');
  }

  /**
   * Get voice keywords
   */
  async getVoiceKeywords() {
    return await this.request('/voice/keywords');
  }

  /**
   * Get urgency keywords
   */
  async getUrgencyKeywords() {
    return await this.request('/voice/urgency');
  }

  // ========== STATUS ENDPOINTS ==========

  /**
   * Get system status
   */
  async getSystemStatus() {
    return await this.request('/status');
  }

  /**
   * Get endpoint status
   */
  async getEndpointStatus() {
    return await this.request('/status/endpoints');
  }

  /**
   * Get mesh network status
   */
  async getMeshStatus() {
    return await this.request('/status/mesh');
  }

  /**
   * Health check
   */
  async healthCheck() {
    return await this.request('/health');
  }

  /**
   * Get connected devices count
   */
  async getConnectionsCount() {
    return await this.request('/status/connections');
  }

  // ========== MESH NETWORK ENDPOINTS ==========

  /**
   * Get mesh network status from /mesh/status
   */
  async getMeshNetworkStatus() {
    return await this.request('/mesh/status');
  }

  /**
   * Get mesh network topology from /mesh/topology
   */
  async getMeshTopology() {
    return await this.request('/mesh/topology');
  }

  /**
   * Get all mesh nodes from /mesh/nodes
   */
  async getMeshNodes() {
    return await this.request('/mesh/nodes');
  }

  /**
   * Get specific mesh node details
   */
  async getMeshNode(nodeId) {
    return await this.request(`/mesh/nodes/${nodeId}`);
  }

  /**
   * Add a new mesh node
   */
  async addMeshNode(nodeData) {
    return await this.request('/mesh/nodes', {
      method: 'POST',
      body: JSON.stringify(nodeData)
    });
  }

  /**
   * Get mesh network activity
   */
  async getMeshActivity(limit = 10) {
    return await this.request(`/mesh/activity?limit=${limit}`);
  }

  /**
   * Test mesh propagation
   */
  async testMeshPropagation() {
    return await this.request('/mesh/test-propagation', {
      method: 'POST'
    });
  }

  // ========== UTILITY METHODS ==========

  /**
   * Check if backend is online
   */
  async isBackendOnline() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test all endpoints
   */
  async testAllEndpoints() {
    const results = [];

    for (const endpoint of config.systemStatus.endpoints) {
      try {
        let response;
        const path = endpoint.path.replace(':id', 'test');

        switch (endpoint.method) {
          case 'GET':
            response = await this.request(path);
            break;
          case 'POST':
            // Skip POST endpoints that require data
            if (path.includes('/events/') || path === '/events') {
              results.push({
                ...endpoint,
                status: 'skipped',
                reason: 'Requires test data'
              });
              continue;
            }
            response = await this.request(path, { method: 'POST' });
            break;
          default:
            results.push({
              ...endpoint,
              status: 'skipped',
              reason: `Unsupported method: ${endpoint.method}`
            });
            continue;
        }

        results.push({
          ...endpoint,
          status: 'success',
          response: response.success ? 'OK' : 'Error'
        });

      } catch (error) {
        results.push({
          ...endpoint,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Upload audio file (future use)
   */
  async uploadAudio(audioBlob, eventId) {
    const formData = new FormData();
    formData.append('audio', audioBlob, `audio_${eventId}.webm`);
    formData.append('event_id', eventId);

    return await this.request('/voice/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;
