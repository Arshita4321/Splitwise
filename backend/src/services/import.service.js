// src/services/import.service.js
// ─────────────────────────────────────────────────────────────────────────────
// CSV Import — detects all anomalies, surfaces them, applies documented policy.
// Policy reference: SCOPE.md (anomaly log) and DECISIONS.md.
// ─────────────────────────────────────────────────────────────────────────────

import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

// ── Policy constants ──────────────────────────────────────────────────────────

const USD_TO_INR_RATE = 83.5;      // Fixed at import time. See DECISIONS.md §3.
const SETTLEMENT_KEYWORDS = [
  'settle', 'settlement', 'paid back', 'paying back',
  'returning money', 'reimburs', 'clearing dues', 'paying off',
];

const ACTION = {
  IMPORTED:  'imported',
  SKIPPED:   'skipped',
  CONVERTED: 'converted',
  PENDING:   'awaiting_approval',
};

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim())
    .map(line => {
      const fields = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (c === ',' && !inQ) {
          fields.push(cur.trim()); cur = '';
        } else cur += c;
      }
      fields.push(cur.trim());
      return fields;
    });
}

// ── Date normaliser ───────────────────────────────────────────────────────────

function parseDate(raw) {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return isNaN(new Date(s + 'T00:00:00')) ? null : s;
  }
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const iso = `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
    return isNaN(new Date(iso + 'T00:00:00')) ? null : iso;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().split('T')[0];
}

const key = s => (s || '').trim().toLowerCase();

// ── Main importer ─────────────────────────────────────────────────────────────

export const processImport = async (csvText, groupId, importedBy, filename = 'expenses_export.csv') => {
  const memberMap = await buildMemberMap(groupId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [sess] } = await client.query(
      `INSERT INTO import_sessions (group_id, imported_by, filename, status)
       VALUES ($1,$2,$3,'pending') RETURNING id`,
      [groupId, importedBy, filename]
    );
    const sid = sess.id;

    const rows = parseCSV(csvText);
    if (rows.length < 2) throw new ApiError(400, 'CSV has no data rows');

    const header = rows[0].map(h => key(h));
    const col = (...names) => {
      for (const n of names) { const i = header.indexOf(n); if (i !== -1) return i; }
      return -1;
    };
    const C = {
      date:     col('date','expense_date','when','on'),
      desc:     col('description','desc','what','item','expense','name'),
      amount:   col('amount','total','cost','inr amount','amount (inr)','amt'),
      currency: col('currency','curr','ccy'),
      paidBy:   col('paid by','paid_by','paidby','payer','who paid'),
      split:    col('split type','split_type','splittype','how split','split'),
      with:     col('split with','split_with','splitwith','members','participants','with'),
      category: col('category','cat','type','tag'),
    };

    const today = new Date().toISOString().split('T')[0];
    const counts = { total: rows.length - 1, imported: 0, skipped: 0, converted: 0, pending: 0 };
    const seenExact = new Map();
    const seenFuzzy = new Map();

    for (let ri = 1; ri < rows.length; ri++) {
      const row    = rows[ri];
      const rowNum = ri;
      const get    = i => (i >= 0 && i < row.length ? row[i] || '' : '').trim();

      const rawDate  = get(C.date);
      const rawDesc  = get(C.desc);
      const rawAmt   = get(C.amount);
      const rawCurr  = get(C.currency) || 'INR';
      const rawPayer = get(C.paidBy);
      const rawSplit = get(C.split) || 'equal';
      const rawWith  = get(C.with);
      const rawCat   = get(C.category) || 'general';
      const rawLine  = row.join(',');
      const rawJSON  = JSON.stringify({ date:rawDate, description:rawDesc, amount:rawAmt,
        currency:rawCurr, paid_by:rawPayer, split_type:rawSplit, split_with:rawWith, category:rawCat });

      const flags = [];
      let mustSkip = false, needsApproval = false;

      const flag = (type, desc, action) => {
        flags.push({ type, desc, action });
        if (action === ACTION.SKIPPED) mustSkip = true;
        if (action === ACTION.PENDING) needsApproval = true;
      };

      // ① Malformed row
      const maxC = Math.max(...Object.values(C).filter(v => v >= 0));
      if (row.length < maxC + 1) {
        flag('malformed_row',
          `Row has ${row.length} columns, expected at least ${maxC + 1}`,
          ACTION.SKIPPED);
      }

      // ② Missing required fields
      if (!rawDesc) flag('missing_required', 'Description is blank', ACTION.SKIPPED);
      if (!rawAmt)  flag('missing_required', 'Amount is blank',      ACTION.SKIPPED);

      if (mustSkip) {
        await saveFlags(client, sid, rowNum, rawLine, rawJSON, flags, null);
        counts.skipped++; continue;
      }

      // ③ Date parsing
      const parsedDate = parseDate(rawDate);
      if (!parsedDate) {
        flag('invalid_date',
          `Cannot parse date "${rawDate}" — defaulted to today (${today})`,
          ACTION.CONVERTED);
      }
      const expDate = parsedDate || today;

      // ④ Future date
      if (expDate > today) {
        flag('future_date', `Expense date ${expDate} is in the future`, ACTION.PENDING);
      }

      // ⑤ Amount
      const numAmt = parseFloat(rawAmt.replace(/[₹$£€,\s]/g, ''));
      if (isNaN(numAmt)) {
        flag('missing_required', `"${rawAmt}" is not a valid number`, ACTION.SKIPPED);
        await saveFlags(client, sid, rowNum, rawLine, rawJSON, flags, null);
        counts.skipped++; continue;
      }

      // ⑥ Zero
      if (numAmt === 0) {
        flag('zero_amount', 'Amount is zero — not a real expense', ACTION.SKIPPED);
        await saveFlags(client, sid, rowNum, rawLine, rawJSON, flags, null);
        counts.skipped++; continue;
      }

      // ⑦ Negative = refund
      let finalAmt = numAmt;
      let category = rawCat;
      if (numAmt < 0) {
        finalAmt = Math.abs(numAmt);
        category = 'refund';
        flag('negative_amount',
          `Negative amount (${numAmt}) treated as refund; imported as ₹${finalAmt}`,
          ACTION.CONVERTED);
      }

      // ⑧ Currency
      let origCurr = null, origAmt = null, fxRate = null;
      if (rawCurr.toUpperCase() === 'USD') {
        origCurr = 'USD'; origAmt = finalAmt; fxRate = USD_TO_INR_RATE;
        finalAmt = parseFloat((finalAmt * USD_TO_INR_RATE).toFixed(2));
        flag('usd_amount',
          `$${origAmt} USD → ₹${finalAmt} INR at rate ₹${fxRate}/USD`,
          ACTION.CONVERTED);
      } else if (rawCurr.toUpperCase() !== 'INR' && rawCurr !== '') {
        flag('unknown_currency', `Currency "${rawCurr}" unrecognised — treated as INR`, ACTION.CONVERTED);
      }
      finalAmt = parseFloat(finalAmt.toFixed(2));

      // ⑨ Settlement
      if (SETTLEMENT_KEYWORDS.some(kw => rawDesc.toLowerCase().includes(kw))) {
        flag('settlement_as_expense',
          `"${rawDesc}" looks like a payment/settlement, not a shared expense — needs review`,
          ACTION.PENDING);
      }

      // ⑩ Resolve payer
      const payerKey = key(rawPayer);
      const payer = memberMap[payerKey];
      if (!payer && rawPayer) {
        flag('unknown_member', `Payer "${rawPayer}" is not in this group`, ACTION.PENDING);
      }

      // ⑪ Membership date checks for payer
      if (payer) {
        const joined = payer.joined_at ? payer.joined_at.toISOString().split('T')[0] : null;
        const left   = payer.left_at   ? payer.left_at.toISOString().split('T')[0]   : null;
        if (joined && expDate < joined) {
          flag('member_before_join',
            `${rawPayer} joined on ${joined} but this expense is dated ${expDate}`,
            ACTION.PENDING);
        }
        if (left && expDate > left) {
          flag('member_not_active',
            `${rawPayer} left on ${left} but this expense is dated ${expDate}`,
            ACTION.PENDING);
        }
      }

      // ⑫ Split members
      let splitIds = [];
      if (rawWith) {
        for (const n of rawWith.split(/[;|+\/,]/).map(n => n.trim()).filter(Boolean)) {
          const m = memberMap[key(n)];
          if (!m) {
            flag('unknown_member', `Split member "${n}" not in group — excluded from split`, ACTION.CONVERTED);
            continue;
          }
          const left = m.left_at ? m.left_at.toISOString().split('T')[0] : null;
          if (left && expDate > left) {
            flag('member_not_active',
              `${n} left on ${left} before expense date ${expDate} — excluded from split`,
              ACTION.CONVERTED);
            continue;
          }
          splitIds.push(m.user_id);
        }
      }
      if (splitIds.length === 0) {
        splitIds = Object.values(memberMap)
          .filter(m => {
            const j = m.joined_at ? m.joined_at.toISOString().split('T')[0] : '0000-01-01';
            const l = m.left_at   ? m.left_at.toISOString().split('T')[0]   : '9999-12-31';
            return expDate >= j && expDate <= l;
          })
          .map(m => m.user_id);
        if (splitIds.length === 0) splitIds = Object.values(memberMap).map(m => m.user_id);
      }

      // ⑬ Exact duplicate
      const exactK = `${key(rawDesc)}|${finalAmt}|${expDate}|${payerKey}`;
      if (seenExact.has(exactK)) {
        flag('duplicate_exact',
          `Exact duplicate of row ${seenExact.get(exactK)} (same desc/amount/date/payer) — needs review`,
          ACTION.PENDING);
      } else {
        seenExact.set(exactK, rowNum);
      }

      // ⑭ Fuzzy duplicate (same desc+date+payer, different amount)
      const fuzzyK = `${key(rawDesc)}|${expDate}|${payerKey}`;
      if (seenFuzzy.has(fuzzyK) && !seenExact.has(exactK)) {
        const prior = seenFuzzy.get(fuzzyK);
        flag('duplicate_similar',
          `Similar to row ${prior.rowNum}: same description/date/payer but amounts differ ₹${prior.amount} vs ₹${finalAmt} — which is correct?`,
          ACTION.PENDING);
      } else if (!seenFuzzy.has(fuzzyK)) {
        seenFuzzy.set(fuzzyK, { rowNum, amount: finalAmt });
      }

      // ⑮ Normalise split type
      let splitType = 'equal';
      const sk = key(rawSplit);
      if (['equal','equally'].includes(sk)) splitType = 'equal';
      else if (['unequal','exact','fixed','custom'].includes(sk)) splitType = 'unequal';
      else if (['percentage','percent','%'].includes(sk)) splitType = 'percentage';
      else if (['shares','share','ratio','parts'].includes(sk)) splitType = 'shares';
      else if (rawSplit) {
        flag('unknown_split_type', `Split type "${rawSplit}" unknown — defaulted to equal`, ACTION.CONVERTED);
      }

      // ── Pending → store for user review ──────────────────────────
      if (needsApproval) {
        const fids = await saveFlags(client, sid, rowNum, rawLine, rawJSON, flags, null);
        await client.query(
          `INSERT INTO import_pending_rows (session_id, anomaly_id, row_number, raw_data, suggested_action)
           VALUES ($1,$2,$3,$4,'import')`,
          [sid, fids[0] ?? null, rowNum, rawJSON]
        );
        counts.pending++; continue;
      }
      if (mustSkip) {
        await saveFlags(client, sid, rowNum, rawLine, rawJSON, flags, null);
        counts.skipped++; continue;
      }

      // ── Insert expense ────────────────────────────────────────────
      const payerId = payer?.user_id ?? Object.values(memberMap)[0]?.user_id;
      const { rows: [exp] } = await client.query(
        `INSERT INTO expenses
           (group_id, paid_by, amount, description, category, split_type,
            expense_date, original_currency, original_amount, fx_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [groupId, payerId, finalAmt, rawDesc, category, splitType,
         expDate, origCurr, origAmt, fxRate]
      );
      const eid = exp.id;

      const base = Math.floor((finalAmt / splitIds.length) * 100) / 100;
      const rem  = parseFloat((finalAmt - base * splitIds.length).toFixed(2));
      for (let i = 0; i < splitIds.length; i++) {
        await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [eid, splitIds[i], i === 0 ? parseFloat((base + rem).toFixed(2)) : base]
        );
      }

      await saveFlags(client, sid, rowNum, rawLine, rawJSON, flags, eid);
      if (flags.length > 0) counts.converted++; else counts.imported++;
    }

    await client.query(
      `UPDATE import_sessions
       SET total_rows=$1, imported=$2, skipped=$3, pending_review=$4, status='complete'
       WHERE id=$5`,
      [counts.total, counts.imported + counts.converted, counts.skipped, counts.pending, sid]
    );
    await client.query('COMMIT');

    const { rows: anomalyRows } = await pool.query(
      `SELECT row_number, anomaly_type, description, action_taken, resolved, expense_id
       FROM import_anomalies WHERE session_id=$1 ORDER BY row_number, id`,
      [sid]
    );
    return { session_id: sid, ...counts, anomalies: anomalyRows };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

