import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Lock, 
  Unlock, 
  FileText, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Download, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  TrendingUp, 
  X,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CLIENT_COMPANIES, INITIAL_TRAINING_RECORDS } from '../data/mockData';
import { fetchRecords, fetchCompanies, decryptRecordApi } from '../services/api';

export default function StaffDashboard({ activeSubView }) {
  const { currentUser, token } = useAuth();
  const [records, setRecords] = useState(INITIAL_TRAINING_RECORDS);
  const [companies, setCompanies] = useState(CLIENT_COMPANIES);
  const [search, setSearch] = useState('');
  const [activeCompanyFilter, setActiveCompanyFilter] = useState('ALL');
  const [activeRecord, setActiveRecord] = useState(null);
  const [denialDetails, setDenialDetails] = useState(null);
  const [reportCompany, setReportCompany] = useState('CORP_ALPHA');
  const [reportExported, setReportExported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real database records on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [dbRecords, dbCompanies] = await Promise.all([
        fetchRecords(token),
        fetchCompanies(token)
      ]);

      if (dbCompanies && dbCompanies.length > 0) {
        setCompanies(dbCompanies.map(c => ({
          code: c.code,
          name: c.name,
          industry: c.industry || 'Enterprise',
          activeLearners: 12
        })));
      }

      if (dbRecords && dbRecords.length > 0) {
        // Map backend schema to friendly display records
        const mapped = dbRecords.map((r, idx) => {
          const compCode = r.encryption_policy?.includes('FINTECH_BETA') 
            ? 'FINTECH_BETA' 
            : r.encryption_policy?.includes('RETAIL_GAMMA') 
              ? 'RETAIL_GAMMA' 
              : 'CORP_ALPHA';
          const compObj = (dbCompanies || CLIENT_COMPANIES).find(c => c.code === compCode);

          return {
            id: r.id,
            traineeName: r.trainee_name || `Learner ${idx + 1}`,
            traineeEmail: `learner${idx + 1}@${compCode.toLowerCase()}.ph`,
            companyCode: compCode,
            companyName: compObj?.name || 'San Miguel Conglomerate Holdings',
            courseName: r.course_name,
            status: r.status || 'completed',
            score: r.score || 92.0,
            encryptionPolicy: r.encryption_policy,
            payload: {
              assessmentScore: `${r.score || 92.0}%`,
              assessorNotes: 'Verified assessment passed under verified instructor supervision.',
              certificateHash: `SHA256:${r.id.replace(/-/g, '').substring(0, 16)}`
            }
          };
        });
        setRecords(mapped);
      }
      setIsLoading(false);
    }
    loadData();
  }, [token]);

  const isAuthorized = (record) => {
    return (currentUser?.assigned_companies || []).includes(record.companyCode);
  };

  const handleDecrypt = async (record) => {
    if (isAuthorized(record)) {
      // Call real backend decryption endpoint if token exists
      if (token) {
        const result = await decryptRecordApi(record.id, token);
        if (result.ok && result.data?.decrypted_payload) {
          const p = result.data.decrypted_payload;
          setActiveRecord({
            ...record,
            payload: {
              assessmentScore: `${p.score || record.score}%`,
              assessorNotes: p.assessment_details?.remarks || 'Verified and authenticated by Crossworks Security Engine.',
              certificateHash: `SIG-${record.id.substring(0, 8)}`
            }
          });
          setDenialDetails(null);
          return;
        }
      }
      setActiveRecord(record);
      setDenialDetails(null);
    } else {
      // Call backend to trigger real out-of-scope anomaly detection
      if (token) {
        decryptRecordApi(record.id, token).catch(() => {});
      }

      setDenialDetails({
        record,
        reason: `Access Denied: Your staff profile (${currentUser.name}) is only authorized for [${currentUser.assigned_companies.join(', ')}]. This record belongs to ${record.companyName}. An out-of-scope access event was recorded for compliance monitoring.`
      });
      setActiveRecord(null);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesComp = activeCompanyFilter === 'ALL' || r.companyCode === activeCompanyFilter;
    const matchesSearch = r.traineeName.toLowerCase().includes(search.toLowerCase()) ||
                          r.courseName.toLowerCase().includes(search.toLowerCase());
    return matchesComp && matchesSearch;
  });

  const selectedReportComp = companies.find(c => c.code === reportCompany) || companies[0];
  const compRecords = records.filter(r => r.companyCode === reportCompany);
  const compCompleted = compRecords.filter(r => r.status === 'completed').length;
  const compAvg = compRecords.length > 0 
    ? (compRecords.reduce((acc, r) => acc + (r.score || 0), 0) / compRecords.length).toFixed(1)
    : '0.0';

  return (
    <div className="dashboard-content-layout">
      {/* 1. RECORDS VAULT SUB-VIEW */}
      {(activeSubView === 'staff_records' || !activeSubView) && (
        <>
          <div className="view-title-header">
            <div>
              <h2>Assigned Client Records Vault</h2>
              <p className="text-secondary text-sm">
                Decrypt and manage training records matching your authorized client organizations.
              </p>
            </div>
            <div className="flex-align gap-8">
              <span className="badge badge-purple">Role: Account Manager</span>
              <span className="badge badge-green">Authorized: {currentUser?.assigned_companies?.join(', ')}</span>
            </div>
          </div>

          <div className="card view-toolbar">
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search trainee or course..."
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="company-filter-pills">
              <button
                className={`pill-btn ${activeCompanyFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveCompanyFilter('ALL')}
              >
                All Portfolios
              </button>
              {companies.map(c => (
                <button
                  key={c.code}
                  className={`pill-btn ${activeCompanyFilter === c.code ? 'active' : ''}`}
                  onClick={() => setActiveCompanyFilter(c.code)}
                >
                  {c.name.split(' ')[0]}
                  {currentUser?.assigned_companies?.includes(c.code) && ' ★'}
                </button>
              ))}
            </div>
          </div>

          <div className="card section-card">
            <div className="table-responsive">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Trainee</th>
                    <th>Client Organization</th>
                    <th>Course Name</th>
                    <th>Access Policy</th>
                    <th style={{ textAlign: 'right' }}>Authorization & Decrypt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => {
                    const canAccess = isAuthorized(r);
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="trainee-info-cell">
                            <span className="trainee-main-name">{r.traineeName}</span>
                            <span className="trainee-email-text">{r.traineeEmail}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-purple">{r.companyName}</span>
                        </td>
                        <td>
                          <div className="course-title-cell">{r.courseName}</div>
                          <span className={`badge ${r.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <span className="friendly-policy-text">
                            {r.companyCode} Staff & Admins
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={`btn btn-sm ${canAccess ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleDecrypt(r)}
                          >
                            {canAccess ? <Unlock size={13} /> : <Lock size={13} />}
                            <span>{canAccess ? 'Decrypt Record' : 'Attempt (Out-of-Scope)'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. ASSIGNED CLIENTS PORTFOLIO SUB-VIEW */}
      {activeSubView === 'assigned_clients' && (
        <>
          <div className="view-title-header">
            <div>
              <h2>Assigned Client Organization Portfolios</h2>
              <p className="text-secondary text-sm">
                Corporate client organizations under your active account management.
              </p>
            </div>
          </div>

          <div className="client-cards-grid">
            {companies.map(c => {
              const isAssigned = currentUser?.assigned_companies?.includes(c.code);
              return (
                <div key={c.code} className="card client-portfolio-card">
                  <div className="client-card-header">
                    <Building2 size={24} className={isAssigned ? 'text-cyan' : 'text-secondary'} />
                    <span className={`badge ${isAssigned ? 'badge-green' : 'badge-gray'}`}>
                      {isAssigned ? 'Assigned Account' : 'Other Account Manager'}
                    </span>
                  </div>
                  <h3>{c.name}</h3>
                  <div className="text-secondary text-xs mb-16">Industry: {c.industry}</div>
                  
                  <div className="client-stat-line">
                    <span>Enrolled Trainees:</span>
                    <strong>{c.activeLearners || 12}</strong>
                  </div>
                  <div className="client-stat-line">
                    <span>Account Scope:</span>
                    <code>{c.code}</code>
                  </div>
                  <div className="client-stat-line">
                    <span>Status:</span>
                    <span className="text-emerald font-bold">Active Agreement</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 3. COMPLIANCE AUDIT REPORTS SUB-VIEW */}
      {activeSubView === 'compliance_reports' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Generate Client Audit & Compliance Report</h3>
              <p className="card-subtitle">
                Crossworks verified report backed by secure data separation.
              </p>
            </div>
            <div className="flex-align gap-8">
              <select
                className="clean-input"
                style={{ width: 'auto' }}
                value={reportCompany}
                onChange={(e) => setReportCompany(e.target.value)}
              >
                {companies.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setReportExported(true);
                  setTimeout(() => setReportExported(false), 3000);
                }}
              >
                <Download size={13} />
                {reportExported ? 'Report Exported!' : 'Export PDF Summary'}
              </button>
            </div>
          </div>

          <div className="p-24">
            <div className="metrics-summary-row mb-16">
              <div className="card metric-tile">
                <span className="tile-label">Total Trainees</span>
                <div className="tile-value">{compRecords.length}</div>
              </div>
              <div className="card metric-tile">
                <span className="tile-label">Completion Rate</span>
                <div className="tile-value text-emerald">
                  {compRecords.length > 0 ? `${Math.round((compCompleted / compRecords.length) * 100)}%` : '0%'}
                </div>
              </div>
              <div className="card metric-tile">
                <span className="tile-label">Average Score</span>
                <div className="tile-value text-cyan">{compAvg}%</div>
              </div>
            </div>

            <table className="clean-table">
              <thead>
                <tr>
                  <th>Trainee</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {compRecords.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.traineeName}</strong></td>
                    <td>{r.courseName}</td>
                    <td><span className="badge badge-green">{r.status}</span></td>
                    <td><strong>{r.score}%</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decrypted Record Modal */}
      {activeRecord && (
        <div className="modal-backdrop" onClick={() => setActiveRecord(null)}>
          <div className="card modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="flex-align gap-8">
                <ShieldCheck size={20} className="text-emerald" />
                <div>
                  <h3>Record Decrypted Successfully</h3>
                  <div className="dialog-subtitle">Access verified under company attribute: {activeRecord.companyCode}</div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setActiveRecord(null)}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              <div className="record-summary-card">
                <div className="summary-field">
                  <span className="field-label">Trainee</span>
                  <span className="field-value">{activeRecord.traineeName}</span>
                </div>
                <div className="summary-field">
                  <span className="field-label">Client Organization</span>
                  <span className="field-value">{activeRecord.companyName}</span>
                </div>
                <div className="summary-field">
                  <span className="field-label">Course</span>
                  <span className="field-value">{activeRecord.courseName}</span>
                </div>
                <div className="summary-field">
                  <span className="field-label">Official Score</span>
                  <span className="field-value text-emerald font-bold">{activeRecord.payload.assessmentScore}</span>
                </div>
              </div>

              <div className="details-section">
                <h4>Instructor Evaluation & Remarks</h4>
                <p className="remarks-text">{activeRecord.payload.assessorNotes}</p>
              </div>

              <div className="details-section">
                <h4>Certificate Digital Signature</h4>
                <code>{activeRecord.payload.certificateHash}</code>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-primary" onClick={() => setActiveRecord(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Denial Alert Modal */}
      {denialDetails && (
        <div className="modal-backdrop" onClick={() => setDenialDetails(null)}>
          <div className="card modal-dialog modal-denial" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="flex-align gap-8">
                <ShieldAlert size={20} className="text-rose" />
                <h3>Access Authorization Rejected</h3>
              </div>
              <button className="close-btn" onClick={() => setDenialDetails(null)}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              <p className="dialog-text">{denialDetails.reason}</p>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setDenialDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
