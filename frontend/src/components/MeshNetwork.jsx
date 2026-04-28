/**
 * MeshNetwork component
 * Mesh networking (Bluetooth/Wi-Fi Direct + Meshtastic LoRa) is DISABLED
 * for this MVP build.  It will be enabled in a future phase.
 *
 * Rendering a simple informational card instead of crashing.
 */
import React from 'react';

const MeshNetwork = () => {
  return (
    <div
      style={{
        margin: '1rem 0',
        padding: '1rem 1.25rem',
        background: 'rgba(107, 114, 128, 0.08)',
        border: '1px solid rgba(107, 114, 128, 0.2)',
        borderRadius: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: '#9ca3af',
        fontSize: '0.875rem'
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>🌐</span>
      <div>
        <strong style={{ color: '#6b7280' }}>Mesh Network</strong>{' '}
        — disabled in MVP mode (Bluetooth / LoRa relay coming in Phase 2).
        Real-time event sync via WebSocket is active.
      </div>
    </div>
  );
};

export default MeshNetwork;
