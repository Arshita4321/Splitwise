import React from 'react';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#f43f5e','#06b6d4','#a855f7'];

function colorFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function Avatar({ name = '?', size = 36, style }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colorFor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: '#fff',
      flexShrink: 0, userSelect: 'none', ...style,
    }}>
      {initials}
    </div>
  );
}