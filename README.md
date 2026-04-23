# 🆘 CrisisLink

**Hyperlocal Crisis Network for Real-Time Community Alerts**

CrisisLink is a voice-first, peer-to-peer crisis reporting platform designed for hackathons and emergency situations. It enables communities to warn each other about local crises (accidents, fires, medical emergencies, floods, etc.) using voice input and real-time feeds.

## ✨ Key Features

- 🎤 **Voice-First Reporting** - Report incidents by voice without typing
- 📍 **Location-Aware** - Automatically detects your location for hyperlocal alerts
- 🔄 **Real-Time Feed** - Live updates every 3 seconds
- ✅ **Community Verification** - Users confirm or flag incidents
- 🏆 **Reputation System** - Trust scores prevent spam/misinformation
- ⏱️ **Auto-Escalation** - Incidents expand visibility radius over time:
  - **0-5 min**: 1km radius (Hyperlocal - Blue)
  - **5-15 min**: 5km radius (Neighborhood - Yellow)
  - **15+ min**: 25km radius (Unresolved - Red + Cloud Escalation)
- 🔊 **Text-to-Speech** - Incidents read aloud for accessibility

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### 1. Clone and Setup
```bash
cd crisislink
```

### 2. Start Backend
```bash
cd backend
npm install
npm start
```

Server will start at `http://localhost:3001`

### 3. Start Frontend
In a new terminal:
```bash
cd frontend
npm install
npm start
```

App will open at `http://localhost:3000`

## 📁 Project Structure

```
crisislink/
│
├── backend/
│   ├── server.js              # Main Express server
│   ├── VoiceProcessor.js      # Detect incident type/urgency
│   ├── PingEvent.js           # Event data structure
│   ├── EventStore.js          # In-memory storage + queries
│   ├── ReputationEngine.js    # Trust score calculation
│   ├── EscalationTimer.js     # Radius expansion logic
│   └── __tests__/             # Test files
│
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main app component
│   │   ├── components/
│   │   │   ├── VoiceRecorder.jsx    # Record + post incidents
│   │   │   ├── EventFeed.jsx        # List incidents
│   │   │   └── EventCard.jsx        # Single incident card
│   │   └── services/
│   │       └── TTSService.js        # Text-to-speech
│   └── public/
│
├── README.md
├── ARCHITECTURE.md
└── SETUP.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Create new incident |
| GET | `/events/nearby?lat=&lon=&radius=` | Get nearby incidents |
| POST | `/events/:id/confirm` | Confirm incident is real |
| POST | `/events/:id/fake` | Report incident as fake |
| GET | `/events/:id` | Get single incident |
| GET | `/events/all` | List all incidents (debug) |
| GET | `/status` | Server health check |
| POST | `/voice/analyze` | Analyze text without creating event |

## 🧪 Testing

Run individual backend tests:

```bash
cd backend

# Test voice processor
node __tests__/test_processor.js

# Test event store
node __tests__/test_store.js

# Test reputation engine
node __tests__/test_reputation.js

# Test escalation timer
node __tests__/test_escalation.js
```

## 🎯 Demo Scenario

1. **Phone A** (Reporter): Click "Record Incident" → Type "Car accident on Main Street blocking traffic" → Click "Post"
2. **Phone B** (Responder): Wait 3 seconds → See incident appear → Click "✓ Confirm"
3. **Phone A**: See confirmation count increase
4. **Phone C**: Click "🔊 Hear" to listen to incident
5. **All**: Watch escalation badge change from blue → yellow → red over time

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## ⚙️ Detailed Setup

See [SETUP.md](./SETUP.md) for troubleshooting and advanced configuration.

## 🌐 Works Without Internet

CrisisLink works on local Wi-Fi networks:
- Start backend on one device
- All phones connect to same Wi-Fi
- Access via local IP: `http://192.168.x.x:3000`

## 📝 License

MIT License - Hackathon Project

## 👥 Team

- **Krish** - Backend Developer
- **Teammate** - Frontend Developer

---

Built with ❤️ for hackathons. Stay safe!
