import React, { useState, useEffect, useCallback, useRef } from 'react';
import EventCard from './EventCard';
import apiService from '../api/api';
import socketService from '../services/socket';
import config from '../config/config';
import '../styles/EventFeed.css';

function EventFeed({ userLocation, backendStatus }) {
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [queue, setQueue]           = useState([]);   // incoming events waiting to animate in
  const queueRef = useRef([]);
  const processingRef = useRef(false);

  const fetchNearbyEvents = useCallback(async () => {
    if (backendStatus !== 'online') return;
    if (!userLocation?.lat || !userLocation?.lon) return;

    try {
      const { lat, lon } = userLocation;
      const radius = config.map.maxRadius;

      const data = await apiService.getNearbyEvents(lat, lon, radius);

      if (data && data.success) {
        // Backend wraps in { success, data: { events: [...] } }
        const events = data.data?.events || data.events || [];
        setEvents(events);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error((data && data.error) ? data.error : 'Failed to fetch events');
      }

    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not load incidents. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [backendStatus, userLocation]);

  // Request initial events via WebSocket
  const requestInitialEvents = useCallback(() => {
    if (backendStatus === 'online' && userLocation?.lat && userLocation?.lon) {
      socketService.emit('requestNearbyEvents', {
        lat: userLocation.lat,
        lon: userLocation.lon,
        radius: config.map.maxRadius
      });
    }
  }, [backendStatus, userLocation]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (backendStatus !== 'online') {
      setLoading(false);
      setEvents([]);
      return;
    }

    socketService.connect();

    // Request initial events
    requestInitialEvents();

    // Also do a REST fetch as fallback
    fetchNearbyEvents();

    // Listen for initial events via socket response
    const handleInitial = (data) => {
      console.log('📡 Received initial events:', data?.events?.length || 0);
      const evts = data?.events || [];
      setEvents(evts);
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    };

    // Listen for new events (including seed broadcasts)
    const handleNew = (data) => {
      const evt = data?.event || data;
      if (!evt?.id) return;
      console.log('📡 WebSocket received new event:', evt.id);
      // Add to queue — processed one-by-one below
      queueRef.current = [...queueRef.current, evt];
      setQueue(q => [...q, evt]);
      setLoading(false);
    };

    // Listen for event updates (confirm/fake)
    const handleUpdate = (data) => {
      // Backend sends either raw event OR { event: {...} }
      const evt = data?.event || data;
      if (!evt?.id) return;
      console.log('📡 WebSocket received event update:', evt.id);
      setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, ...evt } : e));
      setLastUpdated(new Date());
    };

    socketService.on('initialEvents',  handleInitial);
    socketService.on('new_event',      handleNew);
    socketService.on('event_updated',  handleUpdate);
    socketService.on('eventConfirmed', handleUpdate);
    socketService.on('eventFaked',     handleUpdate);

    return () => {
      socketService.off('initialEvents',  handleInitial);
      socketService.off('new_event',      handleNew);
      socketService.off('event_updated',  handleUpdate);
      socketService.off('eventConfirmed', handleUpdate);
      socketService.off('eventFaked',     handleUpdate);
    };
  }, [backendStatus, requestInitialEvents, fetchNearbyEvents]);

  // ── QUEUE PROCESSOR: drain one event every 450ms ──────────────────────────
  useEffect(() => {
    if (queue.length === 0 || processingRef.current) return;

    processingRef.current = true;
    const timer = setTimeout(() => {
      const [next, ...rest] = queueRef.current;
      if (next) {
        setEvents(prev => {
          if (prev.some(e => e.id === next.id)) return prev;
          return [next, ...prev];
        });
        setLastUpdated(new Date());
        queueRef.current = rest;
        setQueue(rest);
      }
      processingRef.current = false;
    }, 450);

    return () => clearTimeout(timer);
  }, [queue]);

  const handleConfirm = async (eventId) => {
    if (backendStatus !== 'online') {
      alert('Backend is offline');
      return;
    }

    try {
      const result = await apiService.confirmEvent(eventId);
      
      if (result.success) {
        console.log(`✅ Confirmed event ${eventId}`);
        // WebSocket will update the event automatically
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
        // WebSocket will update the event automatically
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

      {/* Incoming queue banner */}
      {queue.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', margin: '0 0 8px',
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '10px', fontSize: '12px', color: '#a5b4fc',
        }}>
          <span>📥</span>
          <span><strong>{queue.length}</strong> new incident{queue.length !== 1 ? 's' : ''} incoming...</span>
          <span style={{
            marginLeft: 'auto', width: '8px', height: '8px',
            borderRadius: '50%', background: '#6366f1', display: 'inline-block',
          }} />
        </div>
      )}

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
