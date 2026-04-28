<p align="center">
  <img src="https://github.com/user-attachments/assets/d0c6ee8f-0eb5-4947-bf47-d48ffc3d844e" alt="CrisisLink Logo" width="160" />
</p>

<h1 align="center">CrisisLink</h1>
<p align="center"><em>Voice-first · Hyperlocal · Offline-capable Emergency Reporting</em></p>

---

A real-time emergency reporting platform that connects communities during crises through mesh networking and reputation-based validation.

## Overview

CrisisLink enables instant incident reporting through voice or text, with automatic escalation from hyperlocal (1 km) to neighbourhood (5 km) to city-wide (25 km) visibility. Built for scenarios where traditional communication may be unavailable.

### Key Features

- 🎤 **Voice-First Reporting** — Record voice incidents or type descriptions
- 📍 **Location-Based** — Automatic geolocation and radius-based queries
- 🏆 **Reputation System** — Trust scoring to prevent misinformation
- ⏰ **Auto-Escalation** — Incidents expand visibility over time if unresolved
- 🌐 **Mesh Network** — Offline peer-to-peer message propagation
- 🔊 **Accessibility** — Text-to-speech for incident announcements
- 📱 **Mobile-Ready** — Responsive design for phones and tablets

## Quick Start

```bash
# Clone repository
git clone https://github.com/hottymithaulia/crisislink.git
cd crisislink

# Install & run backend (Terminal 1)
cd backend && npm install && npm start
# Server: http://localhost:3001

# Install & run frontend (Terminal 2)
cd frontend && npm install && npm run dev
# App: http://localhost:5173
```

Or use the convenience script from the root:

```bash
python run_all.py
```

## Project Structure

```
crisislink/
├── backend/        ← Node.js + Express API & Socket.IO server
├── frontend/       ← React (Vite + TanStack Router) SPA
├── docs/           ← Architecture docs, API spec, setup guides
└── run_all.py      ← One-command launcher for both services
```

Full architecture, API reference, and deployment notes are in [`docs/README.md`](docs/README.md).

## License

MIT — see [LICENSE](LICENSE) for details.

---

**Built with ❤️ by Team EpochZero for emergency response and community resilience**
