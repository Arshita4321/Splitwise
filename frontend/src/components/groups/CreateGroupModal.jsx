import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { createGroup } from '../../api/groups.js';
import { useToast } from '../../hooks/useToast.js';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'];

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const [name, setName]         = useState('');
  const [currency, setCurrency] = useState('INR');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { toast } = useToast();

  const reset = () => { setName(''); setCurrency('INR'); setError(''); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Group name is required'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await createGroup({ name: name.trim(), currency });
      toast({ type: 'success', message: `"${res.data.data.name}" created` });
      onCreated?.(res.data.data);
      reset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create a group">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Group name"
          placeholder="e.g. Goa Trip, Apartment 4B"
          value={name}
          onChange={e => setName(e.target.value)}
          error={error}
          autoFocus
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)' }}>Currency</label>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-1)', fontSize: '14px', appearance: 'none',
            }}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create group'}</Button>
        </div>
      </form>
    </Modal>
  );
}