async function saveFlags(client, sid, rowNum, rawLine, rawJSON, flags, expenseId) {
  const ids = [];
  for (const f of flags) {
    const { rows: [r] } = await client.query(
      `INSERT INTO import_anomalies
         (session_id, row_number, raw_data, anomaly_type, description, action_taken, expense_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [sid, rowNum, rawLine, f.type, f.desc, f.action, expenseId]
    );
    ids.push(r.id);
  }
  return ids;
}

// ── Public helpers ────────────────────────────────────────────────────────────

export const buildMemberMap = async (groupId) => {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.name, gm.joined_at, gm.left_at
     FROM group_members gm JOIN users u ON u.id=gm.user_id
     WHERE gm.group_id=$1`,
    [groupId]
  );
  const map = {};
  for (const r of rows) {
    map[key(r.name)] = r;
    const first = key(r.name).split(/\s+/)[0];
    if (!map[first]) map[first] = r;
  }
  return map;
};

export const getImportSessions = async (groupId) => {
  const { rows } = await pool.query(
    `SELECT s.*, u.name AS imported_by_name
     FROM import_sessions s JOIN users u ON u.id=s.imported_by
     WHERE s.group_id=$1 ORDER BY s.created_at DESC`,
    [groupId]
  );
  return rows;
};

export const getImportReport = async (sessionId) => {
  const { rows } = await pool.query('SELECT * FROM import_sessions WHERE id=$1', [sessionId]);
  if (!rows.length) throw new ApiError(404, 'Import session not found');
  const { rows: anomalies } = await pool.query(
    'SELECT * FROM import_anomalies WHERE session_id=$1 ORDER BY row_number, id', [sessionId]
  );
  const { rows: pending } = await pool.query(
    `SELECT p.*, a.description AS anomaly_description, a.anomaly_type
     FROM import_pending_rows p LEFT JOIN import_anomalies a ON a.id=p.anomaly_id
     WHERE p.session_id=$1 ORDER BY p.row_number`, [sessionId]
  );
  return { session: rows[0], anomalies, pending };
};

export const resolvePendingRow = async (pendingRowId, action) => {
  const { rows } = await pool.query(
    `SELECT p.*, s.group_id FROM import_pending_rows p
     JOIN import_sessions s ON s.id=p.session_id WHERE p.id=$1`,
    [pendingRowId]
  );
  if (!rows.length) throw new ApiError(404, 'Pending row not found');
  const pending = rows[0];
  let expenseId = null;

  if (action === 'approve') {
    const data = typeof pending.raw_data === 'string' ? JSON.parse(pending.raw_data) : pending.raw_data;
    const memberMap = await buildMemberMap(pending.group_id);
    const payer = memberMap[key(data.paid_by)] ?? Object.values(memberMap)[0];
    const amount = Math.abs(parseFloat(data.amount));
    const expDate = parseDate(data.date) || new Date().toISOString().split('T')[0];
    const splitIds = Object.values(memberMap)
      .filter(m => {
        const j = m.joined_at ? m.joined_at.toISOString().split('T')[0] : '0000-01-01';
        const l = m.left_at   ? m.left_at.toISOString().split('T')[0]   : '9999-12-31';
        return expDate >= j && expDate <= l;
      })
      .map(m => m.user_id);
    const ids = splitIds.length > 0 ? splitIds : Object.values(memberMap).map(m => m.user_id);

    const { rows: [exp] } = await pool.query(
      `INSERT INTO expenses (group_id, paid_by, amount, description, category, split_type, expense_date)
       VALUES ($1,$2,$3,$4,$5,'equal',$6) RETURNING id`,
      [pending.group_id, payer.user_id, amount, data.description, data.category || 'general', expDate]
    );
    expenseId = exp.id;

    const base = Math.floor((amount / ids.length) * 100) / 100;
    const rem  = parseFloat((amount - base * ids.length).toFixed(2));
    for (let i = 0; i < ids.length; i++) {
      await pool.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [expenseId, ids[i], i === 0 ? parseFloat((base + rem).toFixed(2)) : base]
      );
    }
  }

  await pool.query(
    `UPDATE import_pending_rows SET user_action=$1, resolved_at=NOW(), expense_id=$2 WHERE id=$3`,
    [action, expenseId, pendingRowId]
  );
  if (pending.anomaly_id) {
    await pool.query(
      `UPDATE import_anomalies SET resolved=TRUE, resolution_note=$1, expense_id=$2 WHERE id=$3`,
      [`User chose: ${action}`, expenseId, pending.anomaly_id]
    );
  }
  return { action, expense_id: expenseId };
};