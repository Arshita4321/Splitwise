# AI_USAGE.md — AI Tool Usage Log

## Tool Used

**Claude (Anthropic)** — used as primary development collaborator throughout this project.

---

## Role of AI in This Project

Claude was used for:
- Scaffolding boilerplate (routes, controllers, validators) from the existing codebase pattern
- Suggesting the `import_pending_rows.raw_data JSONB` approach for deferring approval
- Writing first drafts of complex SQL (the membership date filter query)
- Drafting documentation structure
- Rubber-ducking edge cases ("what if a member appears in split_with but has already left?")

Every file was reviewed, tested, and edited before being committed. The anomaly detection logic, policy decisions, and data model design are my own.

---

## Key Prompts Used

### Prompt 1 — Core import service
```
Build a Node.js ES module service (import.service.js) that:
- Parses a CSV with flexible column headers (date, description, amount, currency, paid_by, split_type, split_with, category)
- Detects these anomalies: duplicate_exact, duplicate_similar, negative_amount, zero_amount, settlement_as_expense, usd_amount (convert at 83.5), unknown_member, member_not_active, member_before_join, invalid_date, missing_required, future_date, malformed_row
- For each anomaly: stores it in DB with action (imported/skipped/converted/awaiting_approval)
- Rows with awaiting_approval go to a pending table, not directly imported
- Uses PostgreSQL via existing pool from ../config/db.js
- Returns a report object with counts and anomaly list
```

### Prompt 2 — Frontend import UI
```
Build a React component ImportModal.jsx (dark theme, CSS variables --bg, --surface, --accent, --border etc) that:
- Has three stages: upload (drag-drop), uploading (progress bar), report (stats + anomaly list)
- Shows a stat card row: total / imported / skipped / needs review
- Shows collapsible anomaly rows with type badge and action badge
- Shows a pending review panel for awaiting_approval rows with approve/reject buttons
- Calls uploadCSV(groupId, file, onProgress) and resolvePendingRow(id, action) from api/import.js
```

### Prompt 3 — Schema migration
```
Write a PostgreSQL migration SQL file that adds to an existing schema:
1. expense_date DATE NOT NULL DEFAULT CURRENT_DATE to expenses
2. original_currency VARCHAR(10), original_amount NUMERIC(12,2), fx_rate NUMERIC(12,6) to expenses
3. left_at TIMESTAMP DEFAULT NULL to group_members
4. import_sessions table
5. import_anomalies table (with anomaly_type, action_taken CHECK constraint)
6. import_pending_rows table with raw_data JSONB
Use IF NOT EXISTS throughout. Add indexes for common queries.
```

### Prompt 4 — Anomaly CSV design
```
Create a CSV file expenses_export.csv that contains 30 rows and deliberately includes these 12+ problems:
exact duplicate, fuzzy duplicate (same description different amounts), USD amounts, negative amount, settlement entry, unknown member, missing payer, zero amount, invalid amount string, future date, malformed row, member appearing after they left. Use realistic Indian flat-sharing context (Aisha, Rohan, Priya, Meera, Sam). Dates span Feb–May 2024.
```

---

## Three Cases Where AI Was Wrong

### Case 1 — Duplicate detection missed the fuzzy case

**What AI produced:**  
The first draft of `processImport` only checked for exact duplicates (same description + amount + date + payer). It did not check the fuzzy case (same description + date + payer, different amounts — the "Goa Hotel" problem in our CSV).

**How I caught it:**  
I manually traced through the CSV and noticed rows 8 and 9 ("Trip to Goa - Hotel" at ₹8500 and ₹8900) would both be imported silently without any flag, even though having two hotel bookings for the same trip on the same day by the same person with different amounts is almost certainly a data error.

**What I changed:**  
Added a second dedup map `seenFuzzy` keyed on `description|date|payer` (without amount). When a row matches this key but not the exact key, it's flagged as `duplicate_similar` → `awaiting_approval` with a message that tells the user both amounts.

---

### Case 2 — `resolvePendingRow` re-parsed date incorrectly

**What AI produced:**  
In the initial `resolvePendingRow` function, when approving a pending row, the AI wrote:

```js
const expDate = data.date || new Date().toISOString().split('T')[0];
```

This skipped calling `parseDate()` on the stored date string. Since `data.date` comes from the raw CSV field (e.g., `"15/03/2024"`), it would be stored as-is in the JSONB column and then passed directly to PostgreSQL as the `expense_date`. PostgreSQL would reject `"15/03/2024"` as an invalid date (it expects `YYYY-MM-DD`).

**How I caught it:**  
I tested approving a pending row in the UI. The API returned a PostgreSQL `invalid_input_syntax for type date` error. I traced it to `resolvePendingRow` and found the missing `parseDate()` call.

**What I changed:**  
```js
// Wrong (AI-generated):
const expDate = data.date || today;

// Fixed:
const expDate = parseDate(data.date) || today;
```

`parseDate` normalises the string to ISO format before it reaches the DB.

---

### Case 3 — Balance service excluded departed members from historical balances

**What AI produced:**  
When I asked Claude to update `getGroupBalances` to respect `left_at`, it suggested adding `AND gm.left_at IS NULL` to the `GROUP BY group_members` query:

```sql
SELECT u.id, u.name, u.email, gm.role, gm.joined_at
FROM group_members gm JOIN users u ON u.id=gm.user_id
WHERE gm.group_id=$1 AND gm.left_at IS NULL   -- AI added this
```

**Why this is wrong:**  
This would exclude Meera from the balance calculation entirely — even for the February and March expenses she legitimately owes money on. The balance view should include all historical members (so we can show Meera still owes ₹X from before she left), while only excluding them from *future* equal splits.

**How I caught it:**  
I noticed that after Meera's departure, the group balance page no longer showed her name at all. Rohan and Aisha were showing inflated balances because Meera's share was being distributed to active members in the balance calculation.

**What I changed:**  
Removed the `AND gm.left_at IS NULL` from `getGroupBalances`. The balance service should always include all members who ever had expense splits in the group. The `left_at` filter only applies in the importer (when deciding who to split *new* imported expenses with) — not in the balance query.

---

## General Observations

Claude was reliable for boilerplate (route/controller/validator pattern) and good at suggesting the right SQL structure. It struggled with:

1. **Business logic nuance** — it often produced technically correct code that was wrong for this specific domain (Case 3 above is the clearest example).
2. **Edge case chaining** — individual anomaly detectors were correct; the interaction between them (e.g., a row that is both a USD amount AND a duplicate) needed manual review.
3. **Test-driven confidence** — Claude never said "you should test this". Every bug in Cases 1–3 was found by manually running the feature, not by the AI flagging its own uncertainty.

**Rule I applied:** Every function AI generated was manually traced with the actual CSV data before being committed. If I couldn't explain what each line does, I rewrote it.