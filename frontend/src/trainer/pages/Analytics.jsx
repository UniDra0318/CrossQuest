import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTrainer } from '../TrainerContext';
import { TablePagination, usePagination } from '../../components/TablePagination';

export default function Analytics({ onNavigateTab }) {
  const { isDark } = useTheme();
  const { analytics, quizAttempts, selectedScope, setSelectedScope, setSelectedTraineeId, loading } = useTrainer();

  const orgPg = usePagination(analytics?.orgs || [], 6);
  const remPg = usePagination(analytics?.remediation || [], 6);
  const filteredAttempts = (quizAttempts || []).filter(a => selectedScope === 'ALL' || a.company_code === selectedScope);
  const attPg = usePagination(filteredAttempts, 6);

  if (loading && !analytics) {
    return <div className="adm-state">Loading cohort analytics...</div>;
  }

  const handleRemediate = (id) => {
    setSelectedTraineeId(id);
    if (onNavigateTab) {
      onNavigateTab('grade');
    }
  };

  return (
    <>
      {/* Scope Filter Controls */}
      <div className="stf-controls">
        <div className="stf-select">
          <select value={selectedScope} onChange={(e) => setSelectedScope(e.target.value)}>
            <option value="ALL">All Assigned Cohort Organizations</option>
            {(analytics?.orgs || []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.org} ({org.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="adm-tiles">
        <div className="adm-tile">
          <div>
            <span className="adm-label">ACTIVE TRAINEES</span>
            <div className="adm-tile__num">{analytics?.active ?? 0}</div>
            <span className="adm-mono">Scope: {selectedScope}</span>
          </div>
        </div>

        <div className="adm-tile">
          <div>
            <span className="adm-label">OVERALL PASS RATE</span>
            <div className="adm-tile__num">{analytics?.passRate ?? 0}%</div>
            <span className="adm-ok">Target: 80.0% Minimum</span>
          </div>
        </div>

        <div className="adm-tile">
          <div>
            <span className="adm-label">COHORT MEAN SCORE</span>
            <div className="adm-tile__num">{analytics?.mean != null ? `${analytics.mean}%` : '—'}</div>
            <span className="adm-mono">Pass Threshold: 75.0%</span>
          </div>
        </div>

        <div className="adm-tile">
          <div>
            <span className="adm-label">COMPLETION VELOCITY</span>
            <div className="adm-tile__num">{analytics?.velocity ?? '3m 48s'}</div>
            <span className="adm-mono">Per 5-Question Lab</span>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="trn-two">
        {/* Tier Distribution */}
        <div className="adm-panel trn-pad">
          <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
            <h2>Distinction Tier Distribution</h2>
            <span className="adm-label">BENCHMARK TIERS</span>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            {analytics?.tiers?.map((t) => {
              const total = analytics.active || 1;
              const pct = Math.round((t.count / total) * 100);
              return (
                <div key={t.tier} className="trn-bar">
                  <div>
                    <span>{t.tier}</span>
                    <small>{t.count} trainee(s)</small>
                  </div>
                  <div className="adm-progress">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <b>{pct}%</b>
                </div>
              );
            })}
          </div>
        </div>

        {/* Organization Pass Rates */}
        <div className="adm-panel trn-pad">
          <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
            <h2>Client Organization Progress</h2>
            <span className="adm-label">COHORT STATS</span>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '16px' }}>
            {orgPg.paginatedItems.map((org) => (
              <div key={org.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                  <span>{org.org} ({org.id})</span>
                  <span>{org.certified} / {org.enrolled} ({org.rate}%)</span>
                </div>
                <div className="adm-progress adm-progress--green" style={{ marginTop: '8px' }}>
                  <i style={{ width: `${org.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
          <TablePagination currentPage={orgPg.currentPage} totalItems={orgPg.totalItems} pageSize={6} itemName="cohorts" onPageChange={orgPg.setCurrentPage} />
        </div>

        {/* Interactive Challenge Format Benchmarks */}
        <div className="adm-panel trn-pad">
          <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
            <h2>Challenge Format Benchmarks</h2>
            <span className="adm-label">SAMPLE DATA · ACCURACY & TIMING</span>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            {analytics?.benchmarks?.map((b) => (
              <div key={b.format} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(23,16,43,.08)' }}>
                <div>
                  <strong>{b.format}</strong>
                  {b.secs && <div className="adm-mono">{b.secs}s average response</div>}
                </div>
                <div>
                  {b.correct != null ? (
                    <span className="adm-chip adm-chip--green">{b.correct}% accuracy</span>
                  ) : (
                    <span className="adm-chip adm-chip--amber">Manual Review</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remediation Queue */}
        <div className="adm-panel trn-pad">
          <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
            <h2>Remediation & Review Queue</h2>
            <span className="adm-chip adm-chip--red">
              {analytics?.remediation?.length || 0} TRAINEES
            </span>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            {!analytics?.remediation || analytics.remediation.length === 0 ? (
              <div className="adm-state" style={{ padding: '20px 0' }}>
                🎉 No trainees currently require remediation in this scope.
              </div>
            ) : (
              remPg.paginatedItems.map((r) => (
                <div key={r.id} className="trn-rem" style={{ padding: '12px 14px', borderRadius: '12px', background: isDark ? '#111827' : 'var(--cq-lav-2)', border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : 'none' }}>
                  <div>
                    <strong>{r.name}</strong>
                    <div className="adm-mono">{r.cohort} · Score: {r.score != null ? `${r.score}%` : 'Pending'}</div>
                  </div>
                  <button
                    type="button"
                    className="adm-btn adm-btn-solid cq-btn--purple"
                    style={{ fontSize: '12px', padding: '8px 12px', marginLeft: 'auto' }}
                    onClick={() => handleRemediate(r.id)}
                  >
                    Evaluate
                  </button>
                </div>
              ))
            )}
          </div>
          <TablePagination currentPage={remPg.currentPage} totalItems={remPg.totalItems} pageSize={6} itemName="trainees" onPageChange={remPg.setCurrentPage} />
        </div>
      </div>
      {/* Scored Quiz Attempts Table (Round 11) */}
      <div className="adm-panel trn-pad" style={{ marginTop: '20px' }}>
        <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
          <h2>Trainee Quiz Attempts &amp; Scores</h2>
          <span className="adm-chip adm-chip--purple">
            {filteredAttempts.length} SCORED ATTEMPTS
          </span>
        </div>

        <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
          {filteredAttempts.length === 0 ? (
            <div className="adm-state" style={{ padding: '20px 0' }}>
              No scored quiz attempts recorded yet for this scope.
            </div>
          ) : (
            attPg.paginatedItems.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: isDark ? '#111827' : 'var(--cq-lav-2)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
                }}
              >
                <div>
                  <strong>{att.trainee_name}</strong>
                  <span className="adm-mono" style={{ marginLeft: '8px', fontSize: '11.5px' }}>
                    {att.trainee_code || ''} · {att.company_name || att.company_code || ''}
                  </span>
                  <div className="adm-mono" style={{ marginTop: '3px' }}>
                    {att.quiz_title} ({att.course_name})
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`adm-chip ${att.passed ? 'adm-chip--green' : 'adm-chip--amber'}`}>
                    {att.score}% ({att.total_points} pts)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <TablePagination currentPage={attPg.currentPage} totalItems={attPg.totalItems} pageSize={6} itemName="quiz attempts" onPageChange={attPg.setCurrentPage} />
      </div>
    </>
  );
}
