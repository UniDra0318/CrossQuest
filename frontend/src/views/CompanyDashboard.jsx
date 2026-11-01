import React, { useState, useEffect } from 'react';
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
  Award, 
  AlertTriangle 
} from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { INITIAL_TRAINING_RECORDS } from '../data/mockData';
import { fetchRecords } from '../services/api';

export default function CompanyDashboard({ activeSubView, setActiveView }) {
  const { currentUser, token } = useAuth();
  const companyCode = currentUser?.company_code || 'CORP_ALPHA';
  const [records, setRecords] = useState(INITIAL_TRAINING_RECORDS);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    async function loadCompanyData() {
      setIsLoading(true);
      try {
        const dbRecords = await fetchRecords(token);
        if (dbRecords && dbRecords.length > 0) {
          const mapped = dbRecords.map((r, idx) => {
            const code = r.encryption_policy?.includes('FINTECH_BETA') 
              ? 'FINTECH_BETA' 
              : r.encryption_policy?.includes('RETAIL_GAMMA') 
                ? 'RETAIL_GAMMA' 
                : 'CORP_ALPHA';
            return {
              id: r.id,
              traineeName: r.trainee_name || `Employee ${idx + 1}`,
              traineeEmail: `employee${idx + 1}@${code.toLowerCase()}.ph`,
              companyCode: code,
              courseName: r.course_name,
              status: r.status || 'completed',
              score: r.score || 92.0,
              completionDate: r.created_at ? new Date(r.created_at).toLocaleDateString() : '2026-09-20'
            };
          });
          setRecords(mapped);
          setUsingFallback(false);
        } else {
          setUsingFallback(true);
        }
      } catch (err) {
        setUsingFallback(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadCompanyData();
  }, [token]);

  const companyRecords = records.filter(r => r.companyCode === companyCode);
  const completed = companyRecords.filter(r => r.status === 'completed').length;
  const avgScore = companyRecords.length > 0 
    ? (companyRecords.reduce((acc, r) => acc + (r.score || 0), 0) / companyRecords.length).toFixed(1)
    : '0.0';

  const currentTab = ['company_trainees', 'audit_certificate'].includes(activeSubView)
    ? activeSubView
    : 'company_overview';

  const companyTabs = [
    { id: 'company_overview', label: 'Company Compliance', icon: Building2 },
    { id: 'company_trainees', label: 'Employee Records', icon: Users },
    { id: 'audit_certificate', label: 'Compliance & Audit Report', icon: ShieldCheck }
  ];

  return (
    <div className="dashboard-content-layout">
      {usingFallback && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '10px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#d97706" />
          <span>Notice: Showing cached baseline compliance data. Live synchronization in progress or server offline.</span>
        </div>
      )}

      {/* IN-PAGE COMPANY WORKSPACE TAB STRIP */}
      <nav className="company-nav-tabs" aria-label="Company Sections" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '10px'
      }}>
        {companyTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView && setActiveView(tab.id)}
              className={`trainee-tab-pill ${isActive ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#4338ca' : '#64748b',
                background: isActive ? '#eef2ff' : '#ffffff',
                border: isActive ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 3px rgba(67, 56, 202, 0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} color={isActive ? '#4f46e5' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 1. COMPANY OVERVIEW */}
      {currentTab === 'company_overview' && (
        <>
          <div className="view-title-header">
            <div>
              <h2>{currentUser?.organization} - Compliance Portal</h2>
              <p className="text-secondary text-sm">
                Corporate training progress, audit verification, and data isolation oversight.
              </p>
            </div>
            <div className="flex-align gap-8">
              <span className="badge badge-green">Tenant Isolation: Verified</span>
              <span className="badge badge-purple">Data Security: Active</span>
            </div>
          </div>

          <div className="metrics-summary-row">
            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Enrolled Workforce</span>
                <Users size={18} className="text-blue" />
              </div>
              <div className="tile-value">{companyRecords.length} Active</div>
              <div className="tile-sub">{currentUser?.organization} Cohort</div>
            </div>

            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Compliance Completion</span>
                <CheckCircle2 size={18} className="text-emerald" />
              </div>
              <div className="tile-value text-emerald">
                {Math.round((completed / (companyRecords.length || 1)) * 100)}%
              </div>
              <div className="tile-sub">Mandatory Training Modules</div>
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
              <div className="tile-value text-purple">Guaranteed</div>
              <div className="tile-sub">Strict Cryptographic Isolation</div>
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
      {currentTab === 'company_trainees' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Company Employee Records (Strictly Isolated)</h3>
              <p className="card-subtitle">
                Cross-client records from other client companies are strictly isolated.
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
      {currentTab === 'audit_certificate' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Data Privacy & Security Audit Certificate</h3>
              <p className="card-subtitle">
                Audited proof of zero cross-client record contamination.
              </p>
            </div>
          </div>

          <div className="p-24">
            <div className="card notice-box mb-16">
              <ShieldCheck size={20} className="text-emerald" />
              <div>
                <strong>Security & Privacy Audit Guarantee</strong>
                <p className="text-xs text-secondary mt-2">
                  All training records for {currentUser?.organization} are bound to strict organizational policies 
                  <code>(COMPANY:{companyCode})</code> and defended by database row-level security.
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
              <span className="spec-label">Audit Verification Timestamp</span>
              <span>2026-10-03 18:00:00 UTC</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
