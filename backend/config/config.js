/**
 * CrisisLink Backend Configuration
 * Master control file for all system settings
 */

module.exports = {
  // Server Configuration
  // NOTE: 0.0.0.0 is required for WiFi hotspot accessibility from phones
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: true, // Allow all origins in development
      credentials: true
    }
  },

  // Event Store Configuration
  eventStore: {
    maxEvents: process.env.MAX_EVENTS || 1000,
    retentionHours: process.env.RETENTION_HOURS || 24,
    cleanupIntervalMinutes: 60
  },

  // Escalation Configuration
  escalation: {
    stages: {
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
    checkIntervalSeconds: 10
  },

  // Reputation System Configuration
  reputation: {
    tiers: {
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
    },
    defaultScore: 0.5,
    fakePenaltyMultiplier: 1.0
  },

  // Voice Processing Configuration
  voice: {
    eventTypes: {
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
    },
    urgencyKeywords: {
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
    }
  },

  // Network Configuration
  network: {
    mesh: {
      enabled: process.env.MESH_ENABLED === 'true' || true, // Enable by default in development
      simulationMode: true,
      maxHops: 8,
      propagationDelayMs: 100,
      nodeTimeoutMs: 30000,
      adaptiveRouting: true,
      messageCompression: true,
      batterySimulation: true
    }
  },

  // API Configuration
  api: {
    version: 'v1',
    prefix: '/api',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined'
  }
};
