-- ============================================================
-- ADDITIONS to existing schema.sql  (run AFTER base schema)
-- Covers: group invites, expense splits, payments, messages
-- ============================================================

-- GROUP INVITES
-- Allows inviting users by email; they can accept or decline
CREATE TABLE group_invites (
  id         SERIAL PRIMARY KEY,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  invited_user_id INTEGER NOT NULL REFERENCES users(id),
  status     VARCHAR(10) NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, invited_user_id)          -- one pending invite per user per group
);

CREATE INDEX idx_group_invites_user   ON group_invites(invited_user_id);
CREATE INDEX idx_group_invites_group  ON group_invites(group_id);

-- ============================================================
-- NOTE: The base schema.sql already contains:
--   groups, group_members, expenses, expense_splits,
--   payments, messages — and all their indexes.
-- This file only adds what was missing (group_invites).
-- ============================================================