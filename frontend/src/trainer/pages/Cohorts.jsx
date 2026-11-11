import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { useTrainer } from '../TrainerContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Cohorts() {
  const { cohorts, loading, loadError, loadData } = useTrainer();
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const totalEnrolled = cohorts.reduce((acc, c) => acc + (c.enrolled || 0), 0);
  const totalCertified = cohorts.reduce((acc, c) => {
    const isSigned = Boolean(c.signed_off || c.signedOff || c.trainer_signed_off || c.status === 'COMPLETED' || c.status === 'Completed');
    return acc + (isSigned ? (c.certified || 0) : 0);
  }, 0);
  const avgOverall = cohorts.length
    ? Math.round((cohorts.reduce((acc, c) => acc + (c.avg || 0), 0) / cohorts.length) * 10) / 10
    : 0;

  if (loading && (!cohorts || cohorts.length === 0)) {
    return <div className="adm-state">Loading assigned cohorts catalog...</div>;
  }
  if (loadError && (!cohorts || cohorts.length === 0)) {
    return <div className="adm-state">{loadError} <button type="button" className="trn-link" onClick={() => loadData()}>Retry</button></div>;
  }

  return (
    <>
      {/* KPI Tiles */}
      <div className="adm-tiles">
        <div className="adm-tile">
          <div>
            <span className="adm-label">ACTIVE COHORTS</span>
            <div className="adm-tile__num">{cohorts.length}</div>
            <span className="adm-mono">Zero-Trust Curriculum</span>
          </div>
        </div>

        <div className="adm-tile">
          <div>
            <span className="adm-label">ENROLLED TRAINEES</span>
            <div className="adm-tile__num">{totalEnrolled}</div>
            <span className="adm-mono">Across 3 Client Organizations</span>
          </div>
        </div>

        <div className="adm-tile">
          <div>
            <span className="adm-label">OVERALL CERTIFIED</span>
            <div className="adm-tile__num">{totalCertified} <small>/ {totalEnrolled}</small></div>
            <span className="adm-ok">
              {totalEnrolled ? Math.round((totalCertified / totalEnrolled) * 100) : 0}% COMPLETION RATE
            </span>
          </div>
        </div>

        <div className="adm-tile">
          <div>
            <span className="adm-label">MEAN COHORT SCORE</span>
            <div className="adm-tile__num">{avgOverall}%</div>
            <span className="adm-mono">Passing Baseline: 75.0%</span>
          </div>
        </div>
      </div>

      {/* Cohort Cards */}
      <div className="trn-cards">
        {cohorts && cohorts.length > 0 ? (
          cohorts.map((cohort) => {
            const isSignedOff = Boolean(cohort.signed_off || cohort.signedOff || cohort.trainer_signed_off || cohort.status === 'COMPLETED' || cohort.status === 'Completed');
            const isFuture = !isSignedOff && cohort.schedule && new Date(cohort.schedule.split(' ')[0]) > new Date();
            const sessionStatus = isSignedOff ? 'Signed off' : isFuture ? 'Future' : 'Awaiting sign-off';
            const statusClass = isSignedOff ? 'adm-chip--green' : isFuture ? 'adm-chip--blue' : 'adm-chip--orange';
            const effectiveCertified = isSignedOff ? (cohort.certified || 0) : 0;
            const passPercent = cohort.enrolled ? Math.round((effectiveCertified / cohort.enrolled) * 100) : 0;

            return (
              <div
                key={cohort.id}
                className="trn-card"
                style={{
                  background: isDark ? '#111827' : '#ffffff',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)',
                  boxShadow: isDark ? '0 18px 36px rgba(0, 0, 0, 0.45)' : '0 18px 36px rgba(106,43,217,.14)',
                  color: isDark ? '#f8fafc' : '#0f172a'
                }}
              >
              <div className="trn-card__top">
                <span className="adm-chip adm-chip--green">{cohort.id}</span>
                <span className={`adm-chip ${statusClass}`}>{sessionStatus}</span>
              </div>

              <span className="adm-mono" style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>{cohort.org}</span>
              <h2 style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{cohort.course}</h2>

              <div className="trn-sched" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                <span>📅 {cohort.schedule}</span>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                  <span>Certification Progress</span>
                  {isSignedOff ? (
                    <span style={{ color: isDark ? '#34d399' : '#059669' }}>
                      {effectiveCertified} / {cohort.enrolled} ({passPercent}%)
                    </span>
                  ) : (
                    <span style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                      Pending Sign-off (0 / {cohort.enrolled})
                    </span>
                  )}
                </div>
                <div className={`adm-progress ${isSignedOff ? 'adm-progress--green' : 'adm-progress--amber'}`} style={{ marginTop: '8px' }}>
                  <i style={{ width: `${passPercent}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '13px' }}>
                <span className="adm-soft">Cohort Average:</span>
                <strong style={{ fontSize: '15px', color: isDark ? '#f8fafc' : '#0f172a' }}>{cohort.avg}%</strong>
              </div>

              <div className="trn-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="adm-btn adm-btn-solid cq-btn--purple"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/trainer/sessions/${cohort.id}`)}
                >
                  Inspect Session (Roster & Sign-off)
                </button>
              </div>
            </div>
          );
        })
        ) : (
          <TableEmptyBlock
            icon={Layers}
            title="No Assigned Cohorts Found"
            subtitle="No training cohorts are currently assigned to your lead instructor account."
          />
        )}
      </div>
    </>
  );
}
