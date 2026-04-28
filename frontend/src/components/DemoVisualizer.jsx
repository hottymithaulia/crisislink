import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import socketService from '../services/socket';

const DemoVisualizer = ({ isRunning }) => {
  const [logs, setLogs] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isRunning) {
      setLogs([]);
      setVisible(true);
    } else {
      // Auto-hide after some time if not running anymore
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
  }, [isRunning]);

  useEffect(() => {
    const handleNewEvent = (data) => {
      if (data?.source === 'seed') {
        const evt = data.event || data;
        setLogs(prev => [...prev, {
          id: Date.now() + Math.random(),
          status: 'accepted',
          text: evt.text || 'No text',
          type: evt.type,
          index: data.index,
          total: data.total
        }]);
      }
    };

    const handleBlocked = (data) => {
      setLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        status: 'blocked',
        text: data.text,
        reason: data.reason,
        index: data.index,
        total: data.total
      }]);
    };

    socketService.on('new_event', handleNewEvent);
    socketService.on('seed_event_blocked', handleBlocked);

    return () => {
      socketService.off('new_event', handleNewEvent);
      socketService.off('seed_event_blocked', handleBlocked);
    };
  }, []);

  if (!visible && logs.length === 0) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 999999,
      width: '340px',
      maxHeight: '60vh',
      background: 'linear-gradient(135deg, rgba(30,30,46,0.95), rgba(15,23,42,0.98))',
      border: '1px solid rgba(99,102,241,0.4)',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transform: visible ? 'translateY(0)' : 'translateY(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ animation: isRunning ? 'pulse 1s infinite' : 'none' }}>🎬</span> 
          Spam Filter Live Demo
        </h3>
        <button 
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{
        padding: '12px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1
      }}>
        {logs.length === 0 && (
          <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
            Processing incoming reports...
          </div>
        )}
        
        {logs.map(log => (
          <div key={log.id} style={{
            background: log.status === 'accepted' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            borderLeft: `3px solid ${log.status === 'accepted' ? '#22c55e' : '#ef4444'}`,
            borderRadius: '0 8px 8px 0',
            padding: '10px 12px',
            fontSize: '13px',
            animation: 'fadeSlideIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ color: log.status === 'accepted' ? '#4ade80' : '#f87171' }}>
                {log.status === 'accepted' ? '✅ ACCEPTED' : '🚫 BLOCKED'}
              </strong>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                [{log.index}/{log.total}]
              </span>
            </div>
            
            <p style={{ margin: '0 0 6px 0', color: '#cbd5e1', lineHeight: '1.4' }}>
              "{log.text.length > 50 ? log.text.substring(0, 50) + '...' : log.text}"
            </p>
            
            {log.status === 'blocked' && (
              <div style={{ fontSize: '11px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px' }}>⚠️</span> {log.reason}
              </div>
            )}
            {log.status === 'accepted' && (
              <div style={{ fontSize: '11px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px' }}>🏷️</span> Type: {log.type}
              </div>
            )}
          </div>
        ))}
        {/* Empty div to scroll to bottom could be added here if needed */}
      </div>
      
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default DemoVisualizer;
