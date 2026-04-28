# CrisisLink Setup Guide

## Prerequisites

- **Node.js**: v16 or higher
- **npm**: Comes with Node.js

Verify installation:
```bash
node --version
npm --version
```

## Quick Start

### 1. Install & Start Backend
```bash
cd backend
npm install
npm start
```

### 2. Install & Start Frontend (New Terminal)
```bash
cd frontend
npm install
npm start
```

## Testing

Run backend tests:
```bash
cd backend
node __tests__/test_processor.js
node __tests__/test_store.js
node __tests__/test_reputation.js
node __tests__/test_escalation.js
```

## Troubleshooting

- **Port in use**: Kill process on port 3000/3001 or restart computer
- **CORS errors**: Ensure backend is running on :3001
- **Mic not working**: Allow permissions in browser settings

## Multi-Device Setup

1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. On phones: open browser to `http://YOUR_IP:3000`

Ready to demo!








crisislink/
├── README.md                    ✓ Project overview
├── ARCHITECTURE.md              ✓ System design
├── SETUP.md                     ✓ Installation guide
│
├── backend/                     ✓ 1300+ lines
│   ├── package.json
│   ├── server.js                ← Main Express server (8 endpoints)
│   ├── VoiceProcessor.js        ← Detect incident type/urgency
│   ├── PingEvent.js             ← Event data structure
│   ├── EventStore.js            ← In-memory storage + queries
│   ├── ReputationEngine.js      ← Trust score calculation
│   ├── EscalationTimer.js       ← Radius expansion logic
│   └── __tests__/
│       ├── test_processor.js
│       ├── test_store.js
│       ├── test_reputation.js
│       └── test_escalation.js
│
└── frontend/                    ✓ 1200+ lines
    ├── package.json
    ├── public/index.html
    └── src/
        ├── index.js
        ├── App.js
        ├── App.css
        ├── components/
        │   ├── VoiceRecorder.jsx  ← Record + post incidents
        │   ├── EventFeed.jsx        ← List incidents
        │   └── EventCard.jsx        ← Single incident card
        ├── styles/
        │   ├── VoiceRecorder.css
        │   ├── EventFeed.css
        │   └── EventCard.css
        └── services/
            └── TTSService.js        ← Text-to-speech