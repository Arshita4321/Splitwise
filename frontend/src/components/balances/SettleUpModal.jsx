import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { recordPayment } from '../../api/balances.js';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SettleUpModal({ open, onClose, group, members = [], prefill, onSettled }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const otherMembers = members.filter(m => m.id !== user?.id);

  const [paidTo, setPaidTo]   = useState('');
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaidTo(prefill?.to?.id ?? otherMembers[0]?.id ?? '');
    setAmount(prefill?.amount ? String(prefill.amount) : '');
    setNote('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill, group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!paidTo) return setError('Select who you paid');
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount');

    setLoading(true);
    try {
      await recordPayment({
        group_id: group.id,
        paid_to: +paidTo,
        amount: parseFloat(amount),
        note: note.trim() || undefined,
      });
      toast({ type: 'success', message: 'Payment recorded' });
      onSettled?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Modal open={open} onClose={onClose} title="Settle up">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--red-dim)', color: 'var(--red)', fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)' }}>You paid</label>
          <select
            value={paidTo}
            onChange={e => setPaidTo(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-1)', fontSize: '14px',
            }}
          >
            {otherMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <Input
          label={`Amount (${group.currency})`}
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        <Input
          label="Note (optional)"
          placeholder="e.g. Cash, UPI, bank transfer"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Recording…' : 'Record payment'}</Button>
        </div>
      </form>
    </Modal>
  );
}
