import React, { useState, useEffect } from 'react';
import VoiceRecorder from './components/VoiceRecorder';
import EventFeed from './components/EventFeed';
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
      try {
        const response = await fetch('http://localhost:3001/status');
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
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

      <main className="app-main">
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
      </main>

      <footer className="app-footer">
        <p>CrisisLink © 2024 - Hackathon Project</p>
      </footer>
    </div>
  );
}

export default App;
