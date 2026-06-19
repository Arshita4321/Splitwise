# DECISIONS.md — Decision Log

Each significant architectural or product decision, the options considered, and the rationale for the choice made.

---

## §1 — How to handle duplicate expenses

**Question:** When two CSV rows have the same description, amount, date, and payer, which one (if either) gets imported?

**Options considered:**

| Option | Problem |
|--------|---------|
| Auto-import both | Corrupts balances — every duplicate doubles someone's debt |
| Auto-discard the second | Silently deletes data the user may have intentionally added |
| Flag for user approval | Adds friction, but is the only correct answer |

**Decision:** Flag as `awaiting_approval`. The user sees both rows and explicitly approves or rejects each one. This satisfies Meera's requirement ("I want to approve anything the app deletes or changes") and is the only option that doesn't silently corrupt data.

**Tradeoff:** If a file has 50 duplicates, the review panel gets long. Accepted — better than silent corruption.

---

## §2 — Negative amounts: error or refund?

**Question:** `expenses_export.csv` has a row with amount `-350`. Is this a data error or a refund/credit?

**Options considered:**

| Option | Problem |
|--------|---------|
| Treat as error, skip | Erases a real financial event (electricity company rebate, correction) |
| Treat as error, flag for approval | Correct but adds unnecessary friction if refunds are common |
| Import as positive with category='refund' | Preserves the money flow, visible to all, self-documenting |

**Decision:** Auto-convert to positive, set `category = 'refund'`, flag as `converted` in the anomaly report. The user sees what happened in the report without needing to take action.

**Rationale:** A refund is a legitimate financial event that affects balances. The converted flag means the user can audit it. The `refund` category makes it searchable and reportable.

---

## §3 — Currency conversion: fixed rate vs live rate

**Question:** Trip expenses are in USD. What rate to use for conversion to INR?

**Options considered:**

| Option | Problem |
|--------|---------|
| Live rate at import time | Import is not reproducible — same file imported twice gives different numbers |
| Live rate at expense date | Requires an external FX API with historical data; adds a dependency and failure mode |
| Fixed rate, documented | Less precise, but deterministic and auditable |

**Decision:** Fixed rate of ₹83.5/USD, hardcoded in `import.service.js` as `USD_TO_INR_RATE`, documented here and in SCOPE.md. The original amount and rate are stored on each expense row (`original_amount`, `fx_rate`, `original_currency`) so any flat-mate can verify the math.

**Rationale:** The trip happened in March 2024. The exact rate on those days was approximately ₹83–84. Using ₹83.5 is accurate to within 1%. The reproducibility guarantee (same CSV always imports the same numbers) is worth more than fractional precision on a shared dinner.

**Future improvement:** Add an optional `FX_API_KEY` env variable; if present, fetch the historical rate for the expense date.

---

## §4 — Settlement entries in the expense list

**Question:** Two rows in the CSV describe money being transferred back (Meera paying Aisha, Rohan settling with Priya). Should they be imported as expenses?

**Options considered:**

| Option | Problem |
|--------|---------|
| Import as expenses | Double-counts: the debt already exists in balances; adding it as an expense adds it a second time |
| Auto-skip | Meera's requirement violated — she didn't approve the deletion |
| Flag for user approval | Correct — user sees the row and decides |

**Decision:** Detect via keyword matching on description (`settle`, `pays back`, `paid back`, etc.) and flag as `awaiting_approval`. If the user approves, it's imported as an expense. If rejected, it's skipped. The user is also shown a note suggesting they use the "Record Payment" feature instead.

**Tradeoff:** Keyword matching can have false positives ("this settled my nerves" would match). The mitigation is that flagging for approval never silently acts — the user always has final say.

---

## §5 — Membership date enforcement

**Question:** Sam joined mid-April. The CSV has April expenses with `Meera` in the split list. How should membership dates affect split calculation?

**Options considered:**

