/**
 * EventStore.js
 * In-memory storage for all crisis events.
 * Provides fast lookups by ID and location-based queries.
 */

const PingEvent = require('./PingEvent');

class EventStore {
  constructor() {
    // Map of event ID -> PingEvent object
    this.events = new Map();
    
    // Map of user ID -> reputation tracking data
    this.userReputation = new Map();
    
    // Configuration
    this.maxEvents = 1000; // Prevent memory bloat
    this.retentionHours = 24; // Auto-expire old events
  }

  /**
   * Add a new event to the store
   * @param {PingEvent} pingEvent - Event to add
   * @returns {PingEvent} The added event
   */
  addEvent(pingEvent) {
    if (!(pingEvent instanceof PingEvent)) {
      throw new Error('Must provide a PingEvent instance');
    }

    // Store the event
    this.events.set(pingEvent.id, pingEvent);

    // Initialize user reputation if new user
    if (!this.userReputation.has(pingEvent.user_id)) {
      this.userReputation.set(pingEvent.user_id, {
        confirmed: 0,
        fakes: 0,
        total: 0
      });
    }

    // Update user's post count
    const userRep = this.userReputation.get(pingEvent.user_id);
    userRep.total++;

    // Enforce max events limit (remove oldest)
    if (this.events.size > this.maxEvents) {
      const oldestId = this.getOldestEventId();
      if (oldestId) {
        this.events.delete(oldestId);
      }
    }

    console.log(`📥 Event stored: ${pingEvent.id} (${pingEvent.type})`);
    return pingEvent;
  }

  /**
   * Get event by ID
   * @param {string} id - Event ID
   * @returns {PingEvent|null} Event or null if not found
   */
  getEventById(id) {
    return this.events.get(id) || null;
  }

  /**
   * Get all events within a radius from a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radiusKm - Radius in kilometers (default: 2.5)
   * @returns {Array} Array of nearby PingEvent objects, sorted newest first
   */
  getNearbyEvents(lat, lon, radiusKm = 2.5) {
    const nearby = [];
    
    for (const event of this.events.values()) {
      const distance = this.calculateDistance(lat, lon, event.lat, event.lon);
      if (distance <= radiusKm) {
        nearby.push({
          ...event.toJSON(),
          distance_km: Math.round(distance * 100) / 100 // Add distance info
        });
      }
    }

    // Sort by timestamp (newest first)
    return nearby.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get all events (for debugging)
   * @returns {Array} Array of all events
   */
  getAllEvents() {
    return Array.from(this.events.values()).map(e => e.toJSON());
  }

  /**
   * Get total event count
   * @returns {number} Count
   */
  getEventCount() {
    return this.events.size;
  }

  /**
   * Get user's reputation data
   * @param {string} userId - User ID
   * @returns {Object} Reputation data
   */
  getUserReputation(userId) {
    return this.userReputation.get(userId) || { confirmed: 0, fakes: 0, total: 0 };
  }

  /**
   * Update user's reputation
   * @param {string} userId - User ID
   * @param {Object} update - Update object
   */
  updateUserReputation(userId, update) {
    const current = this.getUserReputation(userId);
    this.userReputation.set(userId, {
      confirmed: current.confirmed + (update.confirmed || 0),
      fakes: current.fakes + (update.fakes || 0),
      total: current.total
    });
  }

  /**
   * Get the ID of the oldest event
   * @returns {string|null} Oldest event ID
   */
  getOldestEventId() {
    let oldestId = null;
    let oldestTime = Infinity;

    for (const [id, event] of this.events) {
      if (event.timestamp < oldestTime) {
        oldestTime = event.timestamp;
        oldestId = id;
      }
    }

    return oldestId;
  }

  /**
   * Remove expired events
   * @returns {number} Number of removed events
   */
  removeExpiredEvents() {
    const now = Date.now();
    const expiryMs = this.retentionHours * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, event] of this.events) {
      if (now - event.timestamp > expiryMs) {
        this.events.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🗑️ Removed ${removed} expired events`);
    }

    return removed;
  }

  /**
   * Clear all events (for testing)
   */
  clear() {
    this.events.clear();
    this.userReputation.clear();
  }

  /**
   * Save events to localStorage-compatible format (for browser)
   * @returns {string} JSON string
   */
  saveToLocalStorage() {
    const data = {
      events: this.getAllEvents(),
      userReputation: Array.from(this.userReputation.entries())
    };
    return JSON.stringify(data);
  }

  /**
   * Load events from localStorage-compatible format
   * @param {string} jsonString - JSON string
   * @returns {boolean} Success status
   */
  loadFromLocalStorage(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Clear current data
      this.clear();
      
      // Restore events
      if (data.events) {
        for (const eventData of data.events) {
          const event = new PingEvent(eventData);
          this.events.set(event.id, event);
        }
      }
      
      // Restore user reputation
      if (data.userReputation) {
        for (const [userId, repData] of data.userReputation) {
          this.userReputation.set(userId, repData);
        }
      }
      
      console.log(`📂 Loaded ${this.events.size} events from storage`);
      return true;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return false;
    }
  }
}

module.exports = EventStore;
