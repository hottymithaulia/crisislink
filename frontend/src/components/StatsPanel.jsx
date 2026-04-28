/**
 * StatsPanel.jsx
 * Live statistics dashboard for CrisisLink.
 * Shows: events, confirmations, false alarms, active devices, response rate.
 */
import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../api/api';
import socketService from '../services/socket';

const Stat = ({ icon, value, label, color }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: `1px solid ${color}30`,
    minWidth: '90px',
    flex: 1,
    transition: 'transform 0.2s',
  }}>
    <span style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</span>
    <span style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</span>
    <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
  </div>
);

const StatsPanel = () => {
  const [stats, setStats] = useState({
    totalEvents: 0,
    confirmations: 0,
    falseAlarms: 0,
    activeDevices: 0,
    responseRate: 0,
    topType: null,
    uptime: 0,
  });
  const [visible, setVisible] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.getStatus();
      if (res && res.success) {
        const d = res.data || {};
        setStats({
          totalEvents: d.eventCount ?? d.total_events ?? 0,
          confirmations: d.totalConfirmations ?? d.confirmations ?? 0,
          falseAlarms: d.falseAlarms ?? 0,
          activeDevices: d.connectedDevices ?? d.connected_devices ?? 0,
          responseRate: d.responseRate ?? 0,
          topType: d.topEventType ?? null,
          uptime: d.uptimeSeconds ?? 0,
        });
      }
    } catch (e) {
      // silently fail — stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 8000);

    // Also update device count from socket
    socketService.on('deviceCount', (count) => {
      setStats(prev => ({ ...prev, activeDevices: count }));
    });

    return () => {
      clearInterval(interval);
      socketService.off('deviceCount');
    };
  }, [fetchStats]);

  const uptimeStr = (() => {
    const s = stats.uptime;
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  })();

  const rateColor = stats.responseRate >= 70 ? '#22c55e' : stats.responseRate >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,27,75,0.9) 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      margin: '0 0 16px',
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Header */}
      <div
        onClick={() => setVisible(v => !v)}
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: visible ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Live Stats
          </span>
          <span style={{
            background: '#22c55e',
            color: '#000',
            fontSize: '9px',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: '20px',
            letterSpacing: '0.5px',
          }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>Uptime: {uptimeStr}</span>
          <span style={{ color: '#64748b', fontSize: '14px' }}>{visible ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Stats grid */}
      {visible && (
        <div style={{ padding: '14px 16px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Stat icon="📍" value={stats.totalEvents} label="Events" color="#60a5fa" />
            <Stat icon="✅" value={stats.confirmations} label="Confirmed" color="#22c55e" />
            <Stat icon="🚫" value={stats.falseAlarms} label="False Alarms" color="#f87171" />
            <Stat icon="📱" value={stats.activeDevices} label="Devices" color="#a78bfa" />
            <Stat icon="⚡" value={`${Math.round(stats.responseRate)}%`} label="Response" color={rateColor} />
          </div>

          {stats.topType && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Most reported:</span>
              <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600, textTransform: 'capitalize' }}>
                🔥 {stats.topType}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
