-- ==========================================================================
-- schema_migration_v2.sql
-- Run AFTER schema.sql and schema_additions.sql
-- Adds: expense_date, FX fields, left_at, import tracking tables
-- ==========================================================================

-- 1. expense_date — the real date of the expense, separate from created_at
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Foreign-currency support
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS original_currency VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_amount   NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fx_rate           NUMERIC(12,6) DEFAULT NULL;

-- 3. Track when a member LEFT the group (membership periods for Sam's issue)
ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMP DEFAULT NULL;

-- 4. Import sessions — one per CSV upload
CREATE TABLE IF NOT EXISTS import_sessions (
  id             SERIAL PRIMARY KEY,
  group_id       INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  imported_by    INTEGER NOT NULL REFERENCES users(id),
  filename       VARCHAR(255) NOT NULL,
  total_rows     INTEGER NOT NULL DEFAULT 0,
  imported       INTEGER NOT NULL DEFAULT 0,
  skipped        INTEGER NOT NULL DEFAULT 0,
  pending_review INTEGER NOT NULL DEFAULT 0,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','complete','failed')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Import anomalies — one row per problem detected
CREATE TABLE IF NOT EXISTS import_anomalies (
  id            SERIAL PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number    INTEGER,
  raw_data      TEXT,
  anomaly_type  VARCHAR(60) NOT NULL,
  -- Types: duplicate_exact, duplicate_similar, negative_amount, zero_amount,
  --        settlement_as_expense, usd_amount, unknown_member, member_not_active,
  --        member_before_join, invalid_date, missing_required, split_type_mismatch,
  --        future_date, malformed_row, unknown_currency, unknown_split_type
  description   TEXT NOT NULL,
  action_taken  VARCHAR(30) NOT NULL
                CHECK (action_taken IN ('imported','skipped','converted','awaiting_approval')),
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_note TEXT DEFAULT NULL,
  expense_id    INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Pending rows — anomalies that need explicit user approval (Meera requirement)
CREATE TABLE IF NOT EXISTS import_pending_rows (
  id               SERIAL PRIMARY KEY,
  session_id       INTEGER NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  anomaly_id       INTEGER REFERENCES import_anomalies(id) ON DELETE SET NULL,
  row_number       INTEGER,
  raw_data         JSONB NOT NULL,
  suggested_action VARCHAR(30) NOT NULL DEFAULT 'import',
  user_action      VARCHAR(30) DEFAULT NULL,  -- 'approve' | 'reject'
  resolved_at      TIMESTAMP DEFAULT NULL,
  expense_id       INTEGER REFERENCES expenses(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_anomalies_session  ON import_anomalies(session_id);
CREATE INDEX IF NOT EXISTS idx_import_pending_session    ON import_pending_rows(session_id);
CREATE INDEX IF NOT EXISTS idx_import_pending_unresolved ON import_pending_rows(session_id)
  WHERE user_action IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_date             ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_group_members_left        ON group_members(group_id)
  WHERE left_at IS NOT NULL;

-- ==========================================================================
-- Documented policies (see SCOPE.md for full anomaly log)
--
-- negative_amount   → treat as refund, import as positive with category='refund'
-- zero_amount       → skip (not a real expense)
-- usd_amount        → convert at ₹83.5/USD, store original_currency/original_amount
-- settlement        → flag for user approval (Meera's requirement)
-- duplicate_exact   → flag for user approval (Meera's requirement)
-- duplicate_similar → flag for user approval (Meera's requirement)
-- unknown_member    → flag for user approval
-- member_not_active → flag for user approval (Sam's requirement)
-- member_before_join→ flag for user approval
-- malformed_row     → skip
-- missing_required  → skip
-- invalid_date      → default to today, import with converted flag
-- future_date       → flag for user approval
-- unknown_split_type→ default to equal, import with converted flag
-- ==========================================================================