import React, { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, width = '480px' }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#161b22', border: '1px solid #2a3240',
          borderRadius: '16px', width: '100%', maxWidth: width,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #2a3240',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              color: '#536070', fontSize: '20px', lineHeight: 1,
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            }}
          >×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}