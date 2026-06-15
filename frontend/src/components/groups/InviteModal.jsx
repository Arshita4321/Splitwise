import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import { inviteUser } from '../../api/groups.js';
import { useToast } from '../../hooks/useToast.js';

export default function InviteModal({ open, onClose, groupId, onInvited }) {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => { setEmail(''); setError(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await inviteUser(groupId, { email: email.trim().toLowerCase() });
      toast({ type: 'success', message: `Invite sent to ${res.data.data.invited_user?.name || email}` });
      onInvited?.(res.data.data);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Invite to group">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Email address"
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={error}
          autoFocus
        />
        <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
          The person must already have a Splitwise account. They'll see this invite
          next time they sign in and can accept or decline it.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send invite'}</Button>
        </div>
      </form>
    </Modal>
  );
}
