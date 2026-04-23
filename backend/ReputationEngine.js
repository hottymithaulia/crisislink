/**
 * ReputationEngine.js
 * Calculates trust scores for users based on their report accuracy.
 * Uses (confirmations - fakes) / total_posts formula.
 */

class ReputationEngine {
  constructor() {
    // Display tiers for reputation scores
    this.tiers = {
      trusted: {
        minScore: 0.8,
        color: '#22c55e', // Green
        icon: '✓',
        label: 'Trusted',
        description: 'Highly reliable reporter'
      },
      neutral: {
        minScore: 0.5,
        color: '#f59e0b', // Yellow/Orange
        icon: '⚠',
        label: 'Unverified',
        description: 'Average reliability'
      },
      unverified: {
        minScore: 0,
        color: '#9ca3af', // Gray
        icon: '?',
        label: 'Low Trust',
        description: 'Unreliable or new reporter'
      }
    };
  }

  /**
   * Calculate reputation score for a user
   * @param {string} userId - User ID
   * @param {Object} userRepData - User reputation data from EventStore
   * @returns {number} Score between 0.0 and 1.0
   */
  calculateScore(userId, userRepData) {
    if (!userRepData || userRepData.total === 0) {
      return 0.5; // New users start at neutral (50%)
    }

    // Formula: (confirmations - fakes) / total_posts
    const confirmed = userRepData.confirmed || 0;
    const fakes = userRepData.fakes || 0;
    const total = userRepData.total || 1;

    let score = (confirmed - fakes) / total;
    
    // Clamp to 0-1 range
    score = Math.max(0, Math.min(1, score));
    
    return score;
  }

  /**
   * Add a confirmation to an event and update author's reputation
   * @param {string} eventId - Event ID
   * @param {string} authorUserId - Author's user ID
   * @param {EventStore} eventStore - EventStore instance
   * @returns {Object} Updated reputation data
   */
  addConfirmation(eventId, authorUserId, eventStore) {
    const event = eventStore.getEventById(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Update event confirmation count
    event.addConfirmation(authorUserId);

    // Update author's reputation
    eventStore.updateUserReputation(authorUserId, { confirmed: 1 });

    // Recalculate score
    const userRep = eventStore.getUserReputation(authorUserId);
    const newScore = this.calculateScore(authorUserId, userRep);

    console.log(`✅ Confirmation added to ${eventId}. Author ${authorUserId} score: ${(newScore * 100).toFixed(0)}%`);

    return {
      eventId,
      confirmations: event.confirmations,
      authorReputation: newScore,
      authorReputationPercent: Math.round(newScore * 100)
    };
  }

  /**
   * Add a fake report to an event and update author's reputation (harsh penalty)
   * @param {string} eventId - Event ID
   * @param {string} authorUserId - Author's user ID
   * @param {EventStore} eventStore - EventStore instance
   * @returns {Object} Updated reputation data
   */
  addFakeReport(eventId, authorUserId, eventStore) {
    const event = eventStore.getEventById(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Update event fake count
    event.addFake(authorUserId);

    // Update author's reputation (fakes have higher weight - penalty)
    eventStore.updateUserReputation(authorUserId, { fakes: 1 });

    // Recalculate score
    const userRep = eventStore.getUserReputation(authorUserId);
    const newScore = this.calculateScore(authorUserId, userRep);

    console.log(`❌ Fake report added to ${eventId}. Author ${authorUserId} score: ${(newScore * 100).toFixed(0)}%`);

    return {
      eventId,
      fakes: event.fakes,
      authorReputation: newScore,
      authorReputationPercent: Math.round(newScore * 100)
    };
  }

  /**
   * Get display information for a reputation score
   * @param {number} reputationScore - Score between 0.0 and 1.0
   * @returns {Object} Display tier information
   */
  getDisplayTier(reputationScore) {
    if (reputationScore >= this.tiers.trusted.minScore) {
      return { ...this.tiers.trusted, tier: 'trusted' };
    } else if (reputationScore >= this.tiers.neutral.minScore) {
      return { ...this.tiers.neutral, tier: 'neutral' };
    } else {
      return { ...this.tiers.unverified, tier: 'unverified' };
    }
  }

  /**
   * Convert score to percentage (0-100)
   * @param {number} reputationScore - Score between 0.0 and 1.0
   * @returns {number} Percentage (0-100)
   */
  getPercentage(reputationScore) {
    return Math.round(reputationScore * 100);
  }

  /**
   * Get reputation trend indicator
   * @param {number} currentScore - Current score
   * @param {number} previousScore - Previous score (optional)
   * @returns {Object} Trend info
   */
  getTrend(currentScore, previousScore = null) {
    if (previousScore === null) {
      return { direction: 'stable', icon: '→', label: 'Stable' };
    }

    const diff = currentScore - previousScore;
    if (diff > 0.05) {
      return { direction: 'up', icon: '↑', label: 'Improving', color: '#22c55e' };
    } else if (diff < -0.05) {
      return { direction: 'down', icon: '↓', label: 'Declining', color: '#ef4444' };
    } else {
      return { direction: 'stable', icon: '→', label: 'Stable', color: '#9ca3af' };
    }
  }

  /**
   * Calculate network-wide trust metrics
   * @param {EventStore} eventStore - EventStore instance
   * @returns {Object} Network statistics
   */
  getNetworkStats(eventStore) {
    let totalUsers = 0;
    let trustedUsers = 0;
    let neutralUsers = 0;
    let unverifiedUsers = 0;
    let totalConfirmations = 0;
    let totalFakes = 0;

    for (const [userId, repData] of eventStore.userReputation) {
      totalUsers++;
      const score = this.calculateScore(userId, repData);
      const tier = this.getDisplayTier(score);

      if (tier.tier === 'trusted') trustedUsers++;
      else if (tier.tier === 'neutral') neutralUsers++;
      else unverifiedUsers++;

      totalConfirmations += repData.confirmed || 0;
      totalFakes += repData.fakes || 0;
    }

    return {
      totalUsers,
      trustedUsers,
      neutralUsers,
      unverifiedUsers,
      totalConfirmations,
      totalFakes,
      averageConfirmationRate: totalUsers > 0 ? totalConfirmations / totalUsers : 0
    };
  }
}

module.exports = ReputationEngine;
