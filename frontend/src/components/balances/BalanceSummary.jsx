import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Spinner from '../ui/Spinner.jsx';

export default function BalanceSummary({ data, loading, currency = '', currentUserId, onSettle }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!data) return null;

  const { member_balances = [], simplified_debts = [] } = data;
  const allSettled = member_balances.every(m => Math.abs(m.net_balance) < 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Member balances
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {member_balances.map(({ user, net_balance }) => (
            <div key={user.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--surface)',
            }}>
              <Avatar name={user.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>
                  {user.id === currentUserId ? 'You' : user.name}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {Math.abs(net_balance) < 0.01 ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>settled up</span>
                ) : net_balance > 0 ? (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)' }}>
                      +{currency}{Math.abs(net_balance).toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>gets back</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--red)' }}>
                      -{currency}{Math.abs(net_balance).toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>owes</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Suggested settlements
        </h3>

        {allSettled || simplified_debts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={28} />}
            title="All settled up"
            description="No outstanding balances in this group right now."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {simplified_debts.map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--surface)',
              }}>
                <Avatar name={d.from.name} size={32} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  {d.from.id === currentUserId ? 'You' : d.from.name}
                </span>
                <ArrowRight size={14} color="var(--text-2)" />
                <Avatar name={d.to.name} size={32} />
                <span style={{ fontSize: '13px', fontWeight: 600, flex: 1 }}>
                  {d.to.id === currentUserId ? 'You' : d.to.name}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{currency}{d.amount.toFixed(2)}</span>

                {d.from.id === currentUserId && (
                  <Button size="sm" onClick={() => onSettle?.(d)}>Settle up</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
