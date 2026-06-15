import React from 'react';

const variants = {
  green:  { background: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  red:    { background: 'rgba(244,63,94,0.12)',   color: '#f43f5e' },
  amber:  { background: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  indigo: { background: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  muted:  { background: '#1e2530',                color: '#8b98a8' },
};

export default function Badge({ variant = 'muted', children, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 600, lineHeight: 1.5,
      ...variants[variant], ...style,
    }}>
      {children}
    </span>
  );
}