import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTrainer } from '../TrainerContext';
import { TablePagination, usePagination } from '../../components/TablePagination';

export default function Analytics({ onNavigateTab }) {
  const { isDark } = useTheme();
  const { analytics, quizAnalytics, loadQuizAnalytics, selectedScope, setSelectedScope, setSelectedTraineeId, loading } = useTrainer();

  useEffect(() => { loadQuizAnalytics?.(); }, [loadQuizAnalytics]);

  const orgPg = usePagination(analytics?.orgs || [], 6);
  const remPg = usePagination(analytics?.remediation || [], 6);
  const qzPg = usePagination(quizAnalytics?.by_course || [], 5);

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
            <span className="adm-label">QUIZ ATTEMPTS</span>
            <div className="adm-tile__num">{quizAnalytics?.total_attempts ?? 0}</div>
            <span className="adm-mono">
              {quizAnalytics?.total_attempts
                ? `Avg ${quizAnalytics.avg_score}% · ${quizAnalytics.pass_rate}% pass`
                : `${quizAnalytics?.approved_quizzes ?? 0} approved quizzes`}
            </span>
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

        {/* Real Quiz Performance by Course */}
        <div className="adm-panel trn-pad">
          <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
            <h2>Course Quiz Performance</h2>
            <span className="adm-label">LIVE QUIZ ATTEMPTS · BY COURSE</span>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            {(!quizAnalytics?.by_course || quizAnalytics.by_course.length === 0) ? (
              <div className="adm-state" style={{ padding: '20px 0' }}>
                No quiz attempts recorded in your course scope yet.
              </div>
            ) : (
              qzPg.paginatedItems.map((c) => (
                <div key={c.course_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(23,16,43,.08)' }}>
                  <div>
                    <strong>{c.course_name}</strong>
                    <div className="adm-mono">
                      {c.quizzes_count} quiz{c.quizzes_count === 1 ? '' : 'zes'} · {c.attempts_count} attempt{c.attempts_count === 1 ? '' : 's'} ({c.unique_trainees} trainee{c.unique_trainees === 1 ? '' : 's'})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {c.avg_score != null ? (
                      <span className={`adm-chip ${c.avg_score >= 80 ? 'adm-chip--green' : 'adm-chip--amber'}`}>
                        Avg {c.avg_score}% ({c.pass_rate}% pass)
                      </span>
                    ) : (
                      <span className="adm-chip adm-chip--blue">No attempts</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <TablePagination currentPage={qzPg.currentPage} totalItems={qzPg.totalItems} pageSize={5} itemName="courses" onPageChange={qzPg.setCurrentPage} />
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
    </>
  );
}
