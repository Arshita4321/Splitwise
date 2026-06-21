// src/pages/GroupDetailPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, UserPlus, ArrowLeftRight, Crown, LogOut, X, Pencil, Trash2, Upload } from 'lucide-react';
import { getGroup, getGroupInvites, removeMember } from '../api/groups.js';
import { getGroupExpenses, deleteExpense } from '../api/expenses.js';
import { getGroupBalances } from '../api/balances.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../hooks/useToast.js';

import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

import ExpenseList from '../components/expenses/ExpenseList.jsx';
import AddExpenseModal from '../components/expenses/AddExpenseModal.jsx';
import BalanceSummary from '../components/balances/BalanceSummary.jsx';
import SettleUpModal from '../components/balances/SettleUpModal.jsx';
import InviteModal from '../components/groups/InviteModal.jsx';
import ExpenseChat from '../components/messages/ExpenseChat.jsx';

import ImportModal from '../components/import/ImportModal.jsx';
import ImportHistoryPanel from '../components/import/ImportHistoryPanel.jsx';

const TABS = ['Expenses', 'Balances', 'Members'];

export default function GroupDetailPage() {
  const { id } = useParams();
  const groupId = +id;
  const { setTitle } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [group, setGroup]         = useState(null);
  const [expenses, setExpenses]   = useState([]);
  const [balances, setBalances]   = useState(null);
  const [invites, setInvites]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [tab, setTab]             = useState('Expenses');

  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [settleOpen, setSettleOpen]   = useState(false);
  const [settlePrefill, setSettlePrefill] = useState(null);
  const [inviteOpen, setInviteOpen]   = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const isAdmin = group?.role === 'admin';

  const loadGroup = useCallback(async () => {
    const res = await getGroup(groupId);
    setGroup(res.data.data);
    setTitle(res.data.data.name);
    return res.data.data;
  }, [groupId, setTitle]);

  const loadExpenses = useCallback(async () => {
    const res = await getGroupExpenses(groupId);
    setExpenses(res.data.data || []);
  }, [groupId]);

  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await getGroupBalances(groupId);
      setBalances(res.data.data);
    } finally {
      setBalancesLoading(false);
    }
  }, [groupId]);

  const loadInvites = useCallback(async (g) => {
    if (g?.role !== 'admin') return;
    try {
      const res = await getGroupInvites(groupId);
      setInvites(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [groupId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const g = await loadGroup();
        await Promise.all([loadExpenses(), loadBalances(), loadInvites(g)]);
      } catch (err) {
        toast({ type: 'error', message: err.response?.data?.message || 'Failed to load group' });
        navigate('/groups');
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  const refreshAfterExpenseChange = async () => {
    await Promise.all([loadExpenses(), loadBalances()]);
  };

  const refreshAfterImport = async () => {
    await Promise.all([loadExpenses(), loadBalances()]);
  };

  const handleExpenseSaved = async () => {
    await refreshAfterExpenseChange();
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Delete "${expense.description}"?`)) return;
    try {
      await deleteExpense(expense.id);
      toast({ type: 'success', message: 'Expense deleted' });
      await refreshAfterExpenseChange();
      if (selectedExpense?.id === expense.id) setSelectedExpense(null);
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.message || 'Failed to delete expense' });
    }
  };

  const handleSettle = (debt) => {
    setSettlePrefill(debt ? { to: debt.to, amount: debt.amount } : null);
    setSettleOpen(true);
  };

  const handleSettled = async () => {
    await loadBalances();
  };

  const handleRemoveMember = async (member) => {
    const self = member.id === user?.id;
    if (!window.confirm(self ? 'Leave this group?' : `Remove ${member.name} from the group?`)) return;
    try {
      await removeMember(groupId, member.id);
      if (self) {
        toast({ type: 'success', message: 'You left the group' });
        navigate('/groups');
        return;
      }
      toast({ type: 'success', message: `${member.name} removed` });
      await Promise.all([loadGroup(), loadBalances()]);
    } catch (err) {
      toast({ type: 'error', message: err.response?.data?.message || 'Action failed' });
    }
  };

  const canManage = (expense) => expense.paid_by === user?.id || isAdmin;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {group.members.slice(0, 5).map(m => (
            <Avatar key={m.id} name={m.name} size={32} style={{ marginLeft: '-10px' }} />
          ))}
          <span style={{ fontSize: '13px', color: 'var(--text-2)', marginLeft: '4px' }}>
            {group.members.length} member{group.members.length === 1 ? '' : 's'} · {group.currency}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus size={14} /> Invite
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => handleSettle(null)}>
            <ArrowLeftRight size={14} /> Settle up
          </Button>
          <Button size="sm" onClick={() => setAddExpenseOpen(true)}>
            <Plus size={14} /> Add expense
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(true)}>
            <Upload size={14} /> Import CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px', fontSize: '14px', fontWeight: 600,
              color: tab === t ? 'var(--text-1)' : 'var(--text-2)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Expenses' && (
        <>
          <ExpenseList
            expenses={expenses}
            currency={group.currency}
            currentUserId={user?.id}
            onSelect={setSelectedExpense}
            onDelete={(e) => canManage(e) && handleDeleteExpense(e)}
          />

          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Import History</h3>
              <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(true)}>
                <Upload size={14} /> New Import
              </Button>
            </div>
            <ImportHistoryPanel 
              groupId={groupId} 
              onResolved={refreshAfterImport} 
            />
          </div>
        </>
      )}

      {tab === 'Balances' && (
        <BalanceSummary
          data={balances}
          loading={balancesLoading}
          currency={group.currency}
          currentUserId={user?.id}
          onSettle={handleSettle}
        />
      )}

      {tab === 'Members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {group.members.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--surface)',
              }}>
                <Avatar name={m.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>
                    {m.id === user?.id ? 'You' : m.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>{m.email}</p>
                </div>
                {m.role === 'admin' && (
                  <Badge variant="indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Crown size={11} /> Admin
                  </Badge>
                )}
                {(isAdmin || m.id === user?.id) && (
                  <button
                    onClick={() => handleRemoveMember(m)}
                    title={m.id === user?.id ? 'Leave group' : 'Remove member'}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-3)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    {m.id === user?.id ? <LogOut size={14} /> : <X size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending invites
              </h3>
              {invites.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>No pending invites.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {invites.map(inv => (
                    <div key={inv.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', background: 'var(--surface)',
                    }}>
                      <Avatar name={inv.invited_user_name} size={32} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{inv.invited_user_name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>{inv.invited_user_email}</p>
                      </div>
                      <Badge variant="amber">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        open={addExpenseOpen || !!editingExpense}
        onClose={() => { setAddExpenseOpen(false); setEditingExpense(null); }}
        group={group}
        expense={editingExpense}
        onSaved={handleExpenseSaved}
      />

      <SettleUpModal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        group={group}
        members={group.members}
        prefill={settlePrefill}
        onSettled={handleSettled}
      />

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groupId={groupId}
        onInvited={() => loadInvites(group)}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        groupId={groupId}
        onImported={refreshAfterImport}
      />

      {/* Expense detail modal */}
      <Modal
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        title={selectedExpense?.description || 'Expense'}
        width="520px"
      >
        {selectedExpense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* ... your existing expense detail content ... */}
          </div>
        )}
      </Modal>
    </div>
  );
}