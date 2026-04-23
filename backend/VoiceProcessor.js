/**
 * VoiceProcessor.js
 * Analyzes transcribed voice input to detect incident type and urgency level.
 * No external dependencies - pure keyword matching algorithm.
 */

class VoiceProcessor {
  constructor() {
    // Event type keywords - maps keywords to incident types
    this.eventTypes = {
      accident: [
        'accident', 'crash', 'collision', 'hit', 'blocked', 'car', 'vehicle',
        'traffic', 'pileup', 'wreck', 'fender bender', 'rear ended', 'side swiped'
      ],
      fire: [
        'fire', 'burning', 'smoke', 'flames', 'burn', 'blaze', 'inferno',
        'wildfire', 'house fire', 'building fire', 'explosion', 'combustion'
      ],
      medical: [
        'injury', 'sick', 'help', 'ambulance', 'hurt', 'doctor', 'hospital',
        'emergency', 'bleeding', 'unconscious', 'not breathing', 'heart attack',
        'wound', 'pain', 'fainted', 'seizure', 'allergic', 'overdose'
      ],
      flood: [
        'flood', 'water', 'drowning', 'wet', 'submerged', 'overflow',
        'rising water', 'storm surge', 'flash flood', 'levee', 'dam break'
      ],
      police: [
        'police', 'theft', 'robbery', 'stolen', 'crime', 'attack', 'violence',
        'gun', 'shooter', 'assault', 'fight', 'disturbance', 'suspicious'
      ],
      hazmat: [
        'chemical', 'gas leak', 'toxic', 'spill', 'radiation', 'hazardous',
        'fumes', 'smell', 'odor', 'contamination'
      ]
    };

    // Urgency level keywords
    this.urgencyKeywords = {
      critical: [
        'urgent', 'critical', 'dying', 'fire', 'help me', 'bleeding',
        'unconscious', '911', 'dying', 'dead', 'life threatening', 'save me',
        'trapped', 'cant breathe', 'dying', 'emergency', 'dying person'
      ],
      high: [
        'accident', 'stuck', 'injured', 'hurt', 'pain', 'trapped',
        'wounded', 'severe', 'serious', 'major', 'dangerous', 'scary',
        'ambulance needed', 'hospital needed', 'police needed'
      ],
      medium: [
        'issue', 'problem', 'alert', 'warning', 'concern', 'careful',
        'watch out', 'be careful', 'potential', 'might be', 'looks like'
      ]
    };
  }

  /**
   * Main public method to analyze voice input
   * @param {string} transcribedText - The transcribed voice text
   * @returns {Object} Analysis result with type, urgency, confidence scores
   */
  analyzeVoiceInput(transcribedText) {
    if (!transcribedText || typeof transcribedText !== 'string') {
      return {
        success: false,
        type: 'incident',
        urgency: 'low',
        text: transcribedText || '',
        confidence: { type: 0, urgency: 0 },
        error: 'Invalid input text'
      };
    }

    const text = transcribedText.toLowerCase();
    
    const detectedType = this.detectEventType(text);
    const detectedUrgency = this.detectUrgency(text);
    
    // Calculate confidence scores (0-1 scale)
    const typeConfidence = detectedType === 'incident' ? 0.3 : 0.7;
    const urgencyConfidence = detectedUrgency === 'low' ? 0.4 : 0.8;

    return {
      success: true,
      type: detectedType,
      urgency: detectedUrgency,
      text: transcribedText.trim(),
      confidence: {
        type: typeConfidence,
        urgency: urgencyConfidence
      }
    };
  }

  /**
   * Detect the type of incident from text
   * @param {string} text - Lowercase text to analyze
   * @returns {string} Detected event type
   */
  detectEventType(text) {
    const scores = {};
    
    // Score each event type based on keyword matches
    for (const [type, keywords] of Object.entries(this.eventTypes)) {
      scores[type] = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          scores[type] += 1;
          // Bonus for multi-word matches (more specific)
          if (keyword.includes(' ')) {
            scores[type] += 0.5;
          }
        }
      }
    }

    // Find the type with highest score
    let maxScore = 0;
    let detectedType = 'incident'; // default

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type;
      }
    }

    return detectedType;
  }

  /**
   * Detect urgency level from text
   * @param {string} text - Lowercase text to analyze
   * @returns {string} Detected urgency level
   */
  detectUrgency(text) {
    const scores = {
      critical: 0,
      high: 0,
      medium: 0
    };

    // Score each urgency level
    for (const [level, keywords] of Object.entries(this.urgencyKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          scores[level] += 1;
          // Critical keywords get extra weight
          if (level === 'critical') {
            scores[level] += 2;
          }
        }
      }
    }

    // Determine urgency based on highest score
    if (scores.critical > 0) {
      return 'critical';
    } else if (scores.high > scores.critical) {
      return 'high';
    } else if (scores.medium > 0) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get all detected keywords found in text (for debugging)
   * @param {string} text - Text to analyze
   * @returns {Object} Matched keywords by category
   */
  getMatchedKeywords(text) {
    const lowerText = text.toLowerCase();
    const matched = {
      types: {},
      urgency: {}
    };

    for (const [type, keywords] of Object.entries(this.eventTypes)) {
      matched.types[type] = keywords.filter(k => 
        lowerText.includes(k.toLowerCase())
      );
    }

    for (const [level, keywords] of Object.entries(this.urgencyKeywords)) {
      matched.urgency[level] = keywords.filter(k => 
        lowerText.includes(k.toLowerCase())
      );
    }

    return matched;
  }
}

module.exports = VoiceProcessor;
