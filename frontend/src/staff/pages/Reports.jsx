import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, BarChart3, Users, Award } from 'lucide-react';
import { useStaff } from '../StaffContext';
import { getReport, exportReportPdf } from '../../api/staff';

export default function Reports() {
  const { me, portfolios } = useStaff();
  const [selectedScope, setSelectedScope] = useState('CORP_ALPHA');
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingReport(true);
      try {
        const data = await getReport(selectedScope);
        setReport(data);
      } catch (err) {
        console.warn("Could not load report for scope:", selectedScope, err);
      } finally {
        setLoadingReport(false);
      }
    }
    load();
  }, [selectedScope]);

  return (
    <div>
      {/* 1. CONTROLS BAR */}
      <div className="stf-controls">
        <div className="stf-select">
          <label htmlFor="scope-select" className="adm-label" style={{ margin: 0, paddingRight: '4px' }}>
            PORTFOLIO:
          </label>
          <select
            id="scope-select"
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
          >
            {(portfolios || []).map((p) => (
              <option key={p.scope} value={p.scope}>
                {p.name} ({p.scope})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="adm-btn adm-btn--light"
          onClick={exportReportPdf}
          title="Print or export report to PDF"
          style={{ marginLeft: 'auto' }}
        >
          <Download size={14} />
          <span>Export PDF Summary</span>
        </button>
      </div>

      {/* 2. STATS KPI TILES */}
      {report && (
        <>
          <div className="adm-tiles" style={{ marginTop: '20px' }}>
            <div className="stf-stat">
              <span className="adm-label">TOTAL ENROLLED LEARNERS</span>
              <div className="stf-stat__num">{report.totalTrainees}</div>
              <div className="adm-avatars">
                <span style={{ background: '#ff7a1a' }} />
                <span style={{ background: '#6a2bd9' }} />
                <span style={{ background: '#087a54' }} />
              </div>
              <p>Active trainees tracked under {report.org}</p>
            </div>

            <div className="stf-stat">
              <span className="adm-label">PROGRAM COMPLETION RATE</span>
              <div className="stf-stat__num" style={{ color: '#08613f' }}>
                {report.completionRate}%
              </div>
              <div className="adm-progress adm-progress--green">
                <i style={{ width: `${report.completionRate}%` }} />
              </div>
              <p>{report.rows?.length || 0} learners verified completed</p>
            </div>

            <div className="stf-stat">
              <span className="adm-label">AVERAGE COHORT SCORE</span>
              <div className="stf-stat__num" style={{ color: '#4b1ca3' }}>
                {report.averageScore != null ? `${report.averageScore}%` : 'N/A'}
              </div>
              <div className="adm-progress adm-progress--purple">
                <i style={{ width: `${report.averageScore || 90}%` }} />
              </div>
              <p>Average accuracy across evaluated assessment modules</p>
            </div>
          </div>

          {/* 3. PERFORMANCE BREAKDOWN TABLE */}
          <div className="adm-panel" style={{ marginTop: '28px' }}>
            <div className="adm-panel__head">
              <div>
                <h2>Verified Trainee Completion Breakdown</h2>
                <span className="adm-mono">{report.org} ({report.scope})</span>
              </div>
              <span className="adm-chip adm-chip--green">
                <CheckCircle2 size={12} /> ALL SIGNATURES VERIFIED
              </span>
            </div>

            <div className="adm-scroll">
              <div className="adm-table" style={{ marginTop: 0 }}>
                {/* Header */}
                <div className="adm-grid stf-rgrid adm-th">
                  <div>TRAINEE</div>
                  <div>COURSE PROGRAM</div>
                  <div>COMPLETION STATUS</div>
                  <div>EVALUATION ACCURACY</div>
                </div>

                {/* Rows */}
                {(report.rows || []).map((row) => (
                  <div key={row.id} className="adm-row adm-grid stf-rgrid" style={{ alignItems: 'center' }}>
                    <div className="adm-person">
                      <div className="adm-av" style={{ background: '#ff7a1a', color: '#fff', width: '34px', height: '34px' }}>
                        {row.trainee.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong>{row.trainee}</strong>
                        <span className="adm-mono">ID: {row.id}</span>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                      {row.course}
                    </div>

                    <div>
                      <span className="adm-chip adm-chip--green">
                        {row.status}
                      </span>
                    </div>

                    <div>
                      <div className="stf-score">
                        <div className="adm-progress adm-progress--purple">
                          <i style={{ width: `${row.score || 90}%` }} />
                        </div>
                        <b>{row.score != null ? `${row.score}%` : 'Passed'}</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
