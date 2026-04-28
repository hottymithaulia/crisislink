/**
 * QRShare.jsx
 * Shows a live QR code of the current app URL so judges/users can scan and join.
 * Uses position:fixed so the panel always floats above everything, never clipped.
 */
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createPortal } from 'react-dom';

const QRShare = () => {
  const [url, setUrl]       = useState('');
  const [copied, setCopied] = useState(false);
  const [show, setShow]     = useState(false);
  const [pos, setPos]       = useState({ top: 60, right: 16 });
  const btnRef = useRef(null);

  useEffect(() => { setUrl(window.location.href); }, []);

  // Close on click outside
  useEffect(() => {
    if (!show) return;
    const handler = (e) => {
      if (!e.target.closest('[data-qrshare]')) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  const handleToggle = () => {
    if (!show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setShow(s => !s);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const popup = show ? createPortal(
    <div
      data-qrshare
      style={{
        position: 'fixed',
        top:   pos.top,
        right: pos.right,
        zIndex: 999999,
        background: 'linear-gradient(135deg, #1e1e2e 0%, #16213e 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
        width: '260px',
        textAlign: 'center',
      }}
    >
      {/* Close */}
      <button
        onClick={() => setShow(false)}
        style={{
          position: 'absolute', top: '10px', right: '12px',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '50%', width: '24px', height: '24px',
          color: '#94a3b8', cursor: 'pointer', fontSize: '11px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >✕</button>

      <p style={{ margin: '0 0 14px', color: '#e2e8f0', fontWeight: 700, fontSize: '14px' }}>
        📡 Scan to Join CrisisLink
      </p>

      {/* QR */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '12px',
        display: 'inline-block',
        marginBottom: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        {url && (
          <QRCodeSVG
            value={url}
            size={180}
            level="M"
            includeMargin={false}
            fgColor="#1e1e2e"
          />
        )}
      </div>

      <p style={{ margin: '0 0 10px', color: '#94a3b8', fontSize: '10px', wordBreak: 'break-all' }}>
        {url}
      </p>

      <button
        onClick={handleCopy}
        style={{
          width: '100%',
          background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copied ? '#22c55e' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '8px',
          color: copied ? '#22c55e' : '#e2e8f0',
          padding: '9px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {copied ? '✅ Copied!' : '📋 Copy Link'}
      </button>

      <p style={{ margin: '10px 0 0', color: '#475569', fontSize: '10px' }}>
        Works on any phone on this network
      </p>
    </div>,
    document.body
  ) : null;

  return (
    <div data-qrshare style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="Share this app"
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '8px',
          color: '#fff',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
        }}
      >
        📱 Share / Join
      </button>

      {popup}
    </div>
  );
};

export default QRShare;
