<p align="center">
  <img src="https://github.com/user-attachments/assets/d0c6ee8f-0eb5-4947-bf47-d48ffc3d844e" alt="CrisisLink Logo" width="140" />
</p>

# CrisisLink — Hyperlocal Crisis Network

A voice-first, real-time emergency reporting system that connects communities during crises through mesh networking and reputation-based validation.

## 🎯 Overview

CrisisLink enables instant incident reporting through voice or text, with automatic escalation from hyperlocal (1km) to neighborhood (5km) to city-wide (25km) visibility. Built for hackathons and emergency response scenarios where traditional communication may be unavailable.

### Key Features

- 🎤 **Voice-First Reporting**: Record voice incidents or type descriptions
- 📍 **Location-Based**: Automatic geolocation and radius-based queries
- 🏆 **Reputation System**: Trust scoring to prevent misinformation
- ⏰ **Auto-Escalation**: Incidents expand visibility over time if unresolved
- 🌐 **Mesh Network**: Offline peer-to-peer message propagation
- 🔊 **Accessibility**: Text-to-speech for incident announcements
- 📱 **Mobile-Ready**: Responsive design for phones and tablets

## 🏗️ System Architecture

### Backend (Node.js + Express)
```
backend/
├── config/
│   └── config.js          ← MASTER CONTROL FILE
├── core/
│   ├── server.js          ← Minimal startup script
│   └── app.js             ← Express setup & middleware
├── routes/
│   ├── events.routes.js   ← Event CRUD operations
│   ├── voice.routes.js    ← Voice processing endpoints
│   └── status.routes.js   ← System monitoring
├── services/
│   ├── EventStore.js      ← In-memory event storage
│   ├── ReputationEngine.js← Trust scoring system
│   ├── EscalationTimer.js ← Auto-escalation logic
│   ├── VoiceProcessor.js  ← Incident type detection
│   └── PingEvent.js       ← Event data model
├── api/
│   └── response.js        ← Standard API format
└── network/
    └── mesh.simulator.js  ← P2P message simulation
```

### Frontend (React)
```
frontend/
├── src/
│   ├── api/
│   │   └── api.js         ← Centralized API client
│   ├── config/
│   │   └── config.js      ← Frontend configuration
│   ├── components/
│   │   ├── SystemStatus.jsx ← Real-time API monitoring
│   │   ├── VoiceRecorder.jsx ← Incident reporting
│   │   ├── EventFeed.jsx    ← Live incident feed
│   │   └── EventCard.jsx    ← Individual incident display
│   └── services/
│       └── TTSService.js    ← Text-to-speech
```

## 🔄 How It Works

### 1. Incident Reporting
1. User opens app → automatic location detection
2. Records voice or types incident description
3. VoiceProcessor analyzes text → detects type & urgency
4. Event created in EventStore with 1km visibility radius

### 2. Reputation System
- New users start at 50% trust score
- Confirmations increase score, fake reports decrease
- Three tiers: Trusted (80%+), Unverified (50-79%), Low Trust (<50%)
- Score displayed on each incident

### 3. Auto-Escalation
- **0-5 min**: 1km radius (hyperlocal)
- **5-15 min**: 5km radius (neighborhood)  
- **15+ min**: 25km radius (city-wide, triggers cloud escalation)

### 4. Mesh Network (Simulation)
- Events propagate through connected nodes
- Each node represents a device/station
- Demonstrates offline communication capability

## 📡 API Endpoints

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Create new incident |
| GET | `/events/nearby` | Get incidents within radius |
| POST | `/events/:id/confirm` | Confirm incident is real |
| POST | `/events/:id/fake` | Report incident as fake |
| GET | `/events/all` | Get all events (admin) |

### Voice Processing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/voice/analyze` | Analyze text for incident type |
| GET | `/voice/types` | Get supported incident types |
| GET | `/voice/keywords` | Get detection keywords |

### System Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Full system status |
| GET | `/status/endpoints` | API endpoint health |
| GET | `/status/mesh` | Mesh network status |
| GET | `/health` | Basic health check |

### API Response Format
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-04-23T18:30:00.000Z"
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Modern browser with Web Audio API

### Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/crisislink.git
   cd crisislink
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the System

1. **Start Backend Server** (Terminal 1)
   ```bash
   cd backend
   npm start
   ```
   Server runs on `http://localhost:3001`

2. **Start Frontend** (Terminal 2)
   ```bash
   cd frontend
   npm start
   ```
   App opens at `http://localhost:3000`

3. **Open Browser**
   - Navigate to `http://localhost:3000`
   - Allow location access for full functionality
   - Check SystemStatus component for API health

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

