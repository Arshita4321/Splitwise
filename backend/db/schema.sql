-- ============================================
-- Splitwise-inspired App - Database Schema
-- ============================================

-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GROUPS
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GROUP MEMBERS (join table, role-based)
CREATE TABLE group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- EXPENSES
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by INTEGER NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(255) NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'general',
  split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('equal','unequal','percentage','shares')),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- EXPENSE SPLITS (who owes how much for each expense)
CREATE TABLE expense_splits (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount_owed NUMERIC(12,2) NOT NULL CHECK (amount_owed >= 0),
  -- raw input used to compute amount_owed (percentage value or share count)
  -- NULL for 'equal' and 'unequal' split types
  share_value NUMERIC(12,4),
  UNIQUE (expense_id, user_id)
);

-- PAYMENTS (settle up / record payment)
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by INTEGER NOT NULL REFERENCES users(id),
  paid_to INTEGER NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (paid_by <> paid_to)
);

-- MESSAGES (per-expense real-time chat)
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


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


-- ============================================
-- INDEXES for common lookups
-- ============================================
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_messages_expense ON messages(expense_id);

CREATE INDEX idx_group_invites_user   ON group_invites(invited_user_id);
CREATE INDEX idx_group_invites_group  ON group_invites(group_id);

-- ============================================================
-- NOTE: The base schema.sql already contains:
--   groups, group_members, expenses, expense_splits,
--   payments, messages — and all their indexes.
-- This file only adds what was missing (group_invites).
-- ============================================================
