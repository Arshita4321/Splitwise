import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { createExpense, updateExpense } from '../../api/expenses.js';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CATEGORIES = ['general', 'food', 'transport', 'rent', 'shopping', 'entertainment', 'utilities', 'travel'];
const SPLIT_TYPES = [
  { value: 'equal',      label: 'Equal' },
  { value: 'unequal',    label: 'Amounts' },
  { value: 'percentage', label: 'Percentages' },
  { value: 'shares',     label: 'Shares' },
];

function buildInitialSplits(members, expense) {
  const map = {};
  members.forEach(m => { map[m.id] = { amount: '', percentage: '', shares: '1', include: true }; });

  if (expense?.splits) {
    members.forEach(m => { map[m.id].include = false; });
    expense.splits.forEach(s => {
      if (!map[s.user_id]) return;
      map[s.user_id].include = true;
      map[s.user_id].amount = String(s.amount_owed ?? '');
      if (expense.split_type === 'percentage') map[s.user_id].percentage = String(s.share_value ?? '');
      if (expense.split_type === 'shares')     map[s.user_id].shares     = String(s.share_value ?? '1');
    });
  }
  return map;
}

export default function AddExpenseModal({ open, onClose, group, expense, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const members = group?.members || [];
  const isEdit = !!expense;

  const [description, setDescription] = useState('');
  const [amount, setAmount]            = useState('');
  const [category, setCategory]        = useState('general');
  const [paidBy, setPaidBy]            = useState(user?.id);
  const [splitType, setSplitType]      = useState('equal');
  const [splits, setSplits]            = useState({});
  const [error, setError]              = useState('');
  const [loading, setLoading]          = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setDescription(expense.description || '');
      setAmount(String(expense.amount || ''));
      setCategory(expense.category || 'general');
      setPaidBy(expense.paid_by);
      setSplitType(expense.split_type || 'equal');
      setSplits(buildInitialSplits(members, expense));
    } else {
      setDescription('');
      setAmount('');
      setCategory('general');
      setPaidBy(user?.id);
      setSplitType('equal');
      setSplits(buildInitialSplits(members, null));
    }
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense, group]);

  const toggleMember = (id) => {
    setSplits(prev => ({ ...prev, [id]: { ...prev[id], include: !prev[id].include } }));
  };

  const updateSplitField = (id, field, value) => {
    setSplits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const includedMembers = members.filter(m => splits[m.id]?.include);

  const splitEqually = () => {
    const count = includedMembers.length;
    if (!count || !amount) return;
    const base = Math.floor((parseFloat(amount) / count) * 100) / 100;
    const remainder = +(parseFloat(amount) - base * count).toFixed(2);
    setSplits(prev => {
      const next = { ...prev };
      includedMembers.forEach((m, i) => {
        next[m.id] = { ...next[m.id], amount: String(i === 0 ? +(base + remainder).toFixed(2) : base) };
      });
      return next;
    });
  };

  const splitPercentEqually = () => {
    const count = includedMembers.length;
    if (!count) return;
    const base = +(100 / count).toFixed(2);
    const remainder = +(100 - base * count).toFixed(2);
    setSplits(prev => {
      const next = { ...prev };
      includedMembers.forEach((m, i) => {
        next[m.id] = { ...next[m.id], percentage: String(i === 0 ? +(base + remainder).toFixed(2) : base) };
      });
      return next;
    });
  };

  const fieldKey = splitType === 'percentage' ? 'percentage' : splitType === 'shares' ? 'shares' : 'amount';

  const runningTotal = includedMembers.reduce((sum, m) => sum + (parseFloat(splits[m.id]?.[fieldKey]) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) return setError('Description is required');
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount');
    if (splitType !== 'equal' && includedMembers.length < 2) return setError('Select at least 2 members to split between');

    let payload = {
      group_id: group.id,
      amount: parseFloat(amount),
      description: description.trim(),
      category,
      paid_by: paidBy,
      split_type: splitType,
    };

    if (splitType === 'unequal') {
      const sum = includedMembers.reduce((s, m) => s + (parseFloat(splits[m.id]?.amount) || 0), 0);
      if (Math.abs(sum - parseFloat(amount)) > 0.01) {
        return setError(`Amounts must add up to ${parseFloat(amount).toFixed(2)} (currently ${sum.toFixed(2)})`);
      }
      payload.splits = includedMembers.map(m => ({ user_id: m.id, amount: parseFloat(splits[m.id].amount) || 0 }));
    } else if (splitType === 'percentage') {
      const sum = includedMembers.reduce((s, m) => s + (parseFloat(splits[m.id]?.percentage) || 0), 0);
      if (Math.abs(sum - 100) > 0.01) {
        return setError(`Percentages must add up to 100 (currently ${sum.toFixed(2)})`);
      }
      payload.splits = includedMembers.map(m => ({ user_id: m.id, percentage: parseFloat(splits[m.id].percentage) || 0 }));
    } else if (splitType === 'shares') {
      payload.splits = includedMembers.map(m => ({ user_id: m.id, shares: parseInt(splits[m.id].shares, 10) || 1 }));
    }

    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await updateExpense(expense.id, payload);
        toast({ type: 'success', message: 'Expense updated' });
      } else {
        res = await createExpense(payload);
        toast({ type: 'success', message: 'Expense added' });
      }
      onSaved?.(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit expense' : 'Add expense'} width="540px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--red-dim)', color: 'var(--red)', fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <Input
          label="Description"
          placeholder="e.g. Dinner at Cafe Mocha"
          value={description}
          onChange={e => setDescription(e.target.value)}
          autoFocus
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <Input
              label={`Amount (${group.currency})`}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)' }}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-1)', fontSize: '14px',
              }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)' }}>Paid by</label>
          <select
            value={paidBy}
            onChange={e => setPaidBy(+e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-1)', fontSize: '14px',
            }}
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.id === user?.id ? 'You' : m.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)' }}>Split</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {SPLIT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSplitType(t.value)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 'var(--radius-md)',
                  fontSize: '13px', fontWeight: 600,
                  background: splitType === t.value ? 'var(--accent)' : 'var(--surface-2)',
                  color: splitType === t.value ? '#fff' : 'var(--text-2)',
                  border: `1px solid ${splitType === t.value ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {splitType === 'equal' ? (
          <p style={{
            fontSize: '13px', color: 'var(--text-2)', background: 'var(--surface-2)',
            padding: '12px 14px', borderRadius: 'var(--radius-md)',
          }}>
            Split equally among all {members.length} group member{members.length === 1 ? '' : 's'}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                {splitType === 'percentage' ? 'Total must equal 100%' :
                 splitType === 'unequal' ? `Total must equal ${amount ? parseFloat(amount).toFixed(2) : '0.00'}` :
                 'Higher shares = larger portion'}
              </span>
              {splitType !== 'shares' && (
                <button
                  type="button"
                  onClick={splitType === 'percentage' ? splitPercentEqually : splitEqually}
                  style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}
                >
                  Split equally
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {members.map(m => {
                const row = splits[m.id] || {};
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-2)', opacity: row.include ? 1 : 0.45,
                  }}>
                    <input
                      type="checkbox"
                      checked={!!row.include}
                      onChange={() => toggleMember(m.id)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                    />
                    <span style={{ flex: 1, fontSize: '13px' }}>{m.id === user?.id ? 'You' : m.name}</span>
                    <input
                      type="number"
                      step={splitType === 'shares' ? '1' : '0.01'}
                      min="0"
                      disabled={!row.include}
                      value={row[fieldKey] || ''}
                      onChange={e => updateSplitField(m.id, fieldKey, e.target.value)}
                      style={{
                        width: '90px', padding: '6px 10px', background: 'var(--surface)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-1)', fontSize: '13px', textAlign: 'right',
                      }}
                    />
                    {splitType === 'percentage' && <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>%</span>}
                  </div>
                );
              })}
            </div>

            {splitType !== 'shares' && (
              <p style={{ fontSize: '12px', color: 'var(--text-2)', textAlign: 'right' }}>
                Total: {runningTotal.toFixed(2)}{splitType === 'percentage' ? '%' : ` ${group.currency}`}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
