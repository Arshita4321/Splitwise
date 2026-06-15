import React from 'react';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '56px 24px', gap: '12px',
      color: '#536070', textAlign: 'center',
    }}>
      {icon && <div style={{ fontSize: '40px', marginBottom: '4px' }}>{icon}</div>}
      <p style={{ fontSize: '15px', fontWeight: 600, color: '#8b98a8' }}>{title}</p>
      {description && <p style={{ fontSize: '13px', maxWidth: '280px', lineHeight: 1.6 }}>{description}</p>}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}