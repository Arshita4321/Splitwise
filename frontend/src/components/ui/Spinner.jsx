import React from 'react';

export default function Spinner({ size = 24, style }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid #2a3240`,
      borderTopColor: '#6366f1',
      animation: 'spin 0.7s linear infinite',
      ...style,
    }} />
  );
}

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('spinner-css')) {
  const s = document.createElement('style');
  s.id = 'spinner-css';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}