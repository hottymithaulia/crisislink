import React, { useState, useEffect, useCallback } from 'react';
import VoiceRecorder from './components/VoiceRecorder';
import EventFeed from './components/EventFeed';
import SystemStatus from './components/SystemStatus';
import StatsPanel from './components/StatsPanel';
import QRShare from './components/QRShare';
import CrisisMap from './components/CrisisMap';
import DemoVisualizer from './components/DemoVisualizer';
import apiService from './api/api';
import socketService from './services/socket';
import soundService from './services/SoundService';
import './App.css';

function App() {
  const [userLocation, setUserLocation] = useState({ lat: 19.9762, lon: 75.8456 });
  const [locationError, setLocationError]   = useState(null);
  const [backendStatus, setBackendStatus]   = useState('checking');
  const [connectedDevices, setConnectedDevices] = useState(0);
  const [activeTab, setActiveTab]           = useState('feed'); // 'feed' | 'map'
  const [soundOn, setSoundOn]               = useState(true);
  const [seedLoading, setSeedLoading]       = useState(false);
  const [seedDone, setSeedDone]             = useState(false);

  // ── Geolocation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        console.warn('Location denied, using default:', err.message);
        setLocationError('Using default location. Enable location for better results.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Backend health check ─────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const ok = await apiService.isBackendOnline();
      setBackendStatus(ok ? 'online' : 'offline');
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Socket.IO ────────────────────────────────────────────────────────────
  useEffect(() => {
    socketService.connect();

    socketService.on('connectionCountUpdate', (data) => {
      setConnectedDevices(data.connectedDevices ?? 0);
    });

    // Play sound on new events received via socket
    socketService.on('new_event', (data) => {
      const evt = data?.event || data;
      if (evt?.urgency) soundService.playAlert(evt.urgency);
    });

    return () => {
      socketService.off('connectionCountUpdate');
      socketService.off('new_event');
    };
  }, []);

  // ── Seed demo data ───────────────────────────────────────────────────────
  const handleSeed = useCallback(async () => {
    if (seedDone || seedLoading) return;
    setSeedLoading(true);
    try {
      await apiService.request('/events/seed', { method: 'POST' });
      setSeedDone(true);
      soundService.playSuccess();
      // Switch to feed tab so user sees the events appear
      setActiveTab('feed');
      // Trigger EventFeed to refetch via socket
      setTimeout(() => {
        socketService.emit('requestNearbyEvents', {
          lat: userLocation.lat,
          lon: userLocation.lon,
          radius: 50,  // wider radius for demo events
        });
      }, 300);
      setTimeout(() => setSeedDone(false), 5000);
    } catch (e) {
      console.error('Seed failed', e);
    } finally {
      setSeedLoading(false);
    }
  }, [seedDone, seedLoading, userLocation]);

  // ── Event posted callback ────────────────────────────────────────────────
  const handleEventPosted = (evt) => {
    console.log('✅ Event posted:', evt?.id);
    soundService.playSuccess();
  };

  const toggleSound = () => {
    const on = soundService.toggle();
    setSoundOn(on);
  };

  const meshActive = connectedDevices > 1;

  return (
    <div className="app">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-content">
          <h1>🆘 CrisisLink</h1>
          <p>Local. Voice-first. Real-time.</p>
          <div className={`status-badge ${backendStatus}`}>
            {backendStatus === 'online' ? '🟢 Connected' : '🔴 Offline'}
          </div>
        </div>

        {/* Header actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute alerts' : 'Unmute alerts'}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              color: '#fff',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '13px',
              backdropFilter: 'blur(8px)',
            }}
          >
            {soundOn ? '🔔 Sound ON' : '🔕 Muted'}
          </button>

          {/* Seed demo data */}
          <button
            onClick={handleSeed}
            disabled={seedLoading || seedDone}
            title="Load demo incidents for presentation"
            style={{
              background: seedDone ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.15)',
              border: `1px solid ${seedDone ? '#22c55e' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: '8px',
              color: '#fff',
              padding: '6px 12px',
              cursor: seedLoading || seedDone ? 'default' : 'pointer',
              fontSize: '13px',
              backdropFilter: 'blur(8px)',
              opacity: seedLoading ? 0.6 : 1,
            }}
          >
            {seedLoading ? '⏳ Loading...' : seedDone ? '✅ Demo Loaded' : '🎬 Load Demo'}
          </button>

          {/* QR Share */}
          <QRShare />
        </div>
      </header>

      {/* ── CONNECTION BANNER ────────────────────────────────────────────── */}
      <div className="hotspot-banner">
        <span className="hotspot-icon">📱</span>
        <span className="hotspot-text">
          Share: <code>http://{window.location.hostname}:3000</code>
          <span className={`connection-pill ${meshActive ? 'green' : connectedDevices === 1 ? 'yellow' : 'gray'}`}>
            {meshActive
              ? `${connectedDevices} devices — mesh active`
              : connectedDevices === 1
              ? '1 device — waiting for others'
              : 'No devices connected'}
          </span>
        </span>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="app-main">
        <SystemStatus />
        <StatsPanel />

        {locationError && (
          <div className="location-warning">⚠️ {locationError}</div>
        )}
        <div className="location-info">
          <span>📍 Lat: {userLocation.lat.toFixed(4)}, Lon: {userLocation.lon.toFixed(4)}</span>
        </div>

        <VoiceRecorder
          onEventPosted={handleEventPosted}
          userLocation={userLocation}
          backendStatus={backendStatus}
        />

        {/* ── TAB SWITCHER ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '4px',
          margin: '16px 0 0',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {[
            { id: 'feed', label: '📋 Incident Feed' },
            { id: 'map',  label: '🗺️ Crisis Map'    },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.2s',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
        <div style={{ marginTop: '12px' }}>
          {activeTab === 'feed' && (
            <EventFeed userLocation={userLocation} backendStatus={backendStatus} />
          )}
          {activeTab === 'map' && (
            <CrisisMap userLocation={userLocation} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>CrisisLink © 2026 — Built for communities, by communities 🌍</p>
      </footer>
      
      <DemoVisualizer isRunning={seedLoading} />
    </div>
  );
}

export default App;
