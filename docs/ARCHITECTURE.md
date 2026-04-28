# 🏛️ Architecture & Technical Design

CrisisLink is designed as a highly scalable, real-time Monorepo utilizing a modern Node.js + React stack. It leverages WebSockets for sub-second data synchronization and containerized deployment via Railway.

## The Tech Stack

### 1. Client / Frontend (React 19 + Vite)
- **Framework:** React 19 bootstrapped with Vite for instant HMR and optimized build times.
- **Routing:** `@tanstack/react-router` for declarative, type-safe navigation.
- **Styling:** Tailwind CSS v4 alongside custom Glassmorphism CSS for a highly legible, dark-mode "operations center" UI.
- **Mapping:** `react-leaflet` to render OpenStreetMap tiles and custom div-based pulsing markers.
- **Native Browser APIs:** 
  - `MediaRecorder API` for capturing and converting raw audio to base64.
  - `SpeechRecognition API` for real-time speech-to-text.
  - `Geolocation API` for precise spatial mapping.

### 2. Server / Backend (Node.js + Express)
- **Framework:** Express.js routing the REST architecture.
- **Real-Time Engine:** `Socket.IO` manages persistent WebSockets to all connected devices. When an incident is saved, it is instantly emitted (`io.emit('new_event')`) to all users.
- **In-Memory Store:** Custom `EventStore.js` utilizing geo-spatial radius querying (Haversine formula) to filter incidents based on the client's GPS.
- **AI Integration:** `@google/generative-ai` securely integrates Gemini 2.5 Flash.

---

## Data Flow & Lifecycle

1. **Client Acquisition:** User holds the Mic button. `VoiceFAB.tsx` records the audio blob and utilizes `window.webkitSpeechRecognition` to generate a text transcript.
2. **Payload Transmission:** The client packages the text, the base64 audio string, and their GPS coordinates into a JSON payload and POSTs to `/events`.
3. **AI Verification Layer:** The Express route passes the text to `GeminiService.analyzeReport`. Gemini evaluates the context against a rigid JSON schema, returning `is_genuine`, `type`, and `urgency`.
4. **Spam Rejection:** If `is_genuine` is false, or the GPS coordinates fall into an ocean/invalid zone (`SpamFilter.js`), the server aborts and returns a HTTP 422.
5. **Database Commit & Broadcast:** Valid events are instantiated as a `PingEvent`, stored in RAM (`EventStore`), and broadcast via Socket.IO to all devices.
6. **Client Render:** The React state captures the incoming Socket.IO payload and dynamically renders a pulsing Leaflet marker and appends it to the `EventFeed.tsx` sidebar.

---

## Deployment & Infrastructure
Both services are independently containerized and deployed on **Railway**. 
- The backend runs a standard Node runtime with environment variables injected at build time (`GEMINI_API_KEY`).
- The frontend is built by Vite and served as static assets, configured to securely route API requests to the Railway backend domain via `VITE_BACKEND_URL`.
