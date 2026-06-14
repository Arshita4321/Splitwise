// src/services/balance.service.js
import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { getMember } from './group.service.js';

// ─── Core: net balances per group ────────────────────────────────────────────
/**
 * Returns net[fromUserId][toUserId] = amount fromUser owes toUser
 * Positive value → fromUser owes toUser
 * Accounts for both expenses and recorded payments.
 */
async function buildNetMatrix(groupId) {
  // 1. Load every non-deleted expense split in the group
  const { rows: splits } = await pool.query(
    `SELECT es.user_id, es.amount_owed, e.paid_by
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id=$1 AND e.is_deleted=FALSE`,
    [groupId]
  );

  // 2. Load every payment in the group
  const { rows: payments } = await pool.query(
    'SELECT paid_by, paid_to, amount FROM payments WHERE group_id=$1',
    [groupId]
  );

  const net = {}; // net[a][b] = a owes b

  const add = (from, to, amt) => {
    if (from === to) return;
    if (!net[from]) net[from] = {};
    if (!net[to])   net[to]   = {};
    net[from][to] = (net[from][to] || 0) + amt;
    net[to][from] = (net[to][from] || 0) - amt;
  };

  for (const s of splits) {
    if (s.user_id !== s.paid_by) {
      add(s.user_id, s.paid_by, parseFloat(s.amount_owed));
    }
  }

  for (const p of payments) {
    add(p.paid_by, p.paid_to, -parseFloat(p.amount)); // payment reduces debt
  }

  return net;
}

// ─── Greedy debt simplification ──────────────────────────────────────────────
function simplifyDebts(net, memberIds) {
  // Compute net balance per person: positive = owed money, negative = owes money
  const balance = {};
  memberIds.forEach(id => { balance[id] = 0; });

  for (const from of memberIds) {
    for (const to of memberIds) {
      if (from !== to && net[from]?.[to]) {
        balance[from] -= net[from][to];
        balance[to]   += net[from][to];
      }
    }
  }

  const debtors   = Object.entries(balance).filter(([, v]) => v < -0.01).map(([id, v]) => ({ id: +id, amt: -v }));
  const creditors = Object.entries(balance).filter(([, v]) => v >  0.01).map(([id, v]) => ({ id: +id, amt:  v }));

  const transactions = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amt, creditors[j].amt);
    transactions.push({ from: debtors[i].id, to: creditors[j].id, amount: +transfer.toFixed(2) });
    debtors[i].amt   -= transfer;
    creditors[j].amt -= transfer;
    if (debtors[i].amt   < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return transactions;
}

// ─── Group-wise balance ───────────────────────────────────────────────────────

export const getGroupBalances = async (groupId, requesterId) => {
  await getMember(groupId, requesterId);

  const memberRes = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM group_members gm JOIN users u ON u.id=gm.user_id
     WHERE gm.group_id=$1`,
    [groupId]
  );
  const members    = memberRes.rows;
  const memberIds  = members.map(m => m.id);
  const memberMap  = Object.fromEntries(members.map(m => [m.id, m]));

  const net = await buildNetMatrix(groupId);

  // Pairwise balances (A→B only once, amount positive = A owes B)
  const pairwise = [];
  for (let a = 0; a < memberIds.length; a++) {
    for (let b = a + 1; b < memberIds.length; b++) {
      const owes = net[memberIds[a]]?.[memberIds[b]] || 0;
      if (Math.abs(owes) > 0.01) {
        pairwise.push({
          from: memberMap[owes > 0 ? memberIds[a] : memberIds[b]],
          to:   memberMap[owes > 0 ? memberIds[b] : memberIds[a]],
          amount: +Math.abs(owes).toFixed(2),
        });
      }
    }
  }

  // Per-member net (positive = owed to them, negative = they owe)
  const memberBalances = memberIds.map(id => {
    const totalOwes = memberIds.reduce((s, other) => {
      return other !== id ? s + (net[id]?.[other] || 0) : s;
    }, 0);
    return { user: memberMap[id], net_balance: +(-totalOwes).toFixed(2) };
  });

  const simplified = simplifyDebts(net, memberIds).map(t => ({
    from: memberMap[t.from],
    to:   memberMap[t.to],
    amount: t.amount,
  }));

  return { member_balances: memberBalances, pairwise, simplified_debts: simplified };
};

// ─── Individual summary across all groups ────────────────────────────────────

export const getUserBalanceSummary = async (userId) => {
  const { rows: memberships } = await pool.query(
    `SELECT g.id, g.name, g.currency
     FROM groups g JOIN group_members gm ON gm.group_id=g.id
     WHERE gm.user_id=$1`,
    [userId]
  );

  let overallNet = 0;
  const groups = [];

  for (const group of memberships) {
    const net = await buildNetMatrix(group.id);

    let totalOwe  = 0; // I owe others
    let totalOwed = 0; // others owe me

    const memberRes = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id=$1', [group.id]
    );
    for (const { user_id: other } of memberRes.rows) {
      if (other === userId) continue;
      const owes = net[userId]?.[other] || 0;
      if (owes > 0.01)       totalOwe  += owes;
      else if (owes < -0.01) totalOwed += Math.abs(owes);
    }

    const groupNet = +(totalOwed - totalOwe).toFixed(2);
    overallNet += groupNet;

    if (totalOwe > 0.01 || totalOwed > 0.01) {
      groups.push({
        group: { id: group.id, name: group.name, currency: group.currency },
        you_owe:  +totalOwe.toFixed(2),
        you_are_owed: +totalOwed.toFixed(2),
        net: groupNet,
      });
    }
  }

  return { overall_net: +overallNet.toFixed(2), groups };
};

// ─── Settle / record payment ─────────────────────────────────────────────────

export const recordPayment = async (requesterId, { group_id, paid_to, amount, note }) => {
  await getMember(group_id, requesterId);

  if (requesterId === paid_to) throw new ApiError(400, 'Cannot pay yourself');
  await getMember(group_id, paid_to); // payee must also be a member

  const { rows } = await pool.query(
    `INSERT INTO payments (group_id, paid_by, paid_to, amount)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [group_id, requesterId, paid_to, amount]
  );
  return rows[0];
};

export const getGroupPayments = async (groupId, requesterId) => {
  await getMember(groupId, requesterId);

  const { rows } = await pool.query(
    `SELECT p.*, payer.name AS payer_name, payee.name AS payee_name
     FROM payments p
     JOIN users payer ON payer.id = p.paid_by
     JOIN users payee ON payee.id = p.paid_to
     WHERE p.group_id=$1
     ORDER BY p.created_at DESC`,
    [groupId]
  );
  return rows;
};