// src/components/import/ImportHistoryPanel.jsx
import React, { useEffect, useState } from 'react';
import { getImportSessions, getImportReport } from '../../api/import.js';
import { resolvePendingRow } from '../../api/import.js';
import Spinner from '../ui/Spinner.jsx';
import { useToast } from '../../hooks/useToast.js';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_STYLE = {
  imported:          { color: 'var(--green)',  label: 'Imported' },
  converted:         { color: 'var(--accent)', label: 'Converted' },
  skipped:           { color: 'var(--red)',    label: 'Skipped' },
  awaiting_approval: { color: 'var(--amber)',  label: 'Needs Review' },
};

function SessionRow({ session, onResolved }) {
  const { toast } = useToast();
  const [open, setOpen]       = useState(false);
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState({});

  const loadReport = async () => {
    if (report) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const res = await getImportReport(session.id);
      setReport(res.data.data);
      setOpen(true);
    } catch {
      toast({ type: 'error', message: 'Failed to load report' });
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (row, action) => {
    setResolving(p => ({ ...p, [row.id]: true }));
    try {
      await resolvePendingRow(row.id, action);
      toast({ type: 'success', message: `Row ${row.row_number} ${action}d` });
      const res = await getImportReport(session.id);
      setReport(res.data.data);
      onResolved?.();
    } catch (e) {
      toast({ type: 'error', message: e.response?.data?.message || 'Failed' });
    } finally {
      setResolving(p => ({ ...p, [row.id]: false }));
    }
  };

  const statusColor = session.status === 'complete' ? 'var(--green)'
                    : session.status === 'failed'   ? 'var(--red)'
                    : 'var(--amber)';

  return (
    <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={loadReport}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', background: 'var(--surface)', textAlign: 'left',
        }}
      >
        {loading
          ? <Spinner size={14} />
          : (open ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} />
                  : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />)
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600 }}>{session.filename}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-2)' }}>
            by {session.imported_by_name} · {format(new Date(session.created_at), 'dd MMM yyyy, HH:mm')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', flexShrink: 0 }}>
          <span style={{ color: 'var(--green)' }}>✓ {session.imported}</span>
          <span style={{ color: 'var(--amber)' }}>⟳ {session.pending_review} pending</span>
          <span style={{ color: 'var(--red)' }}>✗ {session.skipped}</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, textTransform: 'uppercase' }}>
          {session.status}
        </span>
      </button>

      {open && report && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)', padding: '14px' }}>
          {/* Pending rows requiring approval */}
          {report.pending?.filter(r => !r.user_action).length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px' }}>
                ⚠ Rows needing your decision:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {report.pending.filter(r => !r.user_action).map(row => {
                  const data = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
                  return (
                    <div key={row.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--amber-dim)', background: 'var(--surface)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600 }}>
                          Row {row.row_number}: {data.description}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                          {data.paid_by} · {data.amount} {data.currency} · {data.date}
                        </p>
                        {row.anomaly_description && (
                          <p style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '3px' }}>
                            {row.anomaly_description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => resolve(row, 'approve')}
                        disabled={resolving[row.id]}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '3px',
                          padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 700,
                          background: 'var(--green-dim)', color: 'var(--green)',
                        }}
                      >
                        <Check size={11} /> Import
                      </button>
                      <button
                        onClick={() => resolve(row, 'reject')}
                        disabled={resolving[row.id]}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '3px',
                          padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 700,
                          background: 'var(--red-dim)', color: 'var(--red)',
                        }}
                      >
                        <X size={11} /> Skip
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full anomaly list */}
          {report.anomalies?.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                All anomalies ({report.anomalies.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '200px', overflowY: 'auto' }}>
                {report.anomalies.map((a, i) => {
                  const s = ACTION_STYLE[a.action_taken] || ACTION_STYLE.imported;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface)', fontSize: '11px',
                    }}>
                      <span style={{ color: s.color, fontWeight: 700, minWidth: '70px', flexShrink: 0 }}>
                        Row {a.row_number}
                      </span>
                      <span style={{ color: 'var(--text-2)', flex: 1 }}>{a.description}</span>
                      <span style={{ color: s.color, fontWeight: 700, flexShrink: 0 }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportHistoryPanel({ groupId, onResolved }) {
  const { toast }     = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!groupId) return;
    getImportSessions(groupId)
      .then(res => setSessions(res.data.data || []))
      .catch(() => toast({ type: 'error', message: 'Failed to load import history' }))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <Spinner size={20} />;
  if (!sessions.length) return (
    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>No imports yet.</p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {sessions.map(s => (
        <SessionRow key={s.id} session={s} onResolved={onResolved} />
      ))}
    </div>
  );
}