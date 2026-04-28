/**
 * CrisisMap.jsx
 * Live Leaflet map showing events as colored pins.
 * Includes MESH SIMULATION MODE — animated propagation rings that
 * visually explain how the mesh would spread events offline.
 */
import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';
import apiService from '../api/api';
import config from '../config/config';

// Urgency → color mapping
const URGENCY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#3b82f6',
  low:      '#22c55e',
};

const TYPE_ICONS = {
  fire:     '🔥',
  accident: '🚗',
  medical:  '🏥',
  flood:    '🌊',
  police:   '🚔',
  hazmat:   '☢️',
  incident: '⚠️',
};

// ── Leaflet loaded lazily (avoids SSR issues) ──────────────────────────────
let L = null;
const loadLeaflet = async () => {
  if (!L) {
    L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    // Fix default icon paths broken by webpack
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }
  return L;
};

// ── Build a custom colored div-icon ──────────────────────────────────────
const makeIcon = (event) => {
  const color = URGENCY_COLORS[event.urgency] || '#64748b';
  const icon  = TYPE_ICONS[event.type] || '📍';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position:relative;
        width:38px; height:38px;
        display:flex; align-items:center; justify-content:center;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 4px 14px ${color}80;
        border:2px solid #fff;
      ">
        <span style="transform:rotate(45deg); font-size:16px;">${icon}</span>
      </div>`,
    iconSize:   [38, 38],
    iconAnchor: [19, 38],
    popupAnchor:[0, -40],
  });
};

const CrisisMap = ({ userLocation, events: initialEvents = [] }) => {
  const mapRef        = useRef(null);
  const mapInstance   = useRef(null);
  const markersRef    = useRef({});   // eventId → { marker, circle, pulseInterval }
  const [events, setEvents]         = useState(initialEvents);
  const [meshMode, setMeshMode]     = useState(true);
  const [leafletReady, setReady]    = useState(false);
  const [selectedEvent, setSelected] = useState(null);

  // ── Init Leaflet map ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    loadLeaflet().then(() => {
      if (!mounted || !mapRef.current || mapInstance.current) return;

      const center = userLocation
        ? [userLocation.lat, userLocation.lon]
        : [19.9762, 75.8456];

      const map = L.map(mapRef.current, {
        center,
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstance.current = map;
      setReady(true);
    });

    return () => { mounted = false; };
  }, []);

  // ── Center map when userLocation changes ────────────────────────────────
  useEffect(() => {
    if (mapInstance.current && userLocation?.lat) {
      mapInstance.current.setView([userLocation.lat, userLocation.lon], 14);
    }
  }, [userLocation]);

  // ── Load existing events via API ────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !userLocation?.lat) return;
    apiService.getNearbyEvents(userLocation.lat, userLocation.lon, config.map?.maxRadius || 25)
      .then(res => {
        if (res?.success) {
          const evts = res.data?.events || res.events || [];
          setEvents(evts);
        }
      });
  }, [leafletReady, userLocation]);

  // ── Real-time WebSocket updates ─────────────────────────────────────────
  useEffect(() => {
    const handleNew = (data) => {
      const evt = data?.event || data;
      if (evt?.id) setEvents(prev => {
        if (prev.find(e => e.id === evt.id)) return prev;
        return [evt, ...prev];
      });
    };
    const handleUpdate = (data) => {
      const evt = data?.event || data;
      if (evt?.id) setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, ...evt } : e));
    };

    socketService.on('new_event',      handleNew);
    socketService.on('event_updated',  handleUpdate);
    socketService.on('eventConfirmed', handleUpdate);
    socketService.on('eventFaked',     handleUpdate);

    return () => {
      socketService.off('new_event',      handleNew);
      socketService.off('event_updated',  handleUpdate);
      socketService.off('eventConfirmed', handleUpdate);
      socketService.off('eventFaked',     handleUpdate);
    };
  }, []);

  // ── Sync events → Leaflet markers ──────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapInstance.current) return;

    const map    = mapInstance.current;
    const active = new Set(events.map(e => e.id));

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!active.has(id)) {
        const m = markersRef.current[id];
        if (m.marker) map.removeLayer(m.marker);
        if (m.circle) map.removeLayer(m.circle);
        clearInterval(m.pulseInterval);
        delete markersRef.current[id];
      }
    });

    // Add / update markers
    events.forEach(evt => {
      if (!evt.lat || !evt.lon) return;
      const color = URGENCY_COLORS[evt.urgency] || '#64748b';
      const radiusM = (evt.current_radius_km || 1) * 1000;

      if (markersRef.current[evt.id]) {
        // Update circle radius if escalation changed
        const existing = markersRef.current[evt.id];
        if (existing.circle) {
          existing.circle.setRadius(radiusM);
        }
        return;
      }

      // Marker
      const marker = L.marker([evt.lat, evt.lon], { icon: makeIcon(evt) }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:180px; font-family:sans-serif;">
          <div style="font-weight:700; color:${color}; font-size:13px; margin-bottom:4px;">
            ${TYPE_ICONS[evt.type] || '⚠️'} ${evt.type?.toUpperCase()}
            <span style="background:${color}20; color:${color}; font-size:10px; padding:2px 6px; border-radius:10px; margin-left:4px;">${evt.urgency}</span>
          </div>
          <p style="margin:0 0 8px; font-size:12px; color:#374151;">${evt.text}</p>
          <div style="font-size:11px; color:#6b7280;">
            ✅ ${evt.confirmations || 0} confirmed &nbsp; 🚫 ${evt.fakes || 0} fake
          </div>
          <div style="font-size:10px; color:#9ca3af; margin-top:4px;">${evt.escalation_label || ''}</div>
        </div>
      `);
      marker.on('click', () => setSelected(evt));

      // Escalation radius circle
      const circle = L.circle([evt.lat, evt.lon], {
        radius: radiusM,
        color,
        fillColor: color,
        fillOpacity: meshMode ? 0.06 : 0,
        opacity: meshMode ? 0.5 : 0,
        weight: 1.5,
        dashArray: '4 4',
      }).addTo(map);

      markersRef.current[evt.id] = { marker, circle };
    });
  }, [events, leafletReady, meshMode]);

  // ── Toggle mesh overlay visibility ────────────────────────────────────
  useEffect(() => {
    Object.values(markersRef.current).forEach(({ circle }) => {
      if (!circle) return;
      circle.setStyle({
        fillOpacity: meshMode ? 0.06 : 0,
        opacity:     meshMode ? 0.5  : 0,
      });
    });
  }, [meshMode]);

  return (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Controls bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 1000,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, transparent 100%)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        pointerEvents: 'none',
      }}>
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '13px', pointerEvents: 'auto' }}>
          🗺️ Crisis Map
        </span>
        <span style={{
          background: '#22c55e20', color: '#22c55e',
          fontSize: '10px', fontWeight: 700, padding: '2px 8px',
          borderRadius: '20px', border: '1px solid #22c55e40',
        }}>
          {events.length} ACTIVE
        </span>

        {/* Mesh toggle */}
        <button
          onClick={() => setMeshMode(m => !m)}
          style={{
            pointerEvents: 'auto',
            marginLeft: 'auto',
            background: meshMode ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
            border: meshMode ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: meshMode ? '#a5b4fc' : '#94a3b8',
            padding: '5px 12px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          📡 {meshMode ? 'Mesh ON' : 'Mesh OFF'}
        </button>
      </div>

      {/* Mesh mode banner */}
      {meshMode && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          zIndex: 1000,
          background: 'linear-gradient(0deg, rgba(99,102,241,0.9) 0%, transparent 100%)',
          padding: '14px 16px 10px',
          pointerEvents: 'none',
        }}>
          <p style={{ margin: 0, color: '#e0e7ff', fontSize: '11px', fontWeight: 600 }}>
            📡 MESH SIMULATION MODE — Rings show how events propagate outward through the mesh network
          </p>
          <p style={{ margin: '2px 0 0', color: '#a5b4fc', fontSize: '10px' }}>
            Blue ring = 1 km hyperlocal · Yellow = 5 km neighborhood · Red = 25 km city-wide escalation
          </p>
        </div>
      )}

      {/* Leaflet map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '420px' }}
      />

      {!leafletReady && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15,23,42,0.9)', color: '#94a3b8', fontSize: '14px',
        }}>
          🗺️ Loading map...
        </div>
      )}
    </div>
  );
};

export default CrisisMap;
