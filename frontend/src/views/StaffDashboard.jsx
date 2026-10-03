import React, { useState } from 'react';
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
  Info,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CLIENT_COMPANIES, INITIAL_TRAINING_RECORDS } from '../data/mockData';

export default function StaffDashboard() {
  const { currentUser } = useAuth();
  const [records] = useState(INITIAL_TRAINING_RECORDS);
  const [search, setSearch] = useState('');
  const [activeCompanyFilter, setActiveCompanyFilter] = useState('ALL');
  const [activeRecord, setActiveRecord] = useState(null);
  const [denialDetails, setDenialDetails] = useState(null);
  const [reportExported, setReportExported] = useState(false);

  // Check if staff's assigned accounts cover the record
  const isAuthorized = (record) => {
    return (currentUser.assigned_companies || []).includes(record.companyCode);
  };

  const handleDecrypt = (record) => {
    if (isAuthorized(record)) {
      setActiveRecord(record);
      setDenialDetails(null);
    } else {
      setDenialDetails({
        record,
        reason: `Access Denied: Your staff profile (${currentUser.name}) is only assigned to [${currentUser.assigned_companies.join(', ')}]. This record belongs to ${record.companyName}. An out-of-scope anomaly event has been logged for security compliance.`
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

  return (
    <div className="dashboard-content-layout">
      {/* Account Manager Portfolio Bar */}
      <div className="card view-toolbar">
        <div>
          <div className="flex-align gap-8">
            <Building2 size={20} className="text-cyan" />
            <h3>Assigned Portfolio Records</h3>
          </div>
          <p className="text-secondary text-xs">
            Viewing training records with CP-ABE attribute authorization.
          </p>
        </div>

        <div className="company-filter-pills">
          <button
            className={`pill-btn ${activeCompanyFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveCompanyFilter('ALL')}
          >
            All Accounts
          </button>
          {CLIENT_COMPANIES.map(c => (
            <button
              key={c.code}
              className={`pill-btn ${activeCompanyFilter === c.code ? 'active' : ''}`}
              onClick={() => setActiveCompanyFilter(c.code)}
            >
              {c.name.split(' ')[0]}
              {currentUser.assigned_companies.includes(c.code) && ' (Assigned)'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Records Vault */}
      <div className="card section-card">
        <div className="card-header-bar">
          <div>
            <h3 className="card-title">Multi-Client Encrypted Training Vault</h3>
            <p className="card-subtitle">
              Only records matching your assigned client account attributes will decrypt.
            </p>
          </div>

          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search records..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Trainee</th>
                <th>Client Company</th>
                <th>Course Name</th>
                <th>Policy Scope</th>
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
                        {r.companyCode} Assigned Staff & Admins
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

      {/* Decrypted Record Modal */}
      {activeRecord && (
        <div className="modal-backdrop" onClick={() => setActiveRecord(null)}>
          <div className="card modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="flex-align gap-8">
                <ShieldCheck size={20} className="text-emerald" />
                <div>
                  <h3>Record Decrypted Successfully</h3>
                  <div className="dialog-subtitle">Satisfied CP-ABE policy under company attribute: {activeRecord.companyCode}</div>
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
                <h3>CP-ABE Cryptographic Rejection</h3>
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
