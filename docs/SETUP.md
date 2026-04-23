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
