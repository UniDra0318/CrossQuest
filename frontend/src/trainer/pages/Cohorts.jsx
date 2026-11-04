import React from 'react';
import { Layers } from 'lucide-react';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { useTrainer } from '../TrainerContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Cohorts({ onNavigateTab }) {
  const { cohorts, loading } = useTrainer();
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const totalEnrolled = cohorts.reduce((acc, c) => acc + (c.enrolled || 0), 0);
  const totalCertified = cohorts.reduce((acc, c) => acc + (c.certified || 0), 0);
  const avgOverall = cohorts.length
    ? Math.round((cohorts.reduce((acc, c) => acc + (c.avg || 0), 0) / cohorts.length) * 10) / 10
    : 0;

  if (loading && (!cohorts || cohorts.length === 0)) {
    return <div className="adm-state">Loading assigned cohorts catalog...</div>;
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
            const passPercent = cohort.enrolled ? Math.round((cohort.certified / cohort.enrolled) * 100) : 0;
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
                <span className="adm-chip adm-chip--solid">{cohort.status}</span>
              </div>

              <span className="adm-mono" style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>{cohort.org}</span>
              <h2 style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{cohort.course}</h2>

              <div className="trn-sched" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                <span>📅 {cohort.schedule}</span>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                  <span>Certification Progress</span>
                  <span>{cohort.certified} / {cohort.enrolled} ({passPercent}%)</span>
                </div>
                <div className="adm-progress adm-progress--green" style={{ marginTop: '8px' }}>
                  <i style={{ width: `${passPercent}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '13px' }}>
                <span className="adm-soft">Cohort Average:</span>
                <strong style={{ fontSize: '15px', color: isDark ? '#f8fafc' : '#0f172a' }}>{cohort.avg}%</strong>
              </div>

              <div className="trn-actions">
                <button
                  type="button"
                  className="adm-btn adm-btn--light"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--cq-line)'
                  }}
                  onClick={() => onNavigateTab && onNavigateTab('roster')}
                >
                  Inspect Roster
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-solid cq-btn--purple"
                  onClick={() => onNavigateTab && onNavigateTab('grade')}
                >
                  Grade Trainees
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
