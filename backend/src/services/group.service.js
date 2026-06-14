// src/services/group.service.js
import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

// ─── Groups ──────────────────────────────────────────────────────────────────

export const createGroup = async (name, currency = 'INR', createdBy) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO groups (name, currency, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, currency, createdBy]
    );
    const group = rows[0];

    // Creator is automatically an admin member
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [group.id, createdBy]
    );

    await client.query('COMMIT');
    return group;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getUserGroups = async (userId) => {
  const { rows } = await pool.query(
    `SELECT g.*, gm.role,
            COUNT(DISTINCT gm2.user_id) AS member_count
     FROM groups g
     JOIN group_members gm  ON gm.group_id = g.id AND gm.user_id = $1
     JOIN group_members gm2 ON gm2.group_id = g.id
     GROUP BY g.id, gm.role
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return rows;
};

export const getGroupById = async (groupId, requesterId) => {
  const { rows } = await pool.query(
    `SELECT g.*, gm.role
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2
     WHERE g.id = $1`,
    [groupId, requesterId]
  );
  if (!rows.length) throw new ApiError(404, 'Group not found or you are not a member');
  return rows[0];
};

export const updateGroup = async (groupId, requesterId, { name, currency }) => {
  const member = await getMember(groupId, requesterId);
  if (member.role !== 'admin') throw new ApiError(403, 'Only admins can update the group');

  const { rows } = await pool.query(
    `UPDATE groups SET name = COALESCE($1, name),
                       currency = COALESCE($2, currency)
     WHERE id = $3 RETURNING *`,
    [name, currency, groupId]
  );
  return rows[0];
};

export const deleteGroup = async (groupId, requesterId) => {
  const member = await getMember(groupId, requesterId);
  if (member.role !== 'admin') throw new ApiError(403, 'Only admins can delete the group');

  await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const getGroupMembers = async (groupId) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, gm.role, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at`,
    [groupId]
  );
  return rows;
};

export const addMemberDirectly = async (groupId, requesterId, targetUserId) => {
  const requester = await getMember(groupId, requesterId);
  if (requester.role !== 'admin') throw new ApiError(403, 'Only admins can add members directly');

  const existing = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2',
    [groupId, targetUserId]
  );
  if (existing.rows.length) throw new ApiError(409, 'User is already a member');

  const { rows } = await pool.query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, 'member') RETURNING *`,
    [groupId, targetUserId]
  );
  return rows[0];
};

export const removeMember = async (groupId, requesterId, targetUserId) => {
  const requester = await getMember(groupId, requesterId);
  const isSelf = requesterId === targetUserId;
  if (requester.role !== 'admin' && !isSelf) {
    throw new ApiError(403, 'Permission denied');
  }
  await pool.query(
    'DELETE FROM group_members WHERE group_id=$1 AND user_id=$2',
    [groupId, targetUserId]
  );
};

// ─── Invites ─────────────────────────────────────────────────────────────────

export const inviteByEmail = async (groupId, invitedById, email) => {
  // Must be a member to invite
  await getMember(groupId, invitedById);

  const userRes = await pool.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
  if (!userRes.rows.length) throw new ApiError(404, 'No user found with that email');
  const invitedUser = userRes.rows[0];

  const alreadyMember = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2',
    [groupId, invitedUser.id]
  );
  if (alreadyMember.rows.length) throw new ApiError(409, 'User is already a member');

  const { rows } = await pool.query(
    `INSERT INTO group_invites (group_id, invited_by, invited_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, invited_user_id)
     DO UPDATE SET status='pending', created_at=NOW()
     RETURNING *`,
    [groupId, invitedById, invitedUser.id]
  );
  return { ...rows[0], invited_user: invitedUser };
};

export const respondToInvite = async (inviteId, userId, action) => {
  const { rows } = await pool.query(
    'SELECT * FROM group_invites WHERE id=$1 AND invited_user_id=$2',
    [inviteId, userId]
  );
  if (!rows.length) throw new ApiError(404, 'Invite not found');
  const invite = rows[0];
  if (invite.status !== 'pending') throw new ApiError(400, 'Invite already responded to');

  const newStatus = action === 'accept' ? 'accepted' : 'declined';
  await pool.query('UPDATE group_invites SET status=$1 WHERE id=$2', [newStatus, inviteId]);

  if (action === 'accept') {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [invite.group_id, userId]
    );
  }
  return { message: action === 'accept' ? 'Joined group successfully' : 'Invite declined' };
};

export const getPendingInvitesForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT gi.*, g.name AS group_name, u.name AS invited_by_name
     FROM group_invites gi
     JOIN groups g ON g.id = gi.group_id
     JOIN users u  ON u.id = gi.invited_by
     WHERE gi.invited_user_id=$1 AND gi.status='pending'
     ORDER BY gi.created_at DESC`,
    [userId]
  );
  return rows;
};

export const getGroupInvites = async (groupId, requesterId) => {
  await getMember(groupId, requesterId);
  const { rows } = await pool.query(
    `SELECT gi.*, u.name AS invited_user_name, u.email AS invited_user_email
     FROM group_invites gi
     JOIN users u ON u.id = gi.invited_user_id
     WHERE gi.group_id=$1 AND gi.status='pending'
     ORDER BY gi.created_at DESC`,
    [groupId]
  );
  return rows;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

export const getMember = async (groupId, userId) => {
  const { rows } = await pool.query(
    'SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2',
    [groupId, userId]
  );
  if (!rows.length) throw new ApiError(403, 'Not a member of this group');
  return rows[0];
};