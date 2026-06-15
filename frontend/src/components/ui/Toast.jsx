import React from 'react';

const colors = {
  success: { border: '#22c55e', icon: '✓' },
  error:   { border: '#f43f5e', icon: '✕' },
  info:    { border: '#6366f1', icon: 'i' },
};

function ToastItem({ toast, onDismiss }) {
  const c = colors[toast.type] || colors.info;
  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', background: '#1e2530',
        border: `1px solid ${c.border}22`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: '10px', cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        minWidth: '260px', maxWidth: '360px',
        animation: 'slideIn 0.2s ease',
      }}
    >
      <span style={{ fontSize: '12px', fontWeight: 700, color: c.border }}>{c.icon}</span>
      <span style={{ fontSize: '13px', color: '#f0f4f8', flex: 1 }}>{toast.message}</span>
    </div>
  );
}

export default function Toast({ toasts, dismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999,
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
    </div>
  );
}