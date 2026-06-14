// src/services/message.service.js
import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { getMember } from './group.service.js';

const getExpenseGroupId = async (expenseId) => {
  const { rows } = await pool.query(
    'SELECT group_id FROM expenses WHERE id=$1 AND is_deleted=FALSE',
    [expenseId]
  );
  if (!rows.length) throw new ApiError(404, 'Expense not found');
  return rows[0].group_id;
};

export const getMessages = async (expenseId, requesterId) => {
  const groupId = await getExpenseGroupId(expenseId);
  await getMember(groupId, requesterId);

  const { rows } = await pool.query(
    `SELECT m.*, u.name AS user_name, u.email AS user_email
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.expense_id=$1
     ORDER BY m.created_at ASC`,
    [expenseId]
  );
  return rows;
};

export const postMessage = async (expenseId, userId, content) => {
  const groupId = await getExpenseGroupId(expenseId);
  await getMember(groupId, userId);

  const { rows } = await pool.query(
    `INSERT INTO messages (expense_id, user_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [expenseId, userId, content.trim()]
  );

  // Return with user info attached
  const full = await pool.query(
    `SELECT m.*, u.name AS user_name, u.email AS user_email
     FROM messages m JOIN users u ON u.id=m.user_id
     WHERE m.id=$1`,
    [rows[0].id]
  );
  return full.rows[0];
};

export const deleteMessage = async (messageId, userId) => {
  const { rows } = await pool.query('SELECT * FROM messages WHERE id=$1', [messageId]);
  if (!rows.length) throw new ApiError(404, 'Message not found');
  if (rows[0].user_id !== userId) throw new ApiError(403, 'Cannot delete another user\'s message');
  await pool.query('DELETE FROM messages WHERE id=$1', [messageId]);
};