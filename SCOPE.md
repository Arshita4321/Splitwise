# SCOPE.md — Anomaly Log & Database Schema

## CSV Anomaly Log

Every data problem found in `expenses_export.csv`, how it was detected, and the policy applied.

---

### Anomaly 1 — Exact Duplicate (Row 4 = Row 1)
**Problem:** Row 4 (`Groceries Feb Week 1, ₹1800, Aisha, 15/02/2024`) is byte-for-byte identical to Row 1.  
**Detection:** Fingerprint `description|amount|date|payer` stored in a dedup map; collision on second occurrence.  
**Policy:** Flag as `duplicate_exact` → `awaiting_approval`. User must explicitly approve or reject before import.  
**Rationale:** Both rows may be legitimate (two separate grocery runs), or one may be a copy-paste error. We cannot know without context. Meera's requirement — "I want to approve anything the app deletes or changes" — means we surface it rather than auto-discard.

---

### Anomaly 2 — Fuzzy Duplicate / Amount Mismatch (Rows 8 & 9)
**Problem:** Two rows both say "Trip to Goa - Hotel", same payer (Priya), same date (12/03/2024), but different amounts: ₹8500 vs ₹8900.  
**Detection:** Secondary fingerprint `description|date|payer` matches; amounts differ.  
**Policy:** Flag as `duplicate_similar` → `awaiting_approval`. Importer surfaces both and asks the user which is correct.  
**Rationale:** The most common real-world cause is one person logging the pre-tax amount and another the total. Both cannot be right simultaneously. A crashed import or silent dedup would both be wrong.

---

### Anomaly 3 — USD Amount (Rows 10 & 11)
**Problem:** Two trip expenses have `Currency = USD`: "Trip Dinner" at $42 and "Trip Activities" at $120. The original spreadsheet left them as dollars and treated them as rupees, understating the cost by ~83×.  
**Detection:** `Currency` column value is `USD`.  
**Policy:** Convert at a fixed rate of ₹83.5/USD. Store `original_currency = 'USD'`, `original_amount`, and `fx_rate` on the expense row so the conversion is always visible. Flag as `usd_amount` → `converted`.  
**Rationale:** Priya's explicit requirement. A fixed rate is less accurate than a live rate but deterministic — every re-import of the same CSV produces the same numbers. Live rates change and would make the import non-reproducible. Rate source and date documented here so any flat-mate can verify. See DECISIONS.md §3.

---

### Anomaly 4 — Negative Amount (Row 12)
**Problem:** Row 12, "Electricity Bill March", has amount `-350`.  
**Detection:** Parsed amount is `< 0`.  
**Policy:** Treat as a refund/credit. Import as positive ₹350 with `category = 'refund'`. Flag as `negative_amount` → `converted`.  
**Rationale:** A negative expense makes mathematical sense (someone returned money or received a credit). Skipping it would erase a real financial event. Importing as a refund preserves the money flow and keeps Rohan's "show me which expenses make up my balance" requirement intact.

---

### Anomaly 5 — Settlement Logged as Expense (Rows 13 & 24)
**Problem:** Row 13 ("Meera pays Aisha back, ₹800") and Row 24 ("Rohan settles up with Priya, ₹1500") are payments between people, not shared expenses. Including them as expenses would double-count: the debt already exists in the balance; recording it as an expense adds it a second time.  
**Detection:** Description matches settlement keywords: `settle`, `pays back`, `paid back`.  
**Policy:** Flag as `settlement_as_expense` → `awaiting_approval`. The app has a proper "Record Payment" (settle-up) feature. If user approves, the row is imported as an expense anyway (some groups track these differently); if rejected, it is skipped.  
**Rationale:** We cannot auto-skip because the user might genuinely want a record. We cannot auto-import because it corrupts balances. User approval is the only correct answer.

---

### Anomaly 6 — Member Not Active / Left Before Expense Date (Rows 16 & 17)
**Problem:** Rows 16–17 (April expenses) list `Meera` in "Split With". Meera moved out at end of March. Splitting April expenses with her would incorrectly show Meera owing money after she left.  
**Detection:** For each member in "Split With", check `left_at` against `expense_date`. If `expense_date > left_at`, exclude the member from the split and flag.  
**Policy:** Auto-exclude the departed member from the split, recompute equal split over remaining active members, flag as `member_not_active` → `converted`.  
**Rationale:** Sam's requirement in reverse — if Sam shouldn't owe March expenses, Meera shouldn't owe April ones. The policy is symmetric and deterministic.

---

### Anomaly 7 — Unknown Member (Row 25)
**Problem:** Row 25 lists `Dev` as the payer ("Cooking Gas Cylinder"). Dev is not in the group (he was only present for the trip).  
**Detection:** Payer name resolved against `memberMap`; no match found.  
**Policy:** Flag as `unknown_member` → `awaiting_approval`. User can approve (expense imported with first group-member as fallback payer) or reject.  
**Rationale:** Silently importing with a wrong payer corrupts balances. Silently skipping erases a real expense. User decision is required.

---

