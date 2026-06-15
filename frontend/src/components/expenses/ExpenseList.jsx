import React from 'react';
import { Receipt } from 'lucide-react';
import ExpenseItem from './ExpenseItem.jsx';
import Spinner from '../ui/Spinner.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function ExpenseList({ expenses, loading, currency, currentUserId, onSelect, onDelete }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <EmptyState
        icon={<Receipt size={32} />}
        title="No expenses yet"
        description="Add the first expense to start tracking who owes what."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {expenses.map(expense => (
        <ExpenseItem
          key={expense.id}
          expense={expense}
          currency={currency}
          currentUserId={currentUserId}
          onClick={() => onSelect?.(expense)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
