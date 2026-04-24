import React, { useState, useEffect } from 'react';
import VoiceRecorder from './components/VoiceRecorder';
import EventFeed from './components/EventFeed';
import SystemStatus from './components/SystemStatus';
import MeshNetwork from './components/MeshNetwork';
import apiService from './api/api';
import socketService from './services/socket';
import config from './config/config';
import './App.css';

function App() {
  const [userLocation, setUserLocation] = useState({
    lat: 19.9762,  // Default: Indore coordinates
    lon: 75.8456
  });
  const [locationError, setLocationError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [connectedDevices, setConnectedDevices] = useState(0);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.warn('Location access denied, using default:', error.message);
          setLocationError('Using default location. Enable location for better results.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError('Geolocation not supported by your browser.');
    }
  }, []);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      const isOnline = await apiService.isBackendOnline();
      setBackendStatus(isOnline ? 'online' : 'offline');
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for real-time connection count
  useEffect(() => {
    const socket = socketService.connect();

    // Receive connection count updates
    socketService.on('connectionCountUpdate', (data) => {
      console.log('📡 Connection count update:', data.connectedDevices);
      setConnectedDevices(data.connectedDevices);
    });

    // Cleanup on unmount
    return () => {
      socketService.off('connectionCountUpdate');
    };
  }, []);

  const handleEventPosted = (newEvent) => {
    console.log('✅ Event posted:', newEvent);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🆘 CrisisLink</h1>
          <p>Local. Voice-first. Real-time.</p>
          <div className={`status-badge ${backendStatus}`}>
            {backendStatus === 'online' ? '🟢 Connected' : '🔴 Offline'}
          </div>
        </div>
      </header>

      {/* Connection banner - always visible */}
      <div className="hotspot-banner">
        <span className="hotspot-icon">📱</span>
        <span className="hotspot-text">
          Share: <code>http://{window.location.hostname}:3000</code>
          <span className={`connection-pill ${
            connectedDevices > 1 ? 'green' : 
            connectedDevices === 1 ? 'yellow' : 'gray'
          }`}>
            {connectedDevices > 1 ? `${connectedDevices} devices — mesh active` : 
             connectedDevices === 1 ? '1 device — waiting for others' : 
             'No devices connected'}
          </span>
        </span>
      </div>

      <main className="app-main">
        <SystemStatus />
        
        {locationError && (
          <div className="location-warning">
            ⚠️ {locationError}
          </div>
        )}

        <div className="location-info">
          <span>📍 Lat: {userLocation.lat.toFixed(4)}, Lon: {userLocation.lon.toFixed(4)}</span>
        </div>

        <VoiceRecorder
          onEventPosted={handleEventPosted}
          userLocation={userLocation}
          backendStatus={backendStatus}
        />
        
        <EventFeed 
          userLocation={userLocation} 
          backendStatus={backendStatus}
        />
        
        <MeshNetwork />
      </main>

      <footer className="app-footer">
        <p>CrisisLink © 2024 - Hackathon Project</p>
      </footer>
    </div>
  );
}

export default App;
