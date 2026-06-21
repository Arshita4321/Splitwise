// src/components/import/ImportModal.jsx
import React, { useState, useRef, useCallback } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { uploadCSV, resolvePendingRow } from '../../api/import.js';
import { useToast } from '../../hooks/useToast.js';
import {
  Upload, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Check, X,
} from 'lucide-react';

// ── Anomaly type meta ─────────────────────────────────────────────────────────

const ANOMALY_META = {
  duplicate_exact:       { label: 'Exact Duplicate',       color: 'var(--red)',   icon: '🔁' },
  duplicate_similar:     { label: 'Similar Duplicate',     color: 'var(--amber)', icon: '🔀' },
  negative_amount:       { label: 'Negative Amount',       color: 'var(--amber)', icon: '➖' },
  zero_amount:           { label: 'Zero Amount',           color: 'var(--red)',   icon: '0️⃣' },
  settlement_as_expense: { label: 'Settlement Detected',   color: 'var(--amber)', icon: '💸' },
  usd_amount:            { label: 'USD Converted',         color: 'var(--accent)',icon: '💱' },
  unknown_member:        { label: 'Unknown Member',        color: 'var(--red)',   icon: '👤' },
  member_not_active:     { label: 'Member Not Active',     color: 'var(--amber)', icon: '🚪' },
  member_before_join:    { label: 'Before Member Joined',  color: 'var(--amber)', icon: '📅' },
  invalid_date:          { label: 'Invalid Date',          color: 'var(--amber)', icon: '📅' },
  missing_required:      { label: 'Missing Required',      color: 'var(--red)',   icon: '❌' },
  future_date:           { label: 'Future Date',           color: 'var(--amber)', icon: '⏰' },
  malformed_row:         { label: 'Malformed Row',         color: 'var(--red)',   icon: '⚠️' },
  unknown_currency:      { label: 'Unknown Currency',      color: 'var(--amber)', icon: '💰' },
  unknown_split_type:    { label: 'Unknown Split Type',    color: 'var(--amber)', icon: '✂️' },
};

const ACTION_BADGE = {
  imported:           { label: 'Imported',   bg: 'var(--green-dim)',  color: 'var(--green)'  },
  converted:          { label: 'Converted',  bg: 'var(--accent-dim)', color: 'var(--accent)' },
  skipped:            { label: 'Skipped',    bg: 'var(--red-dim)',    color: 'var(--red)'    },
  awaiting_approval:  { label: 'Needs Review', bg: 'var(--amber-dim)', color: 'var(--amber)' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBadge({ action }) {
  const meta = ACTION_BADGE[action] || ACTION_BADGE.imported;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: 700,
      background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: '14px 16px', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', background: 'var(--surface)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '24px', fontWeight: 800, color: color || 'var(--text-1)', fontFamily: 'var(--font-display)' }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{label}</p>
    </div>
  );
}

function AnomalyRow({ a }) {
  const [open, setOpen] = useState(false);
  const meta = ANOMALY_META[a.anomaly_type] || { label: a.anomaly_type, color: 'var(--text-2)', icon: '⚠️' };
  return (
    <div style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', background: 'var(--surface)', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '15px' }}>{meta.icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: meta.color, minWidth: '120px' }}>
          {meta.label}
        </span>
        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Row {a.row_number}: {a.description}
        </span>
        <ActionBadge action={a.action_taken} />
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
               : <ChevronDown size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>{a.description}</p>
        </div>
      )}
    </div>
  );
}

