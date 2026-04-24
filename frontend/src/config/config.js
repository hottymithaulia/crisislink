/**
 * CrisisLink Frontend Configuration
 * Central configuration for all frontend settings
 */

const config = {
  // API Configuration
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://192.168.1.6:3001',
    wsUrl: process.env.REACT_APP_WS_URL || 'http://192.168.1.6:3001', // WebSocket server URL - MUST be laptop's hotspot IP for phone connectivity
    timeout: 15000, // 15 seconds
    retryAttempts: 2,
    retryDelay: 2000 // 2 seconds
  },

  // Map Configuration
  map: {
    defaultCenter: {
      lat: 19.9762, // Indore, India
      lon: 75.8456
    },
    defaultZoom: 13,
    maxRadius: 25, // Maximum search radius in km
    updateInterval: 3000 // Event feed update interval (ms)
  },

  // Voice Recording Configuration
  voice: {
    maxRecordingDuration: 60000, // 60 seconds
    sampleRate: 44100,
    channels: 1,
    mimeType: 'audio/webm',
    enabledFeatures: {
      recording: true,
      textInput: true,
      speechToText: false // Future: Whisper.cpp integration
    }
  },

  // UI Configuration
  ui: {
    theme: {
      primary: '#3b82f6',
      secondary: '#f59e0b',
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#06b6d4'
    },
    animation: {
      duration: 300,
      easing: 'ease-in-out'
    },
    pagination: {
      eventsPerPage: 20
    }
  },

  // User Configuration
  user: {
    location: {
      enableGeolocation: true,
      accuracy: 'high',
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    },
    storage: {
      prefix: 'crisislink_',
      keys: {
        userId: 'user_id',
        preferences: 'preferences',
        lastLocation: 'last_location'
      }
    }
  },

  // Feature Flags
  features: {
    meshNetwork: process.env.REACT_APP_MESH_NETWORK === 'true',
    offlineMode: process.env.REACT_APP_OFFLINE_MODE === 'true',
    analytics: false,
    debugging: process.env.NODE_ENV === 'development'
  },

  // Event Types Configuration
  eventTypes: {
    accident: {
      label: 'Accident',
      color: '#ef4444',
      icon: '🚗'
    },
    fire: {
      label: 'Fire',
      color: '#f97316',
      icon: '🔥'
    },
    medical: {
      label: 'Medical',
      color: '#ec4899',
      icon: '🏥'
    },
    flood: {
      label: 'Flood',
      color: '#3b82f6',
      icon: '🌊'
    },
    police: {
      label: 'Police',
      color: '#8b5cf6',
      icon: '👮'
    },
    hazmat: {
      label: 'Hazardous Material',
      color: '#84cc16',
      icon: '☢️'
    }
  },

  // Urgency Levels Configuration
  urgencyLevels: {
    critical: {
      label: 'Critical',
      color: '#dc2626',
      priority: 3
    },
    high: {
      label: 'High',
      color: '#ea580c',
      priority: 2
    },
    medium: {
      label: 'Medium',
      color: '#d97706',
      priority: 1
    }
  },

  // Reputation Tiers Configuration
  reputationTiers: {
    trusted: {
      label: 'Trusted',
      color: '#22c55e',
      icon: '✓'
    },
    neutral: {
      label: 'Unverified',
      color: '#f59e0b',
      icon: '⚠'
    },
    unverified: {
      label: 'Low Trust',
      color: '#9ca3af',
      icon: '?'
    }
  },

  // System Status Configuration
  systemStatus: {
    endpoints: [
      { method: 'POST', path: '/events', name: 'Create Event' },
      { method: 'GET', path: '/events/nearby', name: 'Get Nearby Events' },
      { method: 'POST', path: '/events/:id/confirm', name: 'Confirm Event' },
      { method: 'POST', path: '/events/:id/fake', name: 'Report Fake' },
      { method: 'GET', path: '/status', name: 'System Status' },
      { method: 'GET', path: '/health', name: 'Health Check' }
    ],
    checkInterval: 30000 // Check system status every 30 seconds
  }
};

// Export configuration
export default config;
