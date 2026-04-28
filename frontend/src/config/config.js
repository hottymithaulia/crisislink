/**
 * CrisisLink Frontend Configuration
 * Central configuration for all frontend settings
 */

const config = {
  // API Configuration - points to Node.js backend on port 3001
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    wsUrl: process.env.REACT_APP_WS_URL || 'http://localhost:3001',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Map Configuration
  map: {
    defaultCenter: {
      lat: 19.9762, // Default: Indore, India
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
      speechToText: false // Whisper.cpp disabled for MVP
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
        userId: 'crisislink_user_id',
        preferences: 'crisislink_preferences',
        lastLocation: 'crisislink_last_location'
      }
    }
  },

  // Feature Flags
  features: {
    meshNetwork: false, // Disabled for MVP
    offlineMode: false,
    analytics: false,
    debugging: process.env.NODE_ENV === 'development'
  },

  // Event Types Configuration
  eventTypes: {
    accident: { label: 'Accident', color: '#ef4444', icon: '🚗' },
    fire: { label: 'Fire', color: '#f97316', icon: '🔥' },
    medical: { label: 'Medical', color: '#ec4899', icon: '🏥' },
    flood: { label: 'Flood', color: '#3b82f6', icon: '🌊' },
    police: { label: 'Police', color: '#8b5cf6', icon: '👮' },
    hazmat: { label: 'Hazardous Material', color: '#84cc16', icon: '☢️' },
    incident: { label: 'Incident', color: '#6b7280', icon: '⚠️' }
  },

  // Urgency Levels Configuration
  urgencyLevels: {
    critical: { label: 'Critical', color: '#dc2626', priority: 3 },
    high: { label: 'High', color: '#ea580c', priority: 2 },
    medium: { label: 'Medium', color: '#d97706', priority: 1 },
    low: { label: 'Low', color: '#6b7280', priority: 0 }
  },

  // Reputation Tiers Configuration
  reputationTiers: {
    trusted: { label: 'Trusted', color: '#22c55e', icon: '✓' },
    neutral: { label: 'Unverified', color: '#f59e0b', icon: '⚠' },
    unverified: { label: 'Low Trust', color: '#9ca3af', icon: '?' }
  },

  // System Status Configuration
  systemStatus: {
    endpoints: [
      { method: 'GET', path: '/health', name: 'Health Check' },
      { method: 'GET', path: '/events/nearby', name: 'Get Nearby Events' },
      { method: 'POST', path: '/events', name: 'Create Event' },
      { method: 'POST', path: '/events/:id/confirm', name: 'Confirm Event' },
      { method: 'POST', path: '/events/:id/fake', name: 'Report Fake' },
      { method: 'GET', path: '/status', name: 'System Status' }
    ],
    checkInterval: 30000 // Check system status every 30 seconds
  }
};

export default config;
