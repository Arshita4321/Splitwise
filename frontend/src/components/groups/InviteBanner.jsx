import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { getMyInvites, respondInvite } from '../../api/groups.js';
import { useToast } from '../../hooks/useToast.js';
import Spinner from '../ui/Spinner.jsx';

export default function InviteBanner({ onResponded }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId]   = useState(null);
  const [open, setOpen]       = useState(false);
  const ref = useRef(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const res = await getMyInvites();
      setInvites(res.data.data || []);
    } catch {
      // silently ignore - non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const respond = async (invite, action) => {
    setBusyId(invite.id);
    try {
      await respondInvite(invite.id, { action });
      setInvites(prev => prev.filter(i => i.id !== invite.id));
      toast({
        type: action === 'accept' ? 'success' : 'info',
        message: action === 'accept'
          ? `Joined "${invite.group_name}"`
          : `Declined invite to "${invite.group_name}"`,
      });
      onResponded?.();
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.message || 'Something went wrong' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '38px', height: '38px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', color: 'var(--text-2)',
          background: open ? 'var(--surface-2)' : 'transparent',
        }}
      >
        <Bell size={17} />
        {invites.length > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--red)', border: '2px solid var(--surface)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '320px', maxHeight: '380px', overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          zIndex: 100,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Group invites</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <Spinner size={20} />
            </div>
          ) : invites.length === 0 ? (
            <p style={{ padding: '20px 16px', fontSize: '13px', color: 'var(--text-2)', textAlign: 'center' }}>
              No pending invites
            </p>
          ) : (
            invites.map(invite => (
              <div key={invite.id} style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{invite.group_name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    Invited by {invite.invited_by_name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => respond(invite, 'accept')}
                    disabled={busyId === invite.id}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '7px 0', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600,
                      background: 'var(--green-dim)', color: 'var(--green)',
                      opacity: busyId === invite.id ? 0.6 : 1,
                    }}
                  >
                    <Check size={13} /> Accept
                  </button>
                  <button
                    onClick={() => respond(invite, 'decline')}
                    disabled={busyId === invite.id}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '7px 0', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600,
                      background: 'var(--red-dim)', color: 'var(--red)',
                      opacity: busyId === invite.id ? 0.6 : 1,
                    }}
                  >
                    <X size={13} /> Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
