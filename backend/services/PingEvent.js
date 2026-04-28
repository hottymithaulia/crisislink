/**
 * PingEvent.js
 * Data structure representing a single crisis incident/event.
 * Optimized for small network transmission size.
 */

class PingEvent {
  /**
   * Create a new PingEvent
   * @param {Object} data - Event data
   */
  constructor(data = {}) {
    // Generate unique ID if not provided
    this.id = data.id || this.generateId();
    
    // User who reported the event
    this.user_id = data.user_id || this.generateUserId();
    
    // Incident classification
    this.type = data.type || 'incident';
    this.urgency = data.urgency || 'low';
    this.text = data.text || data.description || '';
    
    // Location data
    this.lat = data.lat || 0;
    this.lon = data.lon || 0;
    
    // Timestamp in milliseconds
    this.timestamp = data.timestamp || Date.now();
    
    // Reputation and verification
    this.user_reputation = data.user_reputation !== undefined ? data.user_reputation : 0.5;
    this.confirmations = data.confirmations || 0;
    this.fakes = data.fakes || 0;
    
    // Response tracking
    this.responders = data.responders || [];
    this.fakers = data.fakers || [];
    
    // Voice/audio data
    this.voice_url    = data.voice_url    || null;
    this.audio_base64 = data.audio_base64 || null;  // base64 audio for cross-device playback
    this.lang         = data.lang         || 'en';  // language of the report (ISO 639-1)
    
    // Escalation state tracking
    this.escalation_state = data.escalation_state || 'hyperlocal';
    this.current_radius_km = data.current_radius_km || 1;
    this.needs_cloud_escalation = data.needs_cloud_escalation || false;
    
    // UI display properties (computed on server)
    this.escalation_color = data.escalation_color || '#3b82f6';
    this.escalation_label = data.escalation_label || 'Hyperlocal (1 km)';
  }

  /**
   * Generate a unique event ID
   * @returns {string} Unique ID
   */
  generateId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `event_${timestamp}_${random}`;
  }

  /**
   * Generate a unique user ID
   * @returns {string} Unique user ID
   */
  generateUserId() {
    const random = Math.random().toString(36).substring(2, 10);
    return `user_${random}`;
  }

  /**
   * Convert to plain object for JSON serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      type: this.type,
      urgency: this.urgency,
      text: this.text,
      lat: this.lat,
      lon: this.lon,
      timestamp: this.timestamp,
      user_reputation: this.user_reputation,
      confirmations: this.confirmations,
      fakes: this.fakes,
      responders: this.responders,
      fakers: this.fakers,
      voice_url:              this.voice_url,
      audio_base64:           this.audio_base64,
      lang:                   this.lang,
      escalation_state:       this.escalation_state,
      current_radius_km:      this.current_radius_km,
      needs_cloud_escalation: this.needs_cloud_escalation,
      escalation_color:       this.escalation_color,
      escalation_label:       this.escalation_label
    };
  }

  /**
   * Serialize event to JSON string
   * @returns {string} JSON string
   */
  serialize() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Deserialize JSON string to PingEvent
   * @param {string} jsonString - JSON string
   * @returns {PingEvent|null} PingEvent object or null on error
   */
  static deserialize(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return new PingEvent(data);
    } catch (error) {
      console.error('Failed to deserialize PingEvent:', error.message);
      return null;
    }
  }

  /**
   * Get the size of serialized event in bytes
   * @returns {number} Size in bytes
   */
  getSize() {
    return new Blob([this.serialize()]).size;
  }

  /**
   * Get age of event in minutes
   * @returns {number} Age in minutes
   */
  getAgeMinutes() {
    return Math.floor((Date.now() - this.timestamp) / 60000);
  }

  /**
   * Check if event is within a certain age range
   * @param {number} minMinutes - Minimum age
   * @param {number} maxMinutes - Maximum age
   * @returns {boolean} True if within range
   */
  isWithinAgeRange(minMinutes, maxMinutes) {
    const age = this.getAgeMinutes();
    return age >= minMinutes && age < maxMinutes;
  }

  /**
   * Add a confirmation
   * @param {string} userId - User confirming the event
   * @returns {boolean} True if confirmation was added, false if already confirmed
   */
  addConfirmation(userId) {
    if (this.responders.includes(userId)) return false;
    if (this.fakers.includes(userId)) {
      this.fakers = this.fakers.filter(id => id !== userId);
      this.fakes = Math.max(0, this.fakes - 1);
    }
    this.responders.push(userId);
    this.confirmations++;
    return true;
  }

  /**
   * Add a fake report
   * @param {string} userId - User reporting fake
   * @returns {boolean} True if fake report was added, false if already faked
   */
  addFake(userId) {
    if (this.fakers.includes(userId)) return false;
    if (this.responders.includes(userId)) {
      this.responders = this.responders.filter(id => id !== userId);
      this.confirmations = Math.max(0, this.confirmations - 1);
    }
    this.fakers.push(userId);
    this.fakes++;
    return true;
  }

  /**
   * Calculate verification ratio
   * @returns {number} Ratio of confirmations to total reports
   */
  getVerificationRatio() {
    const total = this.confirmations + this.fakes;
    if (total === 0) return 0.5;
    return this.confirmations / total;
  }

  /**
   * Check if event is considered resolved
   * (more confirmations than fakes, and at least some confirmations)
   * @returns {boolean} True if resolved
   */
  isResolved() {
    return this.confirmations > 0 && this.confirmations > this.fakes;
  }

  /**
   * Get a summary string for display
   * @returns {string} Summary
   */
  getSummary() {
    const age = this.getAgeMinutes();
    const ageText = age === 0 ? 'just now' : `${age}m ago`;
    return `[${this.type.toUpperCase()}] ${ageText}: ${this.text.substring(0, 50)}...`;
  }
}

module.exports = PingEvent;
