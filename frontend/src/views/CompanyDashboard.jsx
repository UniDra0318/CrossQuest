import React from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  FileCheck, 
  Download,
  Calendar,
  Lock,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { INITIAL_TRAINING_RECORDS } from '../data/mockData';

export default function CompanyDashboard({ activeSubView }) {
  const { currentUser } = useAuth();
  const companyCode = currentUser.company_code || 'CORP_ALPHA';

  const companyRecords = INITIAL_TRAINING_RECORDS.filter(r => r.companyCode === companyCode);
  const completed = companyRecords.filter(r => r.status === 'completed').length;
  const avgScore = companyRecords.length > 0 
    ? (companyRecords.reduce((acc, r) => acc + (r.score || 0), 0) / companyRecords.length).toFixed(1)
    : '0.0';

  return (
    <div className="dashboard-content-layout">
      {/* 1. COMPANY OVERVIEW */}
      {(activeSubView === 'company_overview' || !activeSubView) && (
        <>
          <div className="view-title-header">
            <div>
              <h2>{currentUser.organization} — Compliance Portal</h2>
              <p className="text-secondary text-sm">
                Corporate training progress, audit verification, and data isolation oversight.
              </p>
            </div>
            <div className="flex-align gap-8">
              <span className="badge badge-green">Tenant Isolation: Verified</span>
              <span className="badge badge-purple">RLS: Active</span>
            </div>
          </div>

          <div className="metrics-summary-row">
            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Enrolled Workforce</span>
                <Users size={18} className="text-blue" />
              </div>
              <div className="tile-value">{companyRecords.length} Active</div>
              <div className="tile-sub">San Miguel Conglomerate Cohort</div>
            </div>

            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Compliance Completion</span>
                <CheckCircle2 size={18} className="text-emerald" />
              </div>
              <div className="tile-value text-emerald">
                {Math.round((completed / (companyRecords.length || 1)) * 100)}%
              </div>
              <div className="tile-sub">Mandatory ISO Training Modules</div>
            </div>

            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Cohort Average Score</span>
                <TrendingUp size={18} className="text-cyan" />
              </div>
              <div className="tile-value text-cyan">{avgScore}%</div>
              <div className="tile-sub">Demonstrated Competency</div>
            </div>

            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Multi-Tenant Separation</span>
                <ShieldCheck size={18} className="text-purple" />
              </div>
              <div className="tile-value text-purple">Cryptographic</div>
              <div className="tile-sub">Protected by CP-ABE & RLS</div>
            </div>
          </div>

          <div className="card section-card">
            <div className="card-header-bar">
              <h3 className="card-title">Employee Milestone Summary</h3>
            </div>
            <div className="table-responsive">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Course Title</th>
                    <th>Assessment Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companyRecords.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.traineeName}</strong></td>
                      <td>{r.courseName}</td>
                      <td><span className="text-emerald font-bold">{r.score}%</span></td>
                      <td>
                        <span className={`badge ${r.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. COMPANY TRAINEES */}
      {activeSubView === 'company_trainees' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Company Employee Records (Strictly Isolated)</h3>
              <p className="card-subtitle">
                Cross-client records from other client companies are cryptographically barred by CP-ABE.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => alert("Exporting company employee audit report...")}>
              <Download size={13} /> Export Report
            </button>
          </div>

          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Employee / Attendee</th>
                  <th>Course Name</th>
                  <th>Completion Date</th>
                  <th>Certified Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {companyRecords.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="trainee-info-cell">
                        <span className="trainee-main-name">{r.traineeName}</span>
                        <span className="trainee-email-text">{r.traineeEmail}</span>
                      </div>
                    </td>
                    <td>{r.courseName}</td>
                    <td>{r.completionDate || 'In Progress'}</td>
                    <td>
                      <span className="text-emerald font-bold">{r.score}%</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                        {r.status === 'completed' ? 'Certified' : 'In Training'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. AUDIT CERTIFICATE */}
      {activeSubView === 'audit_certificate' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Cryptographic Data Isolation Certificate</h3>
              <p className="card-subtitle">
                Audited proof of zero cross-client record contamination.
              </p>
            </div>
          </div>

          <div className="p-24">
            <div className="card notice-box mb-16">
              <ShieldCheck size={20} className="text-emerald" />
              <div>
                <strong>ISO/IEC 27001 & ISO/IEC 27701 Audit Guarantee</strong>
                <p className="text-xs text-secondary mt-2">
                  All training records for {currentUser.organization} are bound to the CP-ABE policy 
                  <code>(COMPANY:{companyCode})</code> and defended by PostgreSQL Row-Level Security.
                </p>
              </div>
            </div>

            <div className="tech-spec-item">
              <span className="spec-label">Assigned Organization Code</span>
              <code>{companyCode}</code>
            </div>
            <div className="tech-spec-item">
              <span className="spec-label">Audit Verification Hash</span>
              <code className="text-xs text-cyan">SHA256: 3c9b740...ef1a89b02</code>
            </div>
            <div className="tech-spec-item">
              <span className="spec-label">Certificate Authority</span>
              <span>Crossworks Training and Consulting Corp.</span>
            </div>
            <div className="tech-spec-item">
              <span className="spec-label">Audit Timestamp</span>
              <span>2026-10-03 18:00:00 UTC</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