| Option | Problem |
|--------|---------|
| Ignore membership dates entirely | Sam owes electricity bills from before he existed in the flat; Meera owes bills after she left |
| Hard-block: skip any expense where a listed member wasn't active | Silent data loss — the expense happened, only the split is wrong |
| Adjust split: exclude inactive members, recompute, flag as converted | Accurate splits, audit trail, no data loss |

**Decision:** For each expense, compute which listed members were active on `expense_date` (i.e., `joined_at <= expense_date <= left_at or no left_at`). Remove inactive members from the split list, recompute equal split over active members, flag as `member_not_active` → `converted`.

**Key implication for `left_at`:** The `group_members` table needed a new `left_at` column. When `removeMember` is called, instead of hard-deleting the row, we set `left_at = NOW()`. This preserves historical split data while correctly excluding them from future expenses.

---

## §6 — Unknown members in split list

**Question:** Row 25 has `Dev` as payer. Dev is not in the group. What happens?

**Options considered:**

| Option | Problem |
|--------|---------|
| Skip the row | Silently erases a real expense |
| Import with a fallback payer | Imports with wrong attribution — corrupts balances |
| Flag for user approval | Correct |

**Decision:** `awaiting_approval`. If approved, the first group admin is used as the fallback payer (documented in the review panel). The admin can then edit the expense after import to assign the correct payer.

---

## §7 — How to store the import anomaly report

**Question:** The assignment requires a machine-produced import report. Where does it live?

**Options considered:**

| Option | Problem |
|--------|---------|
| Return JSON from the API only, don't persist | User can't return to review pending rows later; Meera's approval workflow breaks |
| Write to a file on disk | Stateless servers don't have persistent disk; doesn't work on Railway/Render |
| Store in DB (`import_sessions` + `import_anomalies` tables) | Queryable, persistent, viewable via API, survives server restarts |

**Decision:** Three new relational tables: `import_sessions` (one per upload), `import_anomalies` (one per problem), `import_pending_rows` (rows awaiting explicit user decision). Each pending row stores the full parsed CSV row as JSONB so the approve/reject handler can re-run import logic without needing the original file.

---

## §8 — Split type normalisation

**Question:** The CSV's `Split Type` column has inconsistent values: `equal`, `equally`, `Equal`, `exact`, `fixed`, `%`, etc.

**Decision:** Map to the four canonical types (`equal`, `unequal`, `percentage`, `shares`) via a whitelist. Any unrecognised value defaults to `equal` and is flagged as `unknown_split_type` → `converted`. The user can see this in the anomaly report and manually edit the expense's split afterwards.

---

## §9 — The `removeMember` soft-delete pattern

**Question:** The existing `removeMember` in `group.service.js` hard-deletes the `group_members` row. This breaks membership date tracking (once deleted, we don't know when they left).

**Decision:** Change `removeMember` to set `left_at = NOW()` instead of deleting. Keep the row. The balance service already does a join to `group_members` — we add a `WHERE left_at IS NULL OR left_at > NOW()` clause where appropriate. Existing expense splits are unaffected because they reference `user_id` directly.

**Required code change:**

```js
// group.service.js — removeMember
// Before:
await pool.query('DELETE FROM group_members WHERE group_id=$1 AND user_id=$2', [groupId, targetUserId]);

// After:
await pool.query(
  'UPDATE group_members SET left_at=NOW() WHERE group_id=$1 AND user_id=$2',
  [groupId, targetUserId]
);
```

---

## §10 — The "one number per person" requirement (Aisha)

**Implemented:** The existing `getGroupBalances` endpoint already returns `simplified_debts` — the minimal set of transfers to settle all debts (greedy debt simplification algorithm). This is what Aisha wants: "Rohan pays Priya ₹X, Sam pays Aisha ₹Y — done."

**No change needed.** The `BalanceSummary` component already uses this data. No new code required.