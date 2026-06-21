// src/services/group.service.js
import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

// ─── Safe ID Helper ─────────────────────────────────────────────────────────
const safeInt = (val) => {
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
};

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
  const safeId = safeInt(userId);
  if (!safeId) throw new ApiError(400, 'Invalid user ID');

  const { rows } = await pool.query(
    `SELECT g.*, gm.role,
            COUNT(DISTINCT gm2.user_id) AS member_count
     FROM groups g
     JOIN group_members gm  ON gm.group_id = g.id AND gm.user_id = $1
     JOIN group_members gm2 ON gm2.group_id = g.id
     GROUP BY g.id, gm.role
     ORDER BY g.created_at DESC`,
    [safeId]
  );
  return rows;
};

export const getGroupById = async (groupId, requesterId) => {
  const safeGroupId = safeInt(groupId);
  const safeRequesterId = safeInt(requesterId);
  if (!safeGroupId || !safeRequesterId) throw new ApiError(400, 'Invalid ID');

  const { rows } = await pool.query(
    `SELECT g.*, gm.role
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2
     WHERE g.id = $1`,
    [safeGroupId, safeRequesterId]
  );
  if (!rows.length) throw new ApiError(404, 'Group not found or you are not a member');
  return rows[0];
};

export const updateGroup = async (groupId, requesterId, { name, currency }) => {
  const member = await getMember(groupId, requesterId);
  if (member.role !== 'admin') throw new ApiError(403, 'Only admins can update the group');

  const safeGroupId = safeInt(groupId);
  const { rows } = await pool.query(
    `UPDATE groups SET name = COALESCE($1, name),
                       currency = COALESCE($2, currency)
     WHERE id = $3 RETURNING *`,
    [name, currency, safeGroupId]
  );
  return rows[0];
};

export const deleteGroup = async (groupId, requesterId) => {
  const member = await getMember(groupId, requesterId);
  if (member.role !== 'admin') throw new ApiError(403, 'Only admins can delete the group');

  const safeGroupId = safeInt(groupId);
  await pool.query('DELETE FROM groups WHERE id = $1', [safeGroupId]);
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const getGroupMembers = async (groupId) => {
  const safeGroupId = safeInt(groupId);
  if (!safeGroupId) throw new ApiError(400, 'Invalid group ID');

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, gm.role, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at`,
    [safeGroupId]
  );
  return rows;
};

export const addMemberDirectly = async (groupId, requesterId, targetUserId) => {
  const requester = await getMember(groupId, requesterId);
  if (requester.role !== 'admin') throw new ApiError(403, 'Only admins can add members directly');

  const safeGroupId = safeInt(groupId);
  const safeTargetId = safeInt(targetUserId);

  const existing = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2',
    [safeGroupId, safeTargetId]
  );
  if (existing.rows.length) throw new ApiError(409, 'User is already a member');

  const { rows } = await pool.query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, 'member') RETURNING *`,
    [safeGroupId, safeTargetId]
  );
  return rows[0];
};

export const removeMember = async (groupId, requesterId, targetUserId) => {
  const requester = await getMember(groupId, requesterId);
  const isSelf = safeInt(requesterId) === safeInt(targetUserId);
  if (requester.role !== 'admin' && !isSelf) {
    throw new ApiError(403, 'Permission denied');
  }

  const safeGroupId = safeInt(groupId);
  const safeTargetId = safeInt(targetUserId);

  await pool.query(
    'DELETE FROM group_members WHERE group_id=$1 AND user_id=$2',
    [safeGroupId, safeTargetId]
  );
};

// ─── Invites ─────────────────────────────────────────────────────────────────

export const inviteByEmail = async (groupId, invitedById, email) => {
  await getMember(groupId, invitedById);   // This is now safe inside getMember

  const userRes = await pool.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
  if (!userRes.rows.length) throw new ApiError(404, 'No user found with that email');
  const invitedUser = userRes.rows[0];

  const safeGroupId = safeInt(groupId);
  const alreadyMember = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2',
    [safeGroupId, invitedUser.id]
  );
  if (alreadyMember.rows.length) throw new ApiError(409, 'User is already a member');

  const { rows } = await pool.query(
    `INSERT INTO group_invites (group_id, invited_by, invited_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, invited_user_id)
     DO UPDATE SET status='pending', created_at=NOW()
     RETURNING *`,
    [safeGroupId, invitedById, invitedUser.id]
  );
  return { ...rows[0], invited_user: invitedUser };
};

export const respondToInvite = async (inviteId, userId, action) => {
  const safeInviteId = safeInt(inviteId);
  const safeUserId = safeInt(userId);
  if (!safeInviteId || !safeUserId) throw new ApiError(400, 'Invalid ID');

  const { rows } = await pool.query(
    'SELECT * FROM group_invites WHERE id=$1 AND invited_user_id=$2',
    [safeInviteId, safeUserId]
  );
  if (!rows.length) throw new ApiError(404, 'Invite not found');
  const invite = rows[0];
  if (invite.status !== 'pending') throw new ApiError(400, 'Invite already responded to');

  const newStatus = action === 'accept' ? 'accepted' : 'declined';
  await pool.query('UPDATE group_invites SET status=$1 WHERE id=$2', [newStatus, safeInviteId]);

  if (action === 'accept') {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [invite.group_id, safeUserId]
    );
  }
  return { message: action === 'accept' ? 'Joined group successfully' : 'Invite declined' };
};

export const getPendingInvitesForUser = async (userId) => {
  const safeId = safeInt(userId);
  if (!safeId) throw new ApiError(400, 'Invalid user ID');

  const { rows } = await pool.query(
    `SELECT gi.*, g.name AS group_name, u.name AS invited_by_name
     FROM group_invites gi
     JOIN groups g ON g.id = gi.group_id
     JOIN users u  ON u.id = gi.invited_by
     WHERE gi.invited_user_id=$1 AND gi.status='pending'
     ORDER BY gi.created_at DESC`,
    [safeId]
  );
  return rows;
};

export const getGroupInvites = async (groupId, requesterId) => {
  const safeGroupId = safeInt(groupId);
  const safeRequesterId = safeInt(requesterId);
  if (!safeGroupId || !safeRequesterId) throw new ApiError(400, 'Invalid ID');

  await getMember(safeGroupId, safeRequesterId);

  const { rows } = await pool.query(
    `SELECT gi.*, u.name AS invited_user_name, u.email AS invited_user_email
     FROM group_invites gi
     JOIN users u ON u.id = gi.invited_user_id
     WHERE gi.group_id=$1 AND gi.status='pending'
     ORDER BY gi.created_at DESC`,
    [safeGroupId]
  );
  return rows;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

export const getMember = async (groupId, userId) => {
  const safeGroupId = safeInt(groupId);
  const safeUserId = safeInt(userId);
  if (!safeGroupId || !safeUserId) throw new ApiError(400, 'Invalid group or user ID');

  const { rows } = await pool.query(
    'SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2',
    [safeGroupId, safeUserId]
  );
  if (!rows.length) throw new ApiError(403, 'Not a member of this group');
  return rows[0];
};