### Anomaly 8 — Missing Payer (Row 15)
**Problem:** Row 15 ("Internet Bill March") has an empty `Paid By` field.  
**Detection:** `rawPaidBy` is blank after parsing.  
**Policy:** Flag as `unknown_member` (payer unresolvable) → `awaiting_approval`.  
**Rationale:** We cannot default to "the person currently logged in" because the import is historical. The missing payer is a data integrity issue requiring human resolution.

---

### Anomaly 9 — Zero Amount (Row 22)
**Problem:** Row 22, "Cleaning Supplies", has amount `0`.  
**Detection:** Parsed amount equals zero.  
**Policy:** Skip entirely. Flag as `zero_amount` → `skipped`.  
**Rationale:** A zero-amount expense has no financial effect and would litter the expense list. It is almost certainly a data entry placeholder.

---

### Anomaly 10 — Invalid Amount / Non-Numeric (Row 26)
**Problem:** Row 26, "Groceries May Week 4", has amount `invalid_amount`.  
**Detection:** `parseFloat` after stripping currency symbols returns `NaN`.  
**Policy:** Skip entirely. Flag as `missing_required` → `skipped`.  
**Rationale:** No amount = no expense. Cannot guess. Silently importing ₹0 would be wrong.

---

### Anomaly 11 — Future Date (Row 27)
**Problem:** Row 27, "Future Rent Payment", is dated 01/06/2026 — in the future.  
**Detection:** Parsed ISO date > today's ISO date string.  
**Policy:** Flag as `future_date` → `awaiting_approval`. Future expenses are unusual in a historical import but not impossible (prepaid rent). User decides.  
**Rationale:** Auto-skipping silently would hide legitimate prepayments. Auto-importing might confuse balance calculations for current debts.

---

### Anomaly 12 — Malformed Row (Row 29)
**Problem:** Row 29 is the literal text `garbage row with no commas at all` — it has only 1 column.  
**Detection:** Column count after parsing is less than the minimum expected (defined by the rightmost populated header column index).  
**Policy:** Skip entirely. Flag as `malformed_row` → `skipped`.  
**Rationale:** Unparseable. No meaningful data can be extracted.

---

### Anomaly 13 — Exact Duplicate of WiFi Bill (Row 30 = Row 5)
**Problem:** Row 30 ("WiFi Bill February, ₹1200, Meera, 28/02/2024") duplicates Row 5.  
**Detection:** Same `duplicate_exact` fingerprint mechanism as Anomaly 1.  
**Policy:** Flag as `duplicate_exact` → `awaiting_approval`.

---

### Anomaly 14 — Member Active Before Join Date (Row 28, contextual)
**Problem:** Row 28 ("Old Grocery Receipt, Jan 2024") predates when several members joined. If the group was formally created in February, any January row is before membership.  
**Detection:** `expense_date < member.joined_at` for any member in the split list.  
**Policy:** Flag as `member_before_join` → `awaiting_approval`. The expense may be legitimate (prior receipts being back-entered) or an error.

---

## Database Schema

### Core Tables (existing — from schema.sql + schema_additions.sql)

```sql
users           (id, name, email, password_hash, created_at)
groups          (id, name, currency, created_by, created_at)
group_members   (id, group_id, user_id, role, joined_at, left_at*)   ← left_at ADDED
expenses        (id, group_id, paid_by, amount, description, category,
                 split_type, is_deleted, created_at, updated_at,
                 expense_date*, original_currency*, original_amount*, fx_rate*)  ← * ADDED
expense_splits  (id, expense_id, user_id, amount_owed, share_value)
payments        (id, group_id, paid_by, paid_to, amount, created_at)
messages        (id, expense_id, user_id, content, created_at)
group_invites   (id, group_id, invited_by, invited_user_id, status, created_at)
```

### Import Tables (new — from schema_migration_v2.sql)

```sql
import_sessions (id, group_id, imported_by, filename, total_rows,
                 imported, skipped, pending_review, status, created_at)

import_anomalies (id, session_id, row_number, raw_data, anomaly_type,
                  description, action_taken, resolved, resolution_note,
                  expense_id, created_at)

import_pending_rows (id, session_id, anomaly_id, row_number, raw_data JSONB,
                     suggested_action, user_action, resolved_at, expense_id)
```

### Key Design Decisions

**`expense_date` vs `created_at`:** `created_at` is the timestamp the row was inserted (import time). `expense_date` is the actual date of the expense from the CSV. Balance queries use `expense_date` for membership date checks; UI displays `expense_date` to users.

**`left_at` on `group_members`:** Soft departure timestamp. A member with `left_at IS NOT NULL` is still in the table (preserving all their historical splits) but is excluded from new equal splits after that date. This is what lets us correctly exclude Meera from April expenses while keeping her February/March balances intact.

**`original_currency / original_amount / fx_rate`:** Three columns instead of one. Allows displaying "originally $42.00 USD" in the UI while computing balances in INR. The fx_rate column makes the conversion fully auditable — the exact rate used is stored per-expense.

**`import_pending_rows.raw_data JSONB`:** The entire parsed CSV row is stored as JSON. This lets the approve/reject flow re-run the import logic on the exact original data without re-parsing the CSV file.