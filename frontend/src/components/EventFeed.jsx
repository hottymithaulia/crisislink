import React, { useState, useEffect, useCallback } from 'react';
import EventCard from './EventCard';
import apiService from '../api/api';
import config from '../config/config';
import '../styles/EventFeed.css';

function EventFeed({ userLocation, backendStatus }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchNearbyEvents = useCallback(async () => {
    if (backendStatus !== 'online') return;

    try {
      const { lat, lon } = userLocation;
      const radius = config.map.maxRadius;
      
      const data = await apiService.getNearbyEvents(lat, lon, radius);
      
      if (data.success) {
        setEvents(data.data.events);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch events');
      }
      
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load incidents. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [backendStatus, userLocation]);

  // Fetch events immediately and every 3 seconds
  useEffect(() => {
    // Only fetch if backend is online
    if (backendStatus === 'online') {
      fetchNearbyEvents();
      const interval = setInterval(fetchNearbyEvents, 3000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setEvents([]);
    }
  }, [userLocation, backendStatus, fetchNearbyEvents]);

  const handleConfirm = async (eventId) => {
    if (backendStatus !== 'online') {
      alert('Backend is offline');
      return;
    }

    try {
      const result = await apiService.confirmEvent(eventId);
      
      if (result.success) {
        console.log(`✅ Confirmed event ${eventId}`);
        // Refresh events
        fetchNearbyEvents();
      } else {
        throw new Error(result.error || 'Failed to confirm');
      }
      
    } catch (err) {
      console.error('Error confirming event:', err);
      alert('Failed to confirm incident. Please try again.');
    }
  };

  const handleFake = async (eventId) => {
    if (backendStatus !== 'online') {
      alert('Backend is offline');
      return;
    }

    try {
      const result = await apiService.reportFakeEvent(eventId);
      
      if (result.success) {
        console.log(`❌ Reported fake for event ${eventId}`);
        fetchNearbyEvents();
      } else {
        throw new Error(result.error || 'Failed to report fake');
      }
      
    } catch (err) {
      console.error('Error reporting fake:', err);
      alert('Failed to report incident. Please try again.');
    }
  };

  const handleRespond = (eventId) => {
    alert(`Responding to incident ${eventId}. This would open navigation/responder mode in full version.`);
  };

  // Group events by urgency
  const criticalEvents = events.filter(e => e.urgency === 'critical');
  const highEvents = events.filter(e => e.urgency === 'high');
  const otherEvents = events.filter(e => e.urgency !== 'critical' && e.urgency !== 'high');

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const seconds = Math.floor((new Date() - lastUpdated) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className="event-feed">
      <div className="feed-header">
        <div className="feed-title">
          <h2>📍 Nearby Incidents</h2>
          {lastUpdated && (
            <span className="last-updated">Updated {formatLastUpdated()}</span>
          )}
        </div>
        <p className="feed-subtitle">
          {events.length} event{events.length !== 1 ? 's' : ''} within 5 km
          {backendStatus === 'offline' && ' • Backend offline'}
        </p>
      </div>

      {error && (
        <div className="error-box">
          <p>⚠️ {error}</p>
          <button onClick={fetchNearbyEvents} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading incidents...</span>
        </div>
      )}

      {!loading && events.length === 0 && !error && backendStatus === 'online' && (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <p>No incidents reported in your area.</p>
          <p className="empty-subtitle">Be the first to report!</p>
        </div>
      )}

      {!loading && backendStatus === 'offline' && (
        <div className="offline-state">
          <div className="offline-icon">🔌</div>
          <p>Backend is offline</p>
          <p className="offline-subtitle">Start the server with: npm start</p>
        </div>
      )}

      {/* Critical events first */}
      {criticalEvents.length > 0 && (
        <div className="urgency-section critical">
          <h3 className="urgency-header">🚨 Critical</h3>
          {criticalEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onConfirm={() => handleConfirm(event.id)}
              onFake={() => handleFake(event.id)}
              onRespond={() => handleRespond(event.id)}
            />
          ))}
        </div>
      )}

      {/* High priority events */}
      {highEvents.length > 0 && (
        <div className="urgency-section high">
          <h3 className="urgency-header">⚠️ High Priority</h3>
          {highEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onConfirm={() => handleConfirm(event.id)}
              onFake={() => handleFake(event.id)}
              onRespond={() => handleRespond(event.id)}
            />
          ))}
        </div>
      )}

      {/* Other events */}
      {otherEvents.length > 0 && (
        <div className="urgency-section normal">
          <h3 className="urgency-header">📋 Other Incidents</h3>
          {otherEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onConfirm={() => handleConfirm(event.id)}
              onFake={() => handleFake(event.id)}
              onRespond={() => handleRespond(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default EventFeed;
