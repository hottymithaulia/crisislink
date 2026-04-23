import React, { useState, useEffect } from 'react';
import TTSService from '../services/TTSService';
import '../styles/EventCard.css';

function EventCard({ event, onConfirm, onFake, onRespond }) {
  const [ageMinutes, setAgeMinutes] = useState(0);
  const [ttsService] = useState(() => new TTSService());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Update age every 10 seconds
  useEffect(() => {
    const updateAge = () => {
      const age = Math.floor((Date.now() - event.timestamp) / 60000);
      setAgeMinutes(age);
    };
    updateAge();
    const interval = setInterval(updateAge, 10000);
    return () => clearInterval(interval);
  }, [event.timestamp]);

  // Get trust/reputation display info
  const getTrustInfo = (reputation) => {
    const score = reputation || 0.5;
    
    if (score >= 0.8) {
      return {
        color: '#22c55e',
        icon: '✓',
        label: 'Trusted',
        bgColor: 'rgba(34, 197, 94, 0.1)'
      };
    } else if (score >= 0.5) {
      return {
        color: '#f59e0b',
        icon: '⚠',
        label: 'Unverified',
        bgColor: 'rgba(245, 158, 11, 0.1)'
      };
    } else {
      return {
        color: '#9ca3af',
        icon: '?',
        label: 'Low Trust',
        bgColor: 'rgba(156, 163, 175, 0.1)'
      };
    }
  };

  // Get urgency badge style
  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case 'critical':
        return { background: '#fee2e2', color: '#991b1b', border: '#fecaca' };
      case 'high':
        return { background: '#ffedd5', color: '#9a3412', border: '#fed7aa' };
      case 'medium':
        return { background: '#fef3c7', color: '#92400e', border: '#fde68a' };
      default:
        return { background: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
    }
  };

  // Handle text-to-speech
  const handleReadAloud = async () => {
    if (isSpeaking) return;
    
    setIsSpeaking(true);
    
    try {
      const trustInfo = getTrustInfo(event.user_reputation);
      const ageText = ageMinutes === 0 ? 'just now' : `${ageMinutes} minutes ago`;
      
      const summary = `${event.type.toUpperCase()} incident reported ${ageText}. ${event.text}. Trust level: ${trustInfo.label}. ${event.confirmations} confirmations, ${event.fakes} fake reports.`;
      
      await ttsService.speak(summary);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const trustInfo = getTrustInfo(event.user_reputation);
  const trustPercent = Math.round((event.user_reputation || 0.5) * 100);
  const urgencyStyle = getUrgencyStyle(event.urgency);
  
  // Format distance
  const distanceText = event.distance_km !== undefined 
    ? `${event.distance_km.toFixed(1)} km away`
    : 'Nearby';

  return (
    <div 
      className="event-card" 
      style={{ borderLeftColor: event.escalation_color || '#3b82f6' }}
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
            {event.type.toUpperCase()}
          </span>
          <span className="event-time">
            {ageMinutes === 0 ? 'just now' : `${ageMinutes}m ago`}
          </span>
        </div>
        
        {event.escalation_label && (
          <div 
            className="escalation-badge"
            style={{ backgroundColor: event.escalation_color || '#3b82f6' }}
          >
            {event.escalation_state === 'hyperlocal' && '🏠 '}
            {event.escalation_state === 'neighborhood' && '📢 '}
            {event.escalation_state === 'unresolved' && '🌐 '}
            {event.escalation_label}
          </div>
        )}
      </div>

      {/* Event Text */}
      <div className="event-text">
        <p className={expanded ? 'expanded' : ''}>
          {expanded ? event.text : (event.text.length > 150 ? event.text.substring(0, 150) + '...' : event.text)}
        </p>
        {event.text.length > 150 && (
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
          <span>{trustPercent}%</span>
        </span>
        
        <span className="meta-item">
          <span className="meta-icon">✓</span>
          <span>{event.confirmations} confirm</span>
        </span>
        
        <span className="meta-item">
          <span className="meta-icon fake">✗</span>
          <span>{event.fakes} fake</span>
        </span>
        
        <span className="meta-item distance">
          <span className="meta-icon">📍</span>
          <span>{distanceText}</span>
        </span>
      </div>

      {/* Verification Bar */}
      <div className="verification-bar">
        <div 
          className="verification-fill"
          style={{ 
            width: `${event.confirmations + event.fakes > 0 ? (event.confirmations / (event.confirmations + event.fakes)) * 100 : 50}%`,
            background: event.confirmations > event.fakes ? '#22c55e' : '#ef4444'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="event-actions">
        <button 
          className="btn-action btn-confirm"
          onClick={onConfirm}
          title="Confirm this incident is real"
        >
          <span>✓</span>
          <span>Confirm</span>
        </button>
        
        <button 
          className="btn-action btn-fake"
          onClick={onFake}
          title="Report this as fake/misinformation"
        >
          <span>✗</span>
          <span>Fake</span>
        </button>
        
        <button 
          className="btn-action btn-respond"
          onClick={onRespond}
          title="I am going to help/respond"
        >
          <span>→</span>
          <span>Going</span>
        </button>
        
        <button 
          className={`btn-action btn-speak ${isSpeaking ? 'speaking' : ''}`}
          onClick={handleReadAloud}
          disabled={isSpeaking}
          title="Read aloud"
        >
          <span>{isSpeaking ? '🔊' : '🔊'}</span>
          <span>{isSpeaking ? 'Speaking...' : 'Hear'}</span>
        </button>
      </div>

      {/* Cloud escalation warning */}
      {event.needs_cloud_escalation && (
        <div className="cloud-warning">
          <span>☁️</span>
          <span>This incident has been escalated to authorities</span>
        </div>
      )}
    </div>
  );
}

export default EventCard;