function PendingReviewPanel({ pending, sessionId, onResolved }) {
  const { toast } = useToast();
  const [resolving, setResolving] = useState({});

  if (!pending?.length) return null;

  const resolve = async (row, action) => {
    setResolving(p => ({ ...p, [row.id]: true }));
    try {
      await resolvePendingRow(row.id, action);
      toast({ type: 'success', message: `Row ${row.row_number} ${action}d` });
      onResolved();
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.message || 'Failed' });
    } finally {
      setResolving(p => ({ ...p, [row.id]: false }));
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)', marginBottom: '10px',
        display: 'flex', alignItems: 'center', gap: '6px' }}>
        <AlertTriangle size={14} /> {pending.length} row{pending.length !== 1 ? 's' : ''} need your review
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '12px' }}>
        These rows were flagged as potentially problematic. Review each one and approve or reject.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pending.map(row => {
          const data = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
          return (
            <div key={row.id} style={{
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--amber-dim)', background: 'var(--surface)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>
                    Row {row.row_number}: {data.description}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                    {data.paid_by} · {data.amount} {data.currency} · {data.date}
                  </p>
                  {row.anomaly_description && (
                    <p style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '6px' }}>
                      ⚠ {row.anomaly_description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => resolve(row, 'approve')}
                    disabled={resolving[row.id]}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600,
                      background: 'var(--green-dim)', color: 'var(--green)',
                      opacity: resolving[row.id] ? 0.6 : 1, cursor: resolving[row.id] ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Check size={12} /> Import
                  </button>
                  <button
                    onClick={() => resolve(row, 'reject')}
                    disabled={resolving[row.id]}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: 600,
                      background: 'var(--red-dim)', color: 'var(--red)',
                      opacity: resolving[row.id] ? 0.6 : 1, cursor: resolving[row.id] ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <X size={12} /> Skip
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportModal({ open, onClose, groupId, onImported }) {
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [stage, setStage] = useState('upload');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState([]);
  const [filter, setFilter] = useState('all');

  const reset = () => {
    setStage('upload');
    setProgress(0);
    setResult(null);
    setPending([]);
    setFilter('all');
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast({ type: 'error', message: 'Please upload a .csv file' });
      return;
    }

    setStage('uploading');
    setProgress(0);

    try {
      const res = await uploadCSV(groupId, file, setProgress);
      const data = res.data.data;

      setResult(data);
      setPending(data.anomalies?.filter(a => a.action_taken === 'awaiting_approval' && !a.resolved) || []);
      setStage('report');

      onImported?.();

      // Auto close if no pending reviews
      if (!data.pending || data.pending === 0) {
        setTimeout(() => {
          reset();
          onClose();
        }, 1800);
      }
    } catch (e) {
      console.error(e);
      toast({
        type: 'error',
        message: e.response?.data?.message || 'Import failed. Please check server logs.'
      });
      setStage('upload');
    }
  }, [groupId, onImported, onClose, toast]);

  const onDrop = e => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onFileInput = e => handleFile(e.target.files[0]);

  const filteredAnomalies = result?.anomalies?.filter(
    a => filter === 'all' || a.action_taken === filter
  ) || [];

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Import CSV" width="680px">
      {/* Upload Stage */}
      {stage === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--accent-dim)' : 'var(--surface)',
              transition: 'var(--transition)',
            }}
          >
            <Upload size={32} style={{ color: 'var(--accent)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
              Drop your CSV file here
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
              or click to browse · Max 5 MB · .csv only
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileInput} />

          <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              What the importer checks
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {[
                '✓ Duplicate expenses', '✓ Negative / zero amounts',
                '✓ USD → INR conversion', '✓ Settlement entries',
                '✓ Unknown members', '✓ Membership date conflicts',
                '✓ Invalid / future dates', '✓ Unknown split types',
              ].map(t => (
                <p key={t} style={{ fontSize: '12px', color: 'var(--text-2)' }}>{t}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Uploading Stage */}
      {stage === 'uploading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px 0' }}>
          <Spinner size={36} />
          <div style={{ width: '100%', maxWidth: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>Processing…</p>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>{progress}%</p>
            </div>
            <div style={{ height: '6px', borderRadius: 'var(--radius-pill)', background: 'var(--border)' }}>
              <div style={{
                height: '100%', borderRadius: 'var(--radius-pill)',
                background: 'var(--accent)', width: `${progress}%`, transition: 'width 200ms ease',
              }} />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Detecting anomalies in each row…</p>
        </div>
      )}

      {/* Report Stage */}
      {stage === 'report' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <StatCard label="Total Rows" value={result.total} />
            <StatCard label="Imported" value={result.imported + result.converted} color="var(--green)" />
            <StatCard label="Skipped" value={result.skipped} color="var(--red)" />
            <StatCard label="Need Review" value={result.pending} color="var(--amber)" />
          </div>

          {pending.length > 0 && (
            <PendingReviewPanel
              pending={pending}
              sessionId={result.session_id}
              onResolved={() => setPending([])}
            />
          )}

          {result.anomalies?.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Anomaly Report ({result.anomalies.length})
                </h3>
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  style={{
                    fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)',
                  }}
                >
                  <option value="all">All</option>
                  <option value="imported">Imported</option>
                  <option value="converted">Converted</option>
                  <option value="skipped">Skipped</option>
                  <option value="awaiting_approval">Needs Review</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '280px', overflowY: 'auto' }}>
                {filteredAnomalies.map((a, i) => (
                  <AnomalyRow key={i} a={a} />
                ))}
              </div>
            </div>
          )}

          {!result.anomalies?.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px',
              borderRadius: 'var(--radius-md)', background: 'var(--green-dim)' }}>
              <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--green)' }}>
                No anomalies found — all rows imported cleanly.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={reset}>Import Another</Button>
            <Button onClick={() => { reset(); onClose(); }}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}