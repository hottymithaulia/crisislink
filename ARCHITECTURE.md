# CrisisLink Architecture

## System Overview

CrisisLink is a client-server architecture designed for local network deployment. The system prioritizes speed, reliability, and low bandwidth usage.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS (Phones)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Phone A    │  │  Phone B    │  │  Phone C    │         │
│  │  (Reporter) │  │ (Responder) │  │  (Viewer)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼───────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │ HTTP/REST
              ┌────────────▼────────────┐
              │      Express Server       │
              │       (Backend)           │
              │    http://localhost:3001  │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │      Services Layer       │
              │  ┌─────────────────────┐  │
              │  │   EventStore        │  │
              │  │   (In-Memory DB)    │  │
              │  └─────────────────────┘  │
              │  ┌─────────────────────┐  │
              │  │   ReputationEngine  │  │
              │  │   (Trust Scores)      │  │
              │  └─────────────────────┘  │
              │  ┌─────────────────────┐  │
              │  │   EscalationTimer   │  │
              │  │   (Auto-Expand)     │  │
              │  └─────────────────────┘  │
              │  ┌─────────────────────┐  │
              │  │   VoiceProcessor    │  │
              │  │   (Text Analysis)   │  │
              │  └─────────────────────┘  │
              └───────────────────────────┘
```

## Core Components

### 1. Backend Services

#### EventStore (`EventStore.js`)
- **Purpose**: In-memory storage for all incidents
- **Data Structure**: `Map<string, PingEvent>` for O(1) lookups
- **Features**:
  - Add/retrieve events
  - Location-based queries (Haversine formula)
  - User reputation tracking
  - Serialization for persistence

#### PingEvent (`PingEvent.js`)
- **Purpose**: Data structure for a single incident
- **Fields**:
  - `id`: Unique identifier
  - `user_id`: Reporter identity
  - `type`: Incident category (accident, fire, medical, etc.)
  - `urgency`: Priority level (critical, high, medium, low)
  - `lat/lon`: GPS coordinates
  - `timestamp`: Creation time
  - `confirmations/fakes`: Verification counts
  - `escalation_state`: Current visibility stage

#### ReputationEngine (`ReputationEngine.js`)
- **Purpose**: Calculate user trust scores
- **Formula**: `(confirmations - fakes) / total_posts`
- **Tiers**:
  - 80%+: Trusted (Green)
  - 50-80%: Neutral (Yellow)
  - <50%: Unverified (Gray)

#### EscalationTimer (`EscalationTimer.js`)
- **Purpose**: Auto-expand incident visibility over time
- **Stages**:
  | Stage | Time | Radius | Color |
  |-------|------|--------|-------|
  | Hyperlocal | 0-5 min | 1 km | Blue |
  | Neighborhood | 5-15 min | 5 km | Yellow |
  | Unresolved | 15+ min | 25 km | Red |

#### VoiceProcessor (`VoiceProcessor.js`)
- **Purpose**: Auto-classify incident type and urgency
- **Method**: Keyword matching
- **Event Types**: accident, fire, medical, flood, police, hazmat
- **Urgency Levels**: critical, high, medium, low

### 2. Frontend Components

#### App (`App.js`)
- Root component
- Manages user location
- Displays header, VoiceRecorder, EventFeed

#### VoiceRecorder (`VoiceRecorder.jsx`)
- Records audio from microphone
- Provides manual text input fallback
- Posts to `/events` endpoint

#### EventFeed (`EventFeed.jsx`)
- Polls `/events/nearby` every 3 seconds
- Groups events by urgency
- Handles confirm/fake actions

#### EventCard (`EventCard.jsx`)
- Displays single incident
- Shows trust badge, escalation status
- Action buttons: Confirm, Fake, Respond, Hear

#### TTSService (`TTSService.js`)
- Uses Web Speech API
- Reads incident summaries aloud
- Provides accessibility

## Data Flow

### 1. Reporting an Incident

```
User → VoiceRecorder → POST /events → VoiceProcessor.analyze()
                                          ↓
                                    Create PingEvent
                                          ↓
                                    EventStore.add()
                                          ↓
                                    Response: { eventId }
```

### 2. Viewing Nearby Incidents

```
EventFeed → GET /events/nearby?lat=&lon= → EventStore.getNearby()
                                               ↓
                                         Calculate distances
                                               ↓
                                         Add escalation info
                                               ↓
                                         Return JSON array
                                               ↓
                                         Render EventCards
```

### 3. Confirming an Incident

```
User clicks "Confirm" → POST /events/:id/confirm
                              ↓
                        ReputationEngine.addConfirmation()
                              ↓
                        Update author reputation
                              ↓
                        Increment event.confirmations
                              ↓
                        Return updated counts
```

## Network Design

### Local Wi-Fi Deployment

```
Router/Switch (No Internet Required)
    │
    ├─→ Laptop (Backend: 192.168.1.10:3001)
    │
    ├─→ Phone A (Frontend: 192.168.1.10:3000)
    │
    ├─→ Phone B (Frontend: 192.168.1.10:3000)
    │
    └─→ Phone C (Frontend: 192.168.1.10:3000)
```

All devices connect to the same local network. The laptop running the backend acts as the central hub.

### Data Packet Size

Serialized PingEvent: ~300-400 bytes
- Small enough for Bluetooth/BLE transmission (future)
- Efficient for low-bandwidth scenarios

## Security Considerations

1. **No Authentication**: Hackathon MVP - relies on reputation system
2. **Local Network Only**: Not exposed to internet
3. **Rate Limiting**: EventStore.maxEvents = 1000 prevents memory exhaustion
4. **Input Validation**: Express validates all incoming data
5. **CORS**: Configured for local development

## Scalability Notes

Current implementation:
- Single server instance
- In-memory storage (resets on restart)
- Suitable for < 100 concurrent users

Production would require:
- Database (MongoDB/PostgreSQL)
- Redis for caching
- WebSockets for real-time updates
- Load balancing
- Authentication system

## Module Dependencies

```
server.js
    ├── PingEvent.js (no deps)
    ├── EventStore.js (requires PingEvent)
    ├── ReputationEngine.js (requires EventStore)
    ├── EscalationTimer.js (requires EventStore, PingEvent)
    └── VoiceProcessor.js (no deps)

React Frontend
    ├── App.js
    │   ├── VoiceRecorder.jsx
    │   └── EventFeed.jsx
    │       └── EventCard.jsx
    │           └── TTSService.js
```

## Testing Strategy

Each backend module has isolated tests:
- `test_processor.js`: Keyword matching accuracy
- `test_store.js`: CRUD operations, distance calculations
- `test_reputation.js`: Score calculations, tier assignments
- `test_escalation.js`: Stage transitions, timing

Frontend tested manually via browser interaction.

---

Architecture designed for hackathon constraints: simple, fast, demo-ready.
