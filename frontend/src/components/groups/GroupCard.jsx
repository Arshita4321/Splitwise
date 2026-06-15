import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Crown } from 'lucide-react';
import Badge from '../ui/Badge.jsx';

export default function GroupCard({ group }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/groups/${group.id}`)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px',
        cursor: 'pointer', transition: 'border-color var(--transition), transform var(--transition)',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
          background: 'var(--accent-dim)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={20} color="var(--accent)" />
        </div>
        {group.role === 'admin' && (
          <Badge variant="indigo" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
            <Crown size={11} /> Admin
          </Badge>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{group.name}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
          {group.member_count} member{group.member_count === '1' || group.member_count === 1 ? '' : 's'} · {group.currency}
        </p>
      </div>
    </div>
  );
}
