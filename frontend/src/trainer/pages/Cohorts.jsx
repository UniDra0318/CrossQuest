import React from 'react';
import { useTrainer } from '../TrainerContext';

export default function Cohorts({ onNavigateTab }) {
  const { cohorts, loading } = useTrainer();

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
        {cohorts.map((cohort) => {
          const passPercent = cohort.enrolled ? Math.round((cohort.certified / cohort.enrolled) * 100) : 0;
          return (
            <div key={cohort.id} className="trn-card">
              <div className="trn-card__top">
                <span className="adm-chip adm-chip--green">{cohort.id}</span>
                <span className="adm-chip adm-chip--solid">{cohort.status}</span>
              </div>

              <span className="adm-mono">{cohort.org}</span>
              <h2>{cohort.course}</h2>

              <div className="trn-sched">
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
                <strong style={{ fontSize: '15px' }}>{cohort.avg}%</strong>
              </div>

              <div className="trn-actions">
                <button
                  type="button"
                  className="adm-btn adm-btn--light"
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
        })}
      </div>
    </>
  );
}
