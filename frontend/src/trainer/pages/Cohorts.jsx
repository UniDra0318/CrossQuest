import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Building2, CheckSquare, ArrowRight } from 'lucide-react';
import { useTrainer } from '../TrainerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { TablePagination } from '../../components/TablePagination';

const PAGE = 4;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD');
const ts = (d) => (d ? new Date(d).getTime() : 0);
const COLS = [
  { key: 'upcoming', title: 'Upcoming', hex: '#f59e0b', rgb: '245,158,11', empty: 'No upcoming sessions.',
    test: (s) => !s.trainer_signed_off && s.is_future_dated,
    sort: (a, b) => ts(a.start_date) - ts(b.start_date) },
  { key: 'awaiting', title: 'Awaiting Sign-Off', hex: '#0284c7', rgb: '2,132,199', empty: 'No pending sign-offs.',
    test: (s) => !s.trainer_signed_off && !s.is_future_dated,
    sort: (a, b) => (b.attendees_count || 0) - (a.attendees_count || 0) || ts(b.start_date) - ts(a.start_date) },
  { key: 'signed', title: 'Signed Off', hex: '#10b981', rgb: '16,185,129', empty: 'No signed-off sessions yet.',
    test: (s) => s.trainer_signed_off,
    sort: (a, b) => ts(b.trainer_sign_off_at || b.end_date) - ts(a.trainer_sign_off_at || a.end_date) },
];
const RESET = { upcoming: 1, awaiting: 1, signed: 1 };

export default function Cohorts() {
  const { sessions, loading, loadError, loadData } = useTrainer();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [client, setClient] = useState('ALL');
  const [pages, setPages] = useState(RESET);

  const clients = useMemo(() => [...new Set((sessions || []).flatMap((s) => s.client_names || []))].sort(), [sessions]);
  const scoped = useMemo(() => (sessions || []).filter((s) => client === 'ALL' || (s.client_names || []).includes(client)), [sessions, client]);
  const cols = useMemo(() => COLS.map((c) => ({ ...c, items: scoped.filter(c.test).sort(c.sort) })), [scoped]);
  const enrolled = scoped.reduce((n, s) => n + (s.attendees_count || 0), 0);

  if (loading && !(sessions || []).length) return <div className="adm-state">Loading assigned sessions...</div>;
  if (loadError && !(sessions || []).length) {
    return <div className="adm-state">{loadError} <button type="button" className="trn-link" onClick={() => loadData(true)}>Retry</button></div>;
  }

  const chip = (label, active, onClick) => (
    <button key={label} type="button" onClick={onClick} style={{
      cursor: 'pointer', borderRadius: 10, fontWeight: 700, fontSize: 12, padding: '6px 14px',
      background: active ? '#ea580c' : (isDark ? '#1e293b' : '#f1f5f9'), color: active ? '#fff' : (isDark ? '#cbd5e1' : '#475569'),
      border: active ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0') }}>{label}</button>
  );

  return (
    <>
      <div className="adm-tiles">
        {[['TOTAL SESSIONS', scoped.length, 'Filtered scope'], ['UPCOMING', cols[0].items.length, 'Not yet delivered'],
          ['AWAITING SIGN-OFF', cols[1].items.length, 'Needs your evaluation'], ['SIGNED OFF', cols[2].items.length, `${enrolled} trainees in scope`]]
          .map(([label, num, sub]) => (
            <div className="adm-tile" key={label}><div>
              <span className="adm-label">{label}</span><div className="adm-tile__num">{num}</div><span className="adm-mono">{sub}</span>
            </div></div>))}
      </div>

      <div className="adm-panel" style={{ padding: '20px 24px', marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <Building2 size={18} color="#ea580c" />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>CLIENT SCOPE:</span>
          {chip(`All Clients (${clients.length})`, client === 'ALL', () => { setClient('ALL'); setPages(RESET); })}
          {clients.map((c) => chip(c, client === c, () => { setClient(c); setPages(RESET); }))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22, alignItems: 'stretch' }}>
          {cols.map((c) => {
            const page = pages[c.key];
            return (
              <div key={c.key} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 22, display: 'flex', flexDirection: 'column', minHeight: 520,
                background: isDark ? 'linear-gradient(180deg,#131b2e 0%,#0d1322 100%)' : 'linear-gradient(180deg,#fff 0%,#f8fafc 100%)',
                border: `1px solid rgba(${c.rgb},0.3)` }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: c.hex }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: isDark ? '1px solid rgba(255,255,255,.06)' : '1px solid #f1f5f9' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{c.title}</h3>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: `rgba(${c.rgb},0.15)`, color: c.hex, border: `1px solid rgba(${c.rgb},0.35)` }}>{c.items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                  {c.items.length === 0 && <div className="adm-state" style={{ margin: 'auto' }}>{c.empty}</div>}
                  {c.items.slice((page - 1) * PAGE, page * PAGE).map((s) => (
                    <div key={s.id} onClick={() => navigate(`/trainer/sessions/${s.session_code || s.id}`)} title="Open roster and sign-off"
                      style={{ cursor: 'pointer', borderRadius: 16, padding: 16, background: isDark ? '#111827' : '#fff', border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `rgba(${c.rgb},0.15)`, color: c.hex, fontFamily: 'monospace' }}>{s.session_code}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'right' }}>{(s.client_names || []).join(', ') || 'No client'}</span>
                      </div>
                      <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>{s.course_name}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                        <span><Calendar size={13} /> {fmt(s.start_date)}{s.end_date ? ` - ${fmt(s.end_date)}` : ''}</span>
                        <span><MapPin size={13} /> {s.venue}</span>
                        <span><Users size={13} /> {s.attendees_count} enrolled{c.key === 'signed' ? ` · ${s.completed_count} certified` : ''}</span>
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, color: c.hex }}>
                        <span><CheckSquare size={12} /> {c.key === 'signed' ? `Signed off ${fmt(s.trainer_sign_off_at)}` : c.key === 'awaiting' ? 'Ready for evaluation' : 'Scheduled'}</span>
                        <span>{c.key === 'awaiting' ? 'Roster & Sign-off' : 'View Roster'} <ArrowRight size={11} /></span>
                      </div>
                    </div>
                  ))}
                </div>
                <TablePagination currentPage={page} totalItems={c.items.length} pageSize={PAGE} itemName="sessions"
                  onPageChange={(p) => setPages((prev) => ({ ...prev, [c.key]: p }))} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
