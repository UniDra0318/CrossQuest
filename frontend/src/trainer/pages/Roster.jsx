import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { TablePagination, usePagination } from '../../components/TablePagination';
import { useTrainer } from '../TrainerContext';

export default function Roster({ sessionFilter, onNavigateTab }) {
  const { roster, setSelectedTraineeId, exportRosterCsv, handleAssignTeam, loading } = useTrainer();
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const availableScopes = Array.from(new Set((roster || []).map(r => r.scope).filter(Boolean)));
  const [savingTraineeId, setSavingTraineeId] = useState(null);
  const [toast, setToast] = useState(null);

  const onTeamChange = async (traineeId, newTeamName) => {
    setSavingTraineeId(traineeId);
    setToast(null);
    try {
      await handleAssignTeam(traineeId, newTeamName);
      setToast({
        type: 'success',
        text: newTeamName ? `Breakout group updated to "${newTeamName}" (persisted to server).` : 'Team assignment cleared.'
      });
    } catch (err) {
      setToast({
        type: 'error',
        text: err.message || 'Failed to update team on server. Previous team restored.'
      });
    } finally {
      setSavingTraineeId(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const filtered = roster.filter((t) => {
    if (sessionFilter && t.cohort !== sessionFilter && t.sessionId !== sessionFilter) {
      return false;
    }
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.cohort.toLowerCase().includes(search.toLowerCase()) ||
      t.scope.toLowerCase().includes(search.toLowerCase());
    const matchesScope = scopeFilter === 'ALL' || t.scope === scopeFilter;
    const normStatus = t.status || (t.state === 'CERTIFIED' ? 'Completed' : 'In progress');
    const matchesStatus = statusFilter === 'ALL' || normStatus === statusFilter || t.state === statusFilter;
    return matchesSearch && matchesScope && matchesStatus;
  });

  const {
    currentPage: rosterPage,
    setCurrentPage: setRosterPage,
    paginatedItems: pagedRoster,
    totalItems: totalRoster
  } = usePagination(filtered, 4);

  const handleGradeTrainee = (id) => {
    setSelectedTraineeId(id);
    if (onNavigateTab) {
      onNavigateTab('grade');
    }
  };

  const getTierChipClass = (tier) => {
    if (tier === 'Perfect Score') return 'adm-chip--orange';
    if (tier === 'High Distinction') return 'adm-chip--violet';
    if (tier === 'Pass with Merit') return 'adm-chip--blue';
    if (tier === 'Passing Baseline') return 'adm-chip--green';
    return 'adm-chip--amber';
  };

  if (loading && (!roster || roster.length === 0)) {
    return <div className="adm-state">Loading trainee roster...</div>;
  }

  return (
    <>
      {/* Toast Notification Banner (U-12 Error and Success Feedback) */}
      {toast && (
        <div style={{
          padding: '10px 16px',
          marginBottom: '12px',
          borderRadius: '8px',
          fontSize: '12.5px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          color: toast.type === 'error' ? '#ef4444' : '#22c55e',
          border: toast.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
          transition: 'all 0.2s ease'
        }}>
          <span>{toast.type === 'error' ? '⚠️ ' : '✅ '}{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="stf-bar">
        <div className="stf-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search trainee name, scope, or cohort ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="trn-filters">
          <div className="stf-select">
            <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
              <option value="ALL">All Client Scopes</option>
              {availableScopes.map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          </div>

          <div className="stf-select">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses (OI-01)</option>
              <option value="Completed">Completed</option>
              <option value="In progress">In progress</option>
              <option value="Not completed">Not completed</option>
            </select>
          </div>

          <button type="button" className="adm-btn adm-btn--light" onClick={exportRosterCsv}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="adm-panel stf-table">
        <div className="adm-panel__head">
          <h2>Enrolled Trainees ({filtered.length})</h2>
          <span className="adm-label">WATERS11 CIPHERTEXT BOUND ROSTER</span>
        </div>

        <div className="adm-scroll">
          <div className="adm-grid trn-rgrid adm-th">
            <div>TRAINEE</div>
            <div>CLIENT SCOPE</div>
            <div>SESSION &amp; TEAM</div>
            <div>ATTENDANCE &amp; SCORE</div>
            <div>COMPLETION STATUS</div>
            <div>ACTION</div>
          </div>

          {filtered.length === 0 ? (
            <TableEmptyBlock
              icon={Users}
              title="No Trainees Match Current Filters"
              subtitle="Adjust your search query, cohort, or certification state to view participants."
            />
          ) : (
            pagedRoster.map((t) => (
              <div key={t.id} className="adm-row adm-grid trn-rgrid">
                {/* 1. Trainee */}
                <div className="adm-person">
                  <div className="adm-av adm-av--sq" style={{ background: '#6a2bd9', color: '#fff' }}>
                    {t.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <strong>{t.name}</strong>
                    <span className="adm-mono">{t.id}</span>
                  </div>
                </div>

                {/* 2. Scope */}
                <div>
                  <span className="adm-org">{t.scope}</span>
                </div>

                {/* 3. Cohort & Team Building Group */}
                <div>
                  <span className="adm-mono"><strong>{t.cohort}</strong></span>
                  <div style={{ marginTop: '4px' }}>
                    <select
                      value={t.team || ''}
                      disabled={savingTraineeId === t.id}
                      onChange={(e) => onTeamChange(t.id, e.target.value)}
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        background: 'transparent',
                        color: t.team ? '#8b5cf6' : '#94a3b8',
                        fontWeight: 700,
                        cursor: savingTraineeId === t.id ? 'wait' : 'pointer',
                        opacity: savingTraineeId === t.id ? 0.6 : 1
                      }}
                      title="Assign team-building breakout group (U-12)"
                    >
                      <option value="">{savingTraineeId === t.id ? 'Syncing...' : 'Select Team'}</option>
                      <option value="Team Alpha">🚩 Team Alpha</option>
                      <option value="Team Bravo">🛡️ Team Bravo</option>
                      <option value="Team Charlie">⚡ Team Charlie</option>
                      <option value="Team Delta">🎯 Team Delta</option>
                    </select>
                  </div>
                </div>

                {/* 4. Attendance & Score (Admin-only per FR-10) */}
                <div className="trn-score">
                  <span className="adm-chip adm-chip--green" style={{ fontSize: '11px' }}>
                    {t.attendance || 'Present'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {t.score != null ? `Score: ${t.score}%` : 'Score: Admin Only'}
                  </span>
                </div>

                {/* 5. Official 3-Status Model (OI-01) */}
                <div className="trn-statuscell">
                  {(() => {
                    const st = t.status || (t.state === 'CERTIFIED' ? 'Completed' : 'In progress');
                    const chipCls = st === 'Completed' ? 'adm-chip--green' : st === 'Not completed' ? 'adm-chip--red' : 'adm-chip--amber';
                    return (
                      <span className={`adm-chip ${chipCls}`}>
                        {st}
                      </span>
                    );
                  })()}
                </div>

                {/* 6. Action */}
                <div>
                  <button
                    type="button"
                    className="adm-btn adm-btn-solid cq-btn--purple"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                    onClick={() => handleGradeTrainee(t.id)}
                  >
                    Review &amp; Sign-Off
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="trn-note" style={{ padding: '16px 28px', borderTop: '1px solid rgba(23, 16, 43, 0.08)' }}>
          🔒 Passing baseline is strictly 75.0%. Scores and CP-ABE ciphertext policy envelopes are verified and sealed server-side upon grade submission.
        </div>
      </div>
    </>
  );
}
