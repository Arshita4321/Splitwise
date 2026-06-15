import React from 'react';
import {
  Utensils, Car, Home, ShoppingBag, Film, Zap, Plane, Receipt, MessageCircle, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '../ui/Avatar.jsx';

const CATEGORY_ICONS = {
  food:      Utensils,
  transport: Car,
  rent:      Home,
  shopping:  ShoppingBag,
  entertainment: Film,
  utilities: Zap,
  travel:    Plane,
  general:   Receipt,
};

export default function ExpenseItem({ expense, currency = '', currentUserId, onClick, onDelete }) {
  const Icon = CATEGORY_ICONS[expense.category] || Receipt;
  const youPaid = expense.paid_by === currentUserId;

  const mySplit = expense.splits?.find(s => s.user_id === currentUserId);

  let subtext = null;
  if (mySplit) {
    if (youPaid) {
      const others = parseFloat(expense.amount) - parseFloat(mySplit.amount_owed);
      subtext = others > 0.01
        ? <span style={{ color: 'var(--green)' }}>you lent {currency}{others.toFixed(2)}</span>
        : <span style={{ color: 'var(--text-2)' }}>not split</span>;
    } else {
      subtext = <span style={{ color: 'var(--red)' }}>you owe {currency}{parseFloat(mySplit.amount_owed).toFixed(2)}</span>;
    }
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)', background: 'var(--surface)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--transition)',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
        background: 'var(--surface-2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color="var(--text-2)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {expense.description}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
          {youPaid ? 'You' : expense.paid_by_name} paid · {format(new Date(expense.created_at), 'MMM d, yyyy')}
          {expense.message_count > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '8px' }}>
              <MessageCircle size={11} /> {expense.message_count}
            </span>
          )}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 700 }}>{currency}{parseFloat(expense.amount).toFixed(2)}</p>
        {subtext && <p style={{ fontSize: '12px', marginTop: '2px' }}>{subtext}</p>}
      </div>

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
          title="Delete expense"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '30px', height: '30px', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-3)', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
