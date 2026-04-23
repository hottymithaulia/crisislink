import React, { useState, useEffect } from 'react';
import VoiceRecorder from './components/VoiceRecorder';
import EventFeed from './components/EventFeed';
import SystemStatus from './components/SystemStatus';
import MeshNetwork from './components/MeshNetwork';
import apiService from './api/api';
import './App.css';

function App() {
  const [userLocation, setUserLocation] = useState({
    lat: 19.9762,  // Default: Indore coordinates
    lon: 75.8456
  });
  const [locationError, setLocationError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

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

      {/* Development mode hotspot banner */}
      {process.env.NODE_ENV === 'development' && (
        <div className="hotspot-banner">
          <span className="hotspot-icon">📱</span>
          <span className="hotspot-text">
            Connect your phone to this laptop's WiFi hotspot, then open{' '}
            <code>http://192.168.137.1:3000</code> in your phone's browser
          </span>
        </div>
      )}

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
