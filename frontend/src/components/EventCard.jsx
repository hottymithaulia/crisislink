import React, { useState, useEffect } from 'react';
import TTSService from '../services/TTSService';
import { translate, getBrowserLang } from '../services/TranslationService';
import apiService from '../api/api';
import '../styles/EventCard.css';

function EventCard({ event, onConfirm, onFake, onRespond }) {
  const [ageMinutes, setAgeMinutes]     = useState(0);
  const [ttsService]                    = useState(() => new TTSService());
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [translation, setTranslation]   = useState(null);
  const [translating, setTranslating]   = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'confirm' | 'fake' | 'respond' | null
  const audioRef = React.useRef(null);

  // Update age every 10 seconds
  // PingEvent uses `timestamp` (milliseconds epoch), not `created_at`
  useEffect(() => {
    const updateAge = () => {
      const ts = event.timestamp || event.created_at;
      const tsMs = typeof ts === 'string' ? new Date(ts).getTime() : ts;
      const age = Math.floor((Date.now() - tsMs) / 60000);
      setAgeMinutes(Math.max(0, age));
    };
    updateAge();
    const interval = setInterval(updateAge, 10000);
    return () => clearInterval(interval);
  }, [event.timestamp, event.created_at]);

  // Get trust/reputation display info
  const getTrustInfo = (score) => {
    const s = score || 0.5;
    if (s >= 0.8) return { color: '#22c55e', icon: '✓', label: 'Trusted', bgColor: 'rgba(34, 197, 94, 0.1)' };
    if (s >= 0.5) return { color: '#f59e0b', icon: '⚠', label: 'Unverified', bgColor: 'rgba(245, 158, 11, 0.1)' };
    return { color: '#9ca3af', icon: '?', label: 'Low Trust', bgColor: 'rgba(156, 163, 175, 0.1)' };
  };

  // Get urgency badge style
  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case 'critical': return { background: '#fee2e2', color: '#991b1b', border: '#fecaca' };
      case 'high': return { background: '#ffedd5', color: '#9a3412', border: '#fed7aa' };
      case 'medium': return { background: '#fef3c7', color: '#92400e', border: '#fde68a' };
      default: return { background: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
    }
  };

  // Handle text-to-speech (reads translated text if available)
  const handleReadAloud = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const ageText = ageMinutes === 0 ? 'just now' : `${ageMinutes} minutes ago`;
      const fakeCount = event.fakes || event.fake_reports || 0;
      const textToRead = translation || event.text || '';
      const summary = `${(event.type || 'incident').toUpperCase()} incident reported ${ageText}. ${textToRead}. ${event.confirmations || 0} confirmations, ${fakeCount} fake reports.`;
      await ttsService.speak(summary);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Auto-translate if event has a different lang from browser
  useEffect(() => {
    const eventLang  = event.lang || 'en';
    const browserLang = getBrowserLang();
    if (eventLang !== browserLang && event.text && !translation) {
      setTranslating(true);
      translate(event.text, eventLang, browserLang)
        .then(({ translated, success }) => {
          if (success && translated !== event.text) setTranslation(translated);
        })
        .finally(() => setTranslating(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, event.lang]);

  // PingEvent uses `fakes`, fallback to `fake_reports` for safety
  const fakeCount = event.fakes || event.fake_reports || 0;
  const confirmedCount = event.confirmations || 0;
  const totalReports = confirmedCount + fakeCount;
  const trustPercent = totalReports > 0
    ? Math.round((confirmedCount / totalReports) * 100)
    : 50;
  const trustInfo = getTrustInfo(trustPercent / 100);
  const urgencyStyle = getUrgencyStyle(event.urgency);

  const getTypeIcon = (type) => {
    const icons = { accident: '🚗', fire: '🔥', medical: '🏥', flood: '🌊', police: '👮', hazmat: '☢️', incident: '⚠️' };
    return icons[type] || '⚠️';
  };

  const userId = apiService.getUserId();
  const hasConfirmed = (event.responders || []).includes(userId);
  const hasFaked = (event.fakers || []).includes(userId);

  return (
    <div
      className="event-card"
      style={{ borderLeftColor: event.urgency === 'critical' ? '#ef4444' : event.urgency === 'high' ? '#f59e0b' : '#3b82f6' }}
    >
      {/* Card Header */}
      <div className="event-top">
        <div className="event-header">
          <span
            className="event-type-badge"
            style={{
              background: urgencyStyle.background,
              color: urgencyStyle.color,
              border: `1px solid ${urgencyStyle.border}`
            }}
          >
            {event.urgency === 'critical' && '🚨 '}
            {event.urgency === 'high' && '⚠️ '}
            {getTypeIcon(event.type)} {(event.type || 'INCIDENT').toUpperCase()}
          </span>
          <span className="event-time">
            {ageMinutes === 0 ? 'just now' : `${ageMinutes}m ago`}
          </span>
        </div>

        {/* Escalation badge */}
        {event.escalation_label && (
          <div
            className="escalation-badge"
            style={{ backgroundColor: event.escalation_color || '#3b82f6' }}
          >
            {event.escalation_label}
          </div>
        )}
      </div>

      {/* Event Text */}
      <div className="event-text">
        <p className={expanded ? 'expanded' : ''}>
          {expanded
            ? event.text
            : (event.text && event.text.length > 150 ? event.text.substring(0, 150) + '...' : event.text)}
        </p>

        {/* Translation */}
        {translation && (
          <div style={{
            marginTop: '6px',
            padding: '6px 10px',
            background: 'rgba(99,102,241,0.08)',
            borderRadius: '6px',
            borderLeft: '3px solid #6366f1',
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              🌐 Translated from {event.lang?.toUpperCase() || 'original'}:
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#e2e8f0' }}>{translation}</p>
          </div>
        )}
        {translating && (
          <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>🌐 Translating...</p>
        )}

        {/* Audio playback */}
        {event.audio_base64 && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px' }}>🔊 Original audio:</p>
            <audio
              ref={audioRef}
              src={event.audio_base64}
              controls
              style={{ width: '100%', borderRadius: '6px', height: '32px' }}
              onPlay={() => setAudioPlaying(true)}
              onEnded={() => setAudioPlaying(false)}
            />
          </div>
        )}

        {event.text && event.text.length > 150 && (
          <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Meta Information */}
      <div className="event-meta">
        <span
          className="trust-badge"
          style={{
            backgroundColor: trustInfo.bgColor,
            color: trustInfo.color,
            borderColor: trustInfo.color
          }}
        >
          <span className="trust-icon">{trustInfo.icon}</span>
          <span>{trustPercent}% trust</span>
        </span>

        <span className="meta-item">
          <span className="meta-icon">✓</span>
          <span>{confirmedCount} confirm</span>
        </span>

        <span className="meta-item">
          <span className="meta-icon fake">✗</span>
          <span>{fakeCount} fake</span>
        </span>

        {event.distance_km !== undefined && (
          <span className="meta-item distance">
            <span className="meta-icon">📍</span>
            <span>{event.distance_km.toFixed(1)} km</span>
          </span>
        )}
      </div>

      {/* Verification Bar */}
      <div className="verification-bar">
        <div
          className="verification-fill"
          style={{
            width: `${totalReports > 0 ? (confirmedCount / totalReports) * 100 : 50}%`,
            background: confirmedCount >= fakeCount ? '#22c55e' : '#ef4444'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="event-actions">
        <button
          className={`btn-action btn-confirm ${hasConfirmed ? 'active' : ''}`}
          onClick={async () => {
            if (actionLoading || hasConfirmed) return;
            setActionLoading('confirm');
            try { await onConfirm?.(); } finally { setActionLoading(null); }
          }}
          disabled={!!actionLoading || hasConfirmed}
          title={hasConfirmed ? "You confirmed this" : "Confirm this incident is real"}
          style={{ opacity: actionLoading && actionLoading !== 'confirm' ? 0.5 : 1 }}
        >
          <span>{actionLoading === 'confirm' ? '⏳' : '✓'}</span>
          <span>{hasConfirmed ? 'Confirmed' : actionLoading === 'confirm' ? 'Confirming...' : 'Confirm'}</span>
        </button>

        <button
          className={`btn-action btn-fake ${hasFaked ? 'active' : ''}`}
          onClick={async () => {
            if (actionLoading || hasFaked) return;
            setActionLoading('fake');
            try { await onFake?.(); } finally { setActionLoading(null); }
          }}
          disabled={!!actionLoading || hasFaked}
          title={hasFaked ? "You reported this as fake" : "Report this as fake/misinformation"}
          style={{ opacity: actionLoading && actionLoading !== 'fake' ? 0.5 : 1 }}
        >
          <span>{actionLoading === 'fake' ? '⏳' : '✗'}</span>
          <span>{hasFaked ? 'Reported' : actionLoading === 'fake' ? 'Reporting...' : 'Fake'}</span>
        </button>

        <button
          className="btn-action btn-respond"
          onClick={async () => {
            if (actionLoading) return;
            setActionLoading('respond');
            try { await onRespond?.(); } finally { setActionLoading(null); }
          }}
          disabled={!!actionLoading}
          title="I am going to help/respond"
        >
          <span>{actionLoading === 'respond' ? '⏳' : '→'}</span>
          <span>{actionLoading === 'respond' ? 'Noted' : 'Going'}</span>
        </button>

        <button
          className={`btn-action btn-speak ${isSpeaking ? 'speaking' : ''}`}
          onClick={handleReadAloud}
          disabled={isSpeaking}
          title="Read aloud"
        >
          <span>🔊</span>
          <span>{isSpeaking ? 'Speaking...' : 'Hear'}</span>
        </button>
      </div>

      {/* Cloud escalation warning */}
      {event.needs_cloud_escalation && (
        <div className="cloud-warning">
          <span>🌐</span>
          <span>This incident has been escalated city-wide</span>
        </div>
      )}
    </div>
  );
}

export default EventCard;
