// src/socket/chat.socket.js
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

/**
 * Attaches Socket.IO real-time chat to the http.Server.
 * Each expense gets its own room: `expense:<id>`
 * Emitted events (server → client):
 *   joined            – confirmed join with last 50 messages
 *   new_message       – new message broadcast to room
 *   message_deleted   – broadcast when a message is removed
 *   user_typing       – typing indicator
 *   user_stop_typing  – stop typing indicator
 *   error             – error string
 */
export function initChatSocket(io) {
  // ── Auth middleware ──────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      const { rows } = await pool.query(
        'SELECT id, name, email FROM users WHERE id=$1', [decoded.id]
      );
      if (!rows.length) return next(new Error('User not found'));

      socket.user = rows[0];
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.user.name} (${socket.user.id})`);

    // ── join_expense ─────────────────────────────────────────────────────
    socket.on('join_expense', async ({ expense_id }) => {
      try {
        // Check expense exists and user belongs to the group
        const { rows: expRows } = await pool.query(
          'SELECT group_id FROM expenses WHERE id=$1 AND is_deleted=FALSE', [expense_id]
        );
        if (!expRows.length) return socket.emit('error', 'Expense not found');

        const { rows: memRows } = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2',
          [expRows[0].group_id, socket.user.id]
        );
        if (!memRows.length) return socket.emit('error', 'Not a group member');

        const room = `expense:${expense_id}`;
        socket.join(room);

        // Send last 50 messages
        const { rows: messages } = await pool.query(
          `SELECT m.*, u.name AS user_name
           FROM messages m JOIN users u ON u.id=m.user_id
           WHERE m.expense_id=$1
           ORDER BY m.created_at ASC
           LIMIT 50`,
          [expense_id]
        );

        socket.emit('joined', { expense_id, messages });
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ── send_message ─────────────────────────────────────────────────────
    socket.on('send_message', async ({ expense_id, content }) => {
      try {
        if (!content?.trim()) return socket.emit('error', 'Message cannot be empty');

        const { rows: expRows } = await pool.query(
          'SELECT group_id FROM expenses WHERE id=$1 AND is_deleted=FALSE', [expense_id]
        );
        if (!expRows.length) return socket.emit('error', 'Expense not found');

        const { rows: memRows } = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2',
          [expRows[0].group_id, socket.user.id]
        );
        if (!memRows.length) return socket.emit('error', 'Not a group member');

        const { rows } = await pool.query(
          `INSERT INTO messages (expense_id, user_id, content)
           VALUES ($1, $2, $3) RETURNING *`,
          [expense_id, socket.user.id, content.trim()]
        );

        const message = { ...rows[0], user_name: socket.user.name };

        // Broadcast to everyone in the room (including sender)
        io.to(`expense:${expense_id}`).emit('new_message', message);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ── delete_message ───────────────────────────────────────────────────
    socket.on('delete_message', async ({ message_id, expense_id }) => {
      try {
        const { rows } = await pool.query(
          'SELECT * FROM messages WHERE id=$1', [message_id]
        );
        if (!rows.length) return socket.emit('error', 'Message not found');
        if (rows[0].user_id !== socket.user.id) {
          return socket.emit('error', 'Cannot delete another user\'s message');
        }

        await pool.query('DELETE FROM messages WHERE id=$1', [message_id]);
        io.to(`expense:${expense_id}`).emit('message_deleted', { message_id });
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ── typing indicators ─────────────────────────────────────────────────
    socket.on('typing', ({ expense_id }) => {
      socket.to(`expense:${expense_id}`).emit('user_typing', {
        user_id: socket.user.id,
        name: socket.user.name,
      });
    });

    socket.on('stop_typing', ({ expense_id }) => {
      socket.to(`expense:${expense_id}`).emit('user_stop_typing', {
        user_id: socket.user.id,
      });
    });

    // ── leave ─────────────────────────────────────────────────────────────
    socket.on('leave_expense', ({ expense_id }) => {
      socket.leave(`expense:${expense_id}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.user.name}`);
    });
  });
}