Running tests covers:
- VoiceProcessor incident detection
- EventStore CRUD operations
- ReputationEngine scoring
- EscalationTimer timing logic

### Manual Testing

1. **Create Test Incident**
   - Click "Report Incident" button
   - Type: "Car accident on main road, people injured"
   - Submit → should appear in feed

2. **Test Reputation**
   - Click "✓ Confirm" on your own incident
   - Score should increase in SystemStatus

3. **Test Escalation**
   - Wait 5+ minutes → incident radius should expand
   - Check status for "neighborhood" stage

## 🔧 Configuration

### Backend Configuration (`backend/config/config.js`)
```javascript
module.exports = {
  server: {
    port: 3001,           // Server port
    cors: { ... }         // CORS settings
  },
  escalation: {
    stages: { ... }       // Timing and radius settings
  },
  reputation: {
    tiers: { ... }        // Trust score thresholds
  },
  // ... other settings
};
```

### Frontend Configuration (`frontend/src/config/config.js`)
```javascript
const config = {
  api: {
    baseUrl: 'http://localhost:3001',
    timeout: 10000
  },
  map: {
    defaultCenter: { lat: 19.9762, lon: 75.8456 },
    updateInterval: 3000
  },
  // ... other settings
};
```

## 🌐 Mesh Network

The mesh simulator demonstrates offline communication:

1. **Node Network**: 5 demo nodes in 2km range
2. **Message Propagation**: Events hop between connected nodes
3. **Visualization**: Real-time propagation tracking
4. **Statistics**: Network health and activity metrics

### Future Implementation
- Replace simulation with real Bluetooth/WebRTC
- Add device discovery and pairing
- Implement message encryption
- Add battery/power management

## 🔊 Voice Processing

Current implementation uses keyword matching. Future STT integration:

1. **Whisper.cpp Integration**
   - Replace keyword detection with actual speech-to-text
   - Add local processing for privacy
   - Support multiple languages

2. **Audio Processing Pipeline**
   ```javascript
   // Future architecture
   AudioRecorder → Whisper.cpp → VoiceProcessor → Event
   ```

## 📱 Mobile Deployment

### Progressive Web App (PWA)
```bash
# Build for production
cd frontend
npm run build

# Serve with any static server
npx serve -s build -l 3000
```

### Native Apps
- React Native for iOS/Android
- Capacitor for hybrid apps
- Expo for rapid prototyping

## 🔒 Security Considerations

### Current Implementation
- Input validation on all endpoints
- Rate limiting (100 requests/15min)
- CORS protection
- No sensitive data storage

### Production Hardening
- Add JWT authentication
- Implement HTTPS
- Add input sanitization
- Rate limiting per user
- Audit logging

## 📊 Monitoring & Analytics

### SystemStatus Component
- Real-time API endpoint health
- Backend connection status
- Endpoint response times
- Error tracking

### Metrics to Track
- Incident creation rate
- Confirmation/fake ratios
- User reputation distribution
- Geographic incident density
- System performance metrics

## 🚀 Deployment Options

### Development
```bash
# Backend
cd backend && npm start

# Frontend  
cd frontend && npm start
```

### Production
```bash
# Backend (PM2)
pm2 start backend/core/server.js --name crisislink-api

# Frontend (Nginx)
# Serve build/ folder with proper routing
```

### Docker
```dockerfile
# Multi-stage build for production
FROM node:16-alpine as builder
# ... build steps

FROM node:16-alpine as production
# ... runtime steps
```

## 🤝 Contributing

### Development Workflow
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Style
- ESLint for JavaScript
- Prettier for formatting
- Conventional commits
- Component-based architecture

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

### Issues & Bugs
- GitHub Issues for bug reports
- Check SystemStatus component first
- Review browser console for errors

### Feature Requests
- Submit as GitHub Issue
- Include use case and requirements
- Tag with `enhancement`

---

## 🎯 Hackathon Tips

### Demo Preparation
1. **Prepare Test Data**: Pre-create some incidents
2. **Mobile Testing**: Test on actual phones
3. **Offline Demo**: Show mesh network simulation
4. **Voice Demo**: Record actual voice incidents

### Common Issues
- **Location Denied**: App falls back to default coordinates
- **Microphone Blocked**: Use text input instead
- **CORS Errors**: Check backend is running on port 3001
- **Slow Loading**: Check network connection

### Impressive Features to Highlight
- Real-time collaboration (multiple users)
- Automatic escalation visualization
- Reputation system preventing fake news
- Mesh network for offline scenarios
- Voice-first accessibility

---

**Built with ❤️ for emergency response and community resilience**
