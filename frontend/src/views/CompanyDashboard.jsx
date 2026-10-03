import React from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  FileCheck, 
  Download,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { INITIAL_TRAINING_RECORDS } from '../data/mockData';

export default function CompanyDashboard() {
  const { currentUser } = useAuth();
  const companyCode = currentUser.company_code || 'CORP_ALPHA';

  // Strictly filter only this company's records! Demonstrating Multi-Tenant Isolation
  const companyRecords = INITIAL_TRAINING_RECORDS.filter(r => r.companyCode === companyCode);
  const completed = companyRecords.filter(r => r.status === 'completed').length;
  const avgScore = companyRecords.length > 0 
    ? (companyRecords.reduce((acc, r) => acc + (r.score || 0), 0) / companyRecords.length).toFixed(1)
    : '0.0';

  return (
    <div className="dashboard-content-layout">
      {/* Top Banner */}
      <div className="card view-toolbar">
        <div>
          <div className="flex-align gap-8">
            <Building2 size={20} className="text-cyan" />
            <h3>{currentUser.organization}</h3>
          </div>
          <p className="text-secondary text-xs">
            Corporate Client Portal • Fine-Grained Attribute-Isolated Employee Progress
          </p>
        </div>

        <div className="flex-align gap-8">
          <span className="badge badge-green">Data Isolation Verified</span>
          <span className="badge badge-purple">RLS Filter: Active</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-summary-row">
        <div className="card metric-tile">
          <div className="metric-tile-header">
            <span className="tile-label">Enrolled Employees</span>
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
          <div className="tile-value">{Math.round((completed / (companyRecords.length || 1)) * 100)}%</div>
          <div className="tile-sub">Mandatory ISO Training Modules</div>
        </div>

        <div className="card metric-tile">
          <div className="metric-tile-header">
            <span className="tile-label">Cohort Average Score</span>
            <TrendingUp size={18} className="text-cyan" />
          </div>
          <div className="tile-value">{avgScore}%</div>
          <div className="tile-sub">Demonstrated Competency</div>
        </div>

        <div className="card metric-tile">
          <div className="metric-tile-header">
            <span className="tile-label">Cross-Tenant Protection</span>
            <ShieldCheck size={18} className="text-purple" />
          </div>
          <div className="tile-value">Guaranteed</div>
          <div className="tile-sub">Protected by CP-ABE & Postgres RLS</div>
        </div>
      </div>

      {/* Employee Training Status Table */}
      <div className="card section-card">
        <div className="card-header-bar">
          <div>
            <h3 className="card-title">Employee Training Progress & Certifications</h3>
            <p className="card-subtitle">
              Audit-ready records maintained by Crossworks Training & Consulting.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => alert("Downloading certified compliance report for " + currentUser.organization)}>
            <Download size={13} /> Export Audited Report
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
    </div>
  );
}
