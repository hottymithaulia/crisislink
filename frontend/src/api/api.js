/**
 * CrisisLink API Service
 * Centralized API client for all backend communication
 * Backend runs at http://localhost:3001 with routes at /events, /voice, /status, /health
 */

import config from '../config/config';

class ApiService {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout || 10000;
  }

  /**
   * Make HTTP request with timeout and error handling
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || data?.error || `HTTP ${response.status}`);
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - is the backend running?');
      }

      throw error;
    }
  }

  /**
   * Get user ID from localStorage (creates one if not present)
   */
  getUserId() {
    const key = config.user.storage.keys.userId;
    let userId = localStorage.getItem(key);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, userId);
    }
    return userId;
  }

  // ========== EVENT ENDPOINTS ==========

  /**
   * Create new event
   * Backend expects: { text, lat, lon, user_id, type?, urgency?, voice_url? }
   */
  async createEvent(eventData) {
    const payload = {
      text:         eventData.text || eventData.description || '',
      lat:          eventData.lat  || eventData.latitude,
      lon:          eventData.lon  || eventData.longitude,
      type:         eventData.type,
      urgency:      eventData.urgency,
      voice_url:    eventData.voice_url    || null,
      audio_base64: eventData.audio_base64 || null,
      lang:         eventData.lang         || 'en',
      user_id:      this.getUserId(),
    };
    return await this.request('/events', { method: 'POST', body: JSON.stringify(payload) });
  }

  /**
   * Get nearby events
   * Backend expects: ?lat=&lon=&radius=
   */
  async getNearbyEvents(lat, lon, radius = 5) {
    const params = new URLSearchParams({ lat, lon, radius });
    return await this.request(`/events/nearby?${params}`);
  }

  /**
   * Confirm event as real
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
   * Get all events (debug)
   */
  async getAllEvents() {
    return await this.request('/events/all');
  }

  // ========== VOICE ENDPOINTS ==========

  /**
   * Analyze voice text to detect type/urgency
   */
  async analyzeVoice(text) {
    const result = await this.request('/voice/analyze', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    // Return the inner analysis object for convenience
    return result?.data?.analysis || result?.data || null;
  }

  /**
   * Get incident types
   */
  async getIncidentTypes() {
    return await this.request('/voice/types');
  }

  // ========== STATUS ENDPOINTS ==========

  /** Get system status */
  async getSystemStatus() {
    return await this.request('/status');
  }

  /** Alias used by StatsPanel */
  async getStatus() {
    return await this.getSystemStatus();
  }

  /**
   * Health check - returns true/false
   */
  async isBackendOnline() {
    try {
      const result = await this.request('/health');
      return !!(result && result.success);
    } catch {
      return false;
    }
  }

  /**
   * Test all configured endpoints
   */
  async testAllEndpoints() {
    const results = [];

    for (const endpoint of config.systemStatus.endpoints) {
      try {
        const path = endpoint.path.replace(':id', 'test_nonexistent');

        if (endpoint.method === 'GET') {
          await this.request(path);
          results.push({ ...endpoint, status: 'success' });
        } else {
          // Skip POST endpoints - we don't want to create dummy data
          results.push({ ...endpoint, status: 'skipped', reason: 'POST - skipped in health check' });
        }
      } catch (error) {
        // 404 on non-existent ID is still a working endpoint
        const isExpected404 = error.message.includes('404') || error.message.includes('not found');
        results.push({
          ...endpoint,
          status: isExpected404 ? 'success' : 'error',
          error: isExpected404 ? null : error.message
        });
      }
    }

    return results;
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;
