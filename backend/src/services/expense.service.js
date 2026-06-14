// src/services/expense.service.js
import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { getMember } from './group.service.js';

// ─── Split calculators ────────────────────────────────────────────────────────

/**
 * Returns an array of { user_id, amount_owed, share_value }
 * share_value is stored for 'percentage' and 'shares' types; NULL otherwise.
 */
function computeSplits(totalAmount, splitType, memberIds, splitsInput) {
  const total = parseFloat(totalAmount);

  if (splitType === 'equal') {
    // Distribute evenly; remainder goes to first user
    const base = Math.floor((total / memberIds.length) * 100) / 100;
    const remainder = parseFloat((total - base * memberIds.length).toFixed(2));
    return memberIds.map((uid, i) => ({
      user_id: uid,
      amount_owed: i === 0 ? parseFloat((base + remainder).toFixed(2)) : base,
      share_value: null,
    }));
  }

  if (splitType === 'unequal') {
    // splitsInput: [{ user_id, amount }]
    const sum = splitsInput.reduce((acc, s) => acc + parseFloat(s.amount), 0);
    if (Math.abs(sum - total) > 0.01) {
      throw new ApiError(400, `Unequal amounts must sum to ${total} (got ${sum.toFixed(2)})`);
    }
    return splitsInput.map(s => ({
      user_id: s.user_id,
      amount_owed: parseFloat(parseFloat(s.amount).toFixed(2)),
      share_value: null,
    }));
  }

  if (splitType === 'percentage') {
    // splitsInput: [{ user_id, percentage }]
    const totalPct = splitsInput.reduce((acc, s) => acc + parseFloat(s.percentage), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new ApiError(400, `Percentages must sum to 100 (got ${totalPct.toFixed(2)})`);
    }
    return splitsInput.map(s => ({
      user_id: s.user_id,
      amount_owed: parseFloat((total * parseFloat(s.percentage) / 100).toFixed(2)),
      share_value: parseFloat(s.percentage),
    }));
  }

  if (splitType === 'shares') {
    // splitsInput: [{ user_id, shares }]
    const totalShares = splitsInput.reduce((acc, s) => acc + parseInt(s.shares, 10), 0);
    if (totalShares <= 0) throw new ApiError(400, 'Total shares must be > 0');
    return splitsInput.map(s => ({
      user_id: s.user_id,
      amount_owed: parseFloat((total * parseInt(s.shares, 10) / totalShares).toFixed(2)),
      share_value: parseInt(s.shares, 10),
    }));
  }

  throw new ApiError(400, `Unknown split_type: ${splitType}`);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export const createExpense = async (requesterId, {
  group_id, paid_by, amount, description, category, split_type, splits,
}) => {
  await getMember(group_id, requesterId);

  // For 'equal' split, use all group members automatically
  let memberIds = [];
  if (split_type === 'equal') {
    const { rows } = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id=$1', [group_id]
    );
    memberIds = rows.map(r => r.user_id);
  }

  const splitRows = computeSplits(amount, split_type, memberIds, splits || []);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const expRes = await client.query(
      `INSERT INTO expenses (group_id, paid_by, amount, description, category, split_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [group_id, paid_by || requesterId, amount, description, category || 'general', split_type]
    );
    const expense = expRes.rows[0];

    for (const row of splitRows) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed, share_value)
         VALUES ($1, $2, $3, $4)`,
        [expense.id, row.user_id, row.amount_owed, row.share_value]
      );
    }

    await client.query('COMMIT');
    return getExpenseById(expense.id, requesterId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getGroupExpenses = async (groupId, requesterId) => {
  await getMember(groupId, requesterId);

  const { rows } = await pool.query(
    `SELECT e.*,
            u.name  AS paid_by_name,
            (SELECT COUNT(*) FROM messages m WHERE m.expense_id = e.id) AS message_count
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     WHERE e.group_id=$1 AND e.is_deleted=FALSE
     ORDER BY e.created_at DESC`,
    [groupId]
  );
  return rows;
};

export const getExpenseById = async (expenseId, requesterId) => {
  const { rows } = await pool.query(
    `SELECT e.*, u.name AS paid_by_name
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     WHERE e.id=$1 AND e.is_deleted=FALSE`,
    [expenseId]
  );
  if (!rows.length) throw new ApiError(404, 'Expense not found');
  const expense = rows[0];

  // Verify requester is a group member
  await getMember(expense.group_id, requesterId);

  // Attach splits
  const splitsRes = await pool.query(
    `SELECT es.*, u.name AS user_name
     FROM expense_splits es
     JOIN users u ON u.id = es.user_id
     WHERE es.expense_id=$1`,
    [expenseId]
  );
  expense.splits = splitsRes.rows;
  return expense;
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateExpense = async (expenseId, requesterId, updates) => {
  const expense = await getExpenseById(expenseId, requesterId);
  if (expense.paid_by !== requesterId) {
    const member = await getMember(expense.group_id, requesterId);
    if (member.role !== 'admin') throw new ApiError(403, 'Only the payer or an admin can edit this expense');
  }

  const { amount, description, category, split_type, splits } = updates;
  const newAmount     = amount      ?? expense.amount;
  const newSplitType  = split_type  ?? expense.split_type;

  let memberIds = [];
  if (newSplitType === 'equal') {
    const { rows } = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id=$1', [expense.group_id]
    );
    memberIds = rows.map(r => r.user_id);
  }
  const splitRows = computeSplits(newAmount, newSplitType, memberIds, splits || []);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE expenses
       SET amount=$1, description=COALESCE($2,description),
           category=COALESCE($3,category), split_type=$4, updated_at=NOW()
       WHERE id=$5`,
      [newAmount, description, category, newSplitType, expenseId]
    );

    await client.query('DELETE FROM expense_splits WHERE expense_id=$1', [expenseId]);

    for (const row of splitRows) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed, share_value)
         VALUES ($1, $2, $3, $4)`,
        [expenseId, row.user_id, row.amount_owed, row.share_value]
      );
    }

    await client.query('COMMIT');
    return getExpenseById(expenseId, requesterId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── Delete (soft) ────────────────────────────────────────────────────────────

export const deleteExpense = async (expenseId, requesterId) => {
  const expense = await getExpenseById(expenseId, requesterId);
  if (expense.paid_by !== requesterId) {
    const member = await getMember(expense.group_id, requesterId);
    if (member.role !== 'admin') throw new ApiError(403, 'Only the payer or an admin can delete this expense');
  }
  await pool.query(
    'UPDATE expenses SET is_deleted=TRUE, updated_at=NOW() WHERE id=$1',
    [expenseId]
  );
};