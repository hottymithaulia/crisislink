/**
 * EscalationTimer.js
 * Manages the automatic expansion of incident visibility over time.
 * Events escalate through stages: hyperlocal → neighborhood → unresolved
 */

class EscalationTimer {
  constructor(config = {}) {
    // Configuration injection
    this.config = {
      stages: config.stages || {
        hyperlocal: {
          minMinutes: 0,
          maxMinutes: 5,
          radiusKm: 1,
          color: '#3b82f6', // Blue
          label: 'Hyperlocal (1 km)',
          description: 'Immediate vicinity only'
        },
        neighborhood: {
          minMinutes: 5,
          maxMinutes: 15,
          radiusKm: 5,
          color: '#f59e0b', // Yellow/Orange
          label: 'Neighborhood (5 km)',
          description: 'Expanding to neighborhood'
        },
        unresolved: {
          minMinutes: 15,
          maxMinutes: Infinity,
          radiusKm: 25,
          color: '#ef4444', // Red
          label: 'Unresolved (25 km)',
          description: 'Requires authority attention',
          triggersCloudEscalation: true
        }
      },
      checkIntervalSeconds: config.checkIntervalSeconds || 10,
      ...config
    };
    
    // Escalation stages configuration
    this.escalationStages = this.config.stages;
  }

  /**
   * Check all events and update their escalation state
   * @param {EventStore} eventStore - EventStore instance
   * @returns {number} Number of events updated
   */
  checkAndEscalate(eventStore) {
    let updatedCount = 0;

    for (const event of eventStore.events.values()) {
      const ageMinutes = event.getAgeMinutes();
      const previousState = event.escalation_state;
      
      // Determine current stage based on age
      let newStage = 'hyperlocal';
      for (const [stageName, stageConfig] of Object.entries(this.escalationStages)) {
        if (ageMinutes >= stageConfig.minMinutes && ageMinutes < stageConfig.maxMinutes) {
          newStage = stageName;
          break;
        }
        // Handle infinity for unresolved
        if (stageConfig.maxMinutes === Infinity && ageMinutes >= stageConfig.minMinutes) {
          newStage = stageName;
        }
      }

      // Update event if stage changed
      if (newStage !== previousState) {
        const stageInfo = this.escalationStages[newStage];
        
        event.escalation_state = newStage;
        event.current_radius_km = stageInfo.radiusKm;
        event.escalation_color = stageInfo.color;
        event.escalation_label = stageInfo.label;
        
        // Check if should escalate to cloud (authorities)
        if (stageInfo.triggersCloudEscalation) {
          event.needs_cloud_escalation = true;
          console.log(`☁️ Event ${event.id} escalated to cloud (unresolved for ${ageMinutes} min)`);
        }

        console.log(`⬆️ Event ${event.id} escalated: ${previousState} → ${newStage} (${ageMinutes}m old)`);
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Get stage configuration by name
   * @param {string} escalationState - State name
   * @returns {Object} Stage configuration
   */
  getStageInfo(escalationState) {
    return this.escalationStages[escalationState] || this.escalationStages.hyperlocal;
  }

  /**
   * Get human-readable label for an event
   * @param {PingEvent} event - Event object
   * @returns {string} Display label
   */
  getLabel(event) {
    const ageMinutes = event.getAgeMinutes();
    const ageText = ageMinutes === 0 ? 'just now' : `${ageMinutes}m ago`;
    const stage = this.getStageInfo(event.escalation_state);
    
    return `Posted ${ageText} - ${stage.label}`;
  }

  /**
   * Get color for an event based on escalation state
   * @param {PingEvent} event - Event object
   * @returns {string} Hex color code
   */
  getColor(event) {
    return this.getStageInfo(event.escalation_state).color;
  }

  /**
   * Get current radius for an event
   * @param {PingEvent} event - Event object
   * @returns {number} Radius in km
   */
  getRadius(event) {
    return this.getStageInfo(event.escalation_state).radiusKm;
  }

  /**
   * Check if an event needs cloud escalation
   * @param {PingEvent} event - Event object
   * @returns {boolean} True if needs cloud escalation
   */
  needsCloudEscalation(event) {
    const stage = this.getStageInfo(event.escalation_state);
    return stage.triggersCloudEscalation || false;
  }

  /**
   * Get time until next escalation
   * @param {PingEvent} event - Event object
   * @returns {Object} Time info { minutesUntilNext, nextStage }
   */
  getTimeUntilNextEscalation(event) {
    const ageMinutes = event.getAgeMinutes();
    const currentStage = event.escalation_state;
    
    // Find next stage
    const stages = Object.keys(this.escalationStages);
    const currentIndex = stages.indexOf(currentStage);
    const nextStage = stages[currentIndex + 1];
    
    if (!nextStage) {
      return { minutesUntilNext: null, nextStage: null };
    }
    
    const nextConfig = this.escalationStages[nextStage];
    const minutesUntilNext = Math.max(0, nextConfig.minMinutes - ageMinutes);
    
    return { minutesUntilNext, nextStage };
  }

  /**
   * Force escalate an event (for testing or manual override)
   * @param {PingEvent} event - Event to escalate
   * @param {string} targetStage - Target stage name
   */
  forceEscalate(event, targetStage) {
    if (!this.escalationStages[targetStage]) {
      throw new Error(`Invalid escalation stage: ${targetStage}`);
    }

    const stageInfo = this.escalationStages[targetStage];
    
    event.escalation_state = targetStage;
    event.current_radius_km = stageInfo.radiusKm;
    event.escalation_color = stageInfo.color;
    event.escalation_label = stageInfo.label;
    
    if (stageInfo.triggersCloudEscalation) {
      event.needs_cloud_escalation = true;
    }

    console.log(`🔄 Event ${event.id} manually escalated to ${targetStage}`);
  }

  /**
   * Get all escalation stages info
   * @returns {Object} All stages configuration
   */
  getAllStages() {
    return this.escalationStages;
  }

  /**
   * Check if an event is visible at a given radius
   * @param {PingEvent} event - Event object
   * @param {number} distanceKm - Distance from user in km
   * @returns {boolean} True if visible
   */
  isVisibleAtDistance(event, distanceKm) {
    return distanceKm <= event.current_radius_km;
  }
}

module.exports = EscalationTimer;
