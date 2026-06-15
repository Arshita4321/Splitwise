import React from 'react';

export default function Input({ label, error, style, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#8b98a8' }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: '10px 14px',
          background: '#1e2530',
          border: `1px solid ${error ? '#f43f5e' : '#2a3240'}`,
          borderRadius: '10px',
          color: '#f0f4f8',
          fontSize: '14px',
          transition: 'border-color 150ms ease',
          ...style,
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e  => e.target.style.borderColor = error ? '#f43f5e' : '#2a3240'}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: '#f43f5e' }}>{error}</span>}
    </div>
  );
}