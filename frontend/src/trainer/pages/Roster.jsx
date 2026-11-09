import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { TablePagination, usePagination } from '../../components/TablePagination';
import { useTrainer } from '../TrainerContext';

export default function Roster({ onNavigateTab }) {
  const { roster, setSelectedTraineeId, exportRosterCsv, loading } = useTrainer();
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // U-12: Team Building Breakout Groups (In-memory session state; no participant data written to device localStorage per SEC-26 & CL-15)
  const [teamAssignments, setTeamAssignments] = useState({});

  const handleAssignTeam = (traineeId, teamName) => {
    setTeamAssignments(prev => ({
      ...prev,
      [traineeId]: teamName
    }));
  };

  const filtered = roster.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.cohort.toLowerCase().includes(search.toLowerCase()) ||
      t.scope.toLowerCase().includes(search.toLowerCase());
    const matchesScope = scopeFilter === 'ALL' || t.scope === scopeFilter;
    const matchesStatus = statusFilter === 'ALL' || t.state === statusFilter;
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
              <option value="CORP_ALPHA">CORP_ALPHA (San Miguel)</option>
              <option value="FINTECH_BETA">FINTECH_BETA (Maya)</option>
              <option value="RETAIL_GAMMA">RETAIL_GAMMA (Ayala)</option>
            </select>
          </div>

          <div className="stf-select">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All States</option>
              <option value="CERTIFIED">CERTIFIED</option>
              <option value="PENDING REVIEW">PENDING REVIEW</option>
              <option value="DRAFTING">DRAFTING</option>
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
            <div>COHORT</div>
            <div>SCORE & EVALUATION</div>
            <div>CERTIFICATION STATE</div>
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
                      value={teamAssignments[t.id] || t.team || 'Team Alpha'}
                      onChange={(e) => handleAssignTeam(t.id, e.target.value)}
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        background: 'transparent',
                        color: '#8b5cf6',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Assign team-building breakout group (U-12)"
                    >
                      <option value="Team Alpha">🚩 Team Alpha</option>
                      <option value="Team Bravo">🛡️ Team Bravo</option>
                      <option value="Team Charlie">⚡ Team Charlie</option>
                      <option value="Team Delta">🎯 Team Delta</option>
                    </select>
                  </div>
                </div>

                {/* 4. Score & Tier */}
                <div className="trn-score">
                  <span>{t.score != null ? `${t.score}%` : 'Pending'}</span>
                  <span className={`adm-chip ${getTierChipClass(t.tier)}`}>
                    {t.tier}
                  </span>
                </div>

                {/* 5. Status */}
                <div className="trn-statuscell">
                  <span
                    className={`adm-chip ${
                      t.state === 'CERTIFIED'
                        ? 'adm-chip--green'
                        : t.state === 'PENDING REVIEW'
                        ? 'adm-chip--red'
                        : 'adm-chip--amber'
                    }`}
                  >
                    {t.state}
                  </span>
                </div>

                {/* 6. Action */}
                <div>
                  <button
                    type="button"
                    className="adm-btn adm-btn-solid cq-btn--purple"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                    onClick={() => handleGradeTrainee(t.id)}
                  >
                    Grade & Certify
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
