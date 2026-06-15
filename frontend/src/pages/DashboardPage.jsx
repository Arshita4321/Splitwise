import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Users } from 'lucide-react';
import { getMyBalances } from '../api/balances.js';
import { getMyGroups } from '../api/groups.js';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Avatar from '../components/ui/Avatar.jsx';

export default function DashboardPage() {
  const { setTitle } = useOutletContext();
  const [balances, setBalances] = useState(null);
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { setTitle('Dashboard'); }, [setTitle]);

  useEffect(() => {
    (async () => {
      try {
        const [balRes, groupsRes] = await Promise.all([getMyBalances(), getMyGroups()]);
        setBalances(balRes.data.data);
        setGroups(groupsRes.data.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spinner size={28} />
      </div>
    );
  }

  const overall = balances?.overall_net ?? 0;
  const groupBalances = balances?.groups ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overall summary */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px',
        display: 'flex', alignItems: 'center', gap: '20px',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: Math.abs(overall) < 0.01 ? 'var(--accent-dim)' : overall > 0 ? 'var(--green-dim)' : 'var(--red-dim)',
        }}>
          {Math.abs(overall) < 0.01 ? (
            <CheckCircle2 size={24} color="var(--accent)" />
          ) : overall > 0 ? (
            <ArrowDownLeft size={24} color="var(--green)" />
          ) : (
            <ArrowUpRight size={24} color="var(--red)" />
          )}
        </div>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '4px' }}>
            {Math.abs(overall) < 0.01 ? "You're all settled up" : overall > 0 ? 'You are owed overall' : 'You owe overall'}
          </p>
          <p style={{
            fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)',
            color: Math.abs(overall) < 0.01 ? 'var(--text-1)' : overall > 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {Math.abs(overall) < 0.01 ? '—' : `${Math.abs(overall).toFixed(2)}`}
          </p>
        </div>
      </div>

      {/* Per-group balances */}
      <div>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Balances by group
        </h2>

        {groupBalances.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={28} />}
            title="No outstanding balances"
            description="Add expenses in a group to see what you owe or are owed here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {groupBalances.map(({ group, you_owe, you_are_owed, net }) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  transition: 'border-color var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-dim)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Users size={18} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{group.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    {you_owe > 0.01 && `You owe ${group.currency}${you_owe.toFixed(2)}`}
                    {you_owe > 0.01 && you_are_owed > 0.01 && ' · '}
                    {you_are_owed > 0.01 && `You're owed ${group.currency}${you_are_owed.toFixed(2)}`}
                  </p>
                </div>
                <p style={{
                  fontSize: '14px', fontWeight: 700,
                  color: net > 0 ? 'var(--green)' : net < 0 ? 'var(--red)' : 'var(--text-2)',
                }}>
                  {net > 0 ? '+' : net < 0 ? '-' : ''}{group.currency}{Math.abs(net).toFixed(2)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent groups */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Your groups
          </h2>
          <Link to="/groups" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>View all</Link>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No groups yet"
            description="Create your first group to start splitting expenses."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {groups.slice(0, 4).map(group => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 16px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  transition: 'border-color var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Avatar name={group.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{group.name}</p>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  {group.member_count} members
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
