import React, { useState } from 'react';
import { TableEmptyRow } from './TableEmptyState';
import { TablePagination, usePagination } from './TablePagination';
import { 
  Search, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Info, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';

export default function RecordsView({
  records,
  currentStaff,
  clientCompanies,
  onAttemptAccess
}) {
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [showTechnicalPolicy, setShowTechnicalPolicy] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [denialDetails, setDenialDetails] = useState(null);

  // Helper: friendly name for access policy
  const getFriendlyPolicyName = (companyCode) => {
    switch(companyCode) {
      case 'CORP_ALPHA': return 'San Miguel Managers & Admins';
      case 'FINTECH_BETA': return 'Maya FinTech Managers & Admins';
      case 'RETAIL_GAMMA': return 'Ayala Retail Managers & Admins';
      default: return 'Assigned Account Managers';
    }
  };

  // Helper: does current staff have permission?
  const isAuthorized = (record) => {
    if (currentStaff.role === 'admin') return true;
    if (currentStaff.role === 'account_manager') {
      return currentStaff.assigned_companies.includes(record.companyCode);
    }
    return false;
  };

  const handleActionClick = (record) => {
    const authorized = isAuthorized(record);
    if (authorized) {
      setActiveRecord(record);
      setDenialDetails(null);
    } else {
      // Trigger Access Anomaly via parent handler
      onAttemptAccess(record, false);
      setDenialDetails({
        record,
        reason: `Your current persona (${currentStaff.name}) is only authorized for [${currentStaff.assigned_companies.join(', ')}]. This record belongs to ${record.companyName}.`
      });
      setActiveRecord(null);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesComp = selectedCompany === 'ALL' || r.companyCode === selectedCompany;
    const matchesText = r.traineeName.toLowerCase().includes(search.toLowerCase()) ||
                        r.courseName.toLowerCase().includes(search.toLowerCase()) ||
                        r.companyName.toLowerCase().includes(search.toLowerCase());
    return matchesComp && matchesText;
  });

  return (
    <div className="records-view">
      {/* Top Filter and Search Bar */}
      <div className="view-toolbar card">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by trainee name or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="company-filter-pills">
          <button
            className={`pill-btn ${selectedCompany === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCompany('ALL')}
          >
            All Companies ({records.length})
          </button>
          {clientCompanies.map(c => (
            <button
              key={c.code}
              className={`pill-btn ${selectedCompany === c.code ? 'active' : ''}`}
              onClick={() => setSelectedCompany(c.code)}
            >
              {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Records Table Card */}
      <div className="card table-card">
        <div className="card-header-bar">
          <div>
            <h2 className="card-title">Encrypted Training Records</h2>
            <p className="card-subtitle">
              Each record is encrypted under Ciphertext-Policy Attribute-Based Encryption (CP-ABE).
            </p>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowTechnicalPolicy(!showTechnicalPolicy)}
          >
            <Info size={13} />
            {showTechnicalPolicy ? 'Hide Technical Policies' : 'Show Technical Policies'}
          </button>
        </div>

        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Trainee</th>
                <th>Client Organization</th>
                <th>Course Name</th>
                <th>Access Policy</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords && filteredRecords.length > 0 ? (
                pagedRecords.map((r) => {
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
                        {r.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td>
                      {showTechnicalPolicy ? (
                        <code className="tech-policy-chip">{r.encryptionPolicy}</code>
                      ) : (
                        <span className="friendly-policy-text">
                          <Lock size={12} className="inline-lock" /> {getFriendlyPolicyName(r.companyCode)}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`btn btn-sm ${canAccess ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleActionClick(r)}
                      >
                        {canAccess ? <Unlock size={13} /> : <Lock size={13} />}
                        <span>{canAccess ? 'View Record' : 'Restricted'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
              ) : (
                <TableEmptyRow
                  colSpan={5}
                  icon={FileText}
                  title="No Training Records Located"
                  subtitle="No records match your selected organization scope or attribute clearances."
                />
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={recPage}
          totalItems={totalRecs}
          pageSize={10}
          onPageChange={setRecPage}
          itemName="training records"
        />
      </div>

      {/* Access Denied Feedback Modal */}
      {denialDetails && (
        <div className="modal-backdrop" onClick={() => setDenialDetails(null)}>
          <div className="card modal-dialog modal-denial" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="flex-align gap-8">
                <ShieldAlert size={20} className="text-rose" />
                <h3>Access Denied by CP-ABE Policy</h3>
              </div>
              <button className="close-btn" onClick={() => setDenialDetails(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="dialog-body">
              <p className="dialog-text">{denialDetails.reason}</p>
              <div className="notice-box">
                <Info size={14} className="text-amber" />
                <span>
                  This access request has been automatically recorded in the <strong>Anomaly Monitor</strong> for review.
                </span>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setDenialDetails(null)}>
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decrypted Record View Modal */}
      {activeRecord && (
        <div className="modal-backdrop" onClick={() => setActiveRecord(null)}>
          <div className="card modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="flex-align gap-8">
                <ShieldCheck size={20} className="text-emerald" />
                <div>
                  <h3>Training Record Decrypted</h3>
                  <div className="dialog-subtitle">Attributes verified against CP-ABE policy</div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setActiveRecord(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="dialog-body">
              <div className="record-summary-card">
                <div className="summary-field">
                  <span className="field-label">Trainee</span>
                  <span className="field-value">{activeRecord.traineeName}</span>
                </div>
                <div className="summary-field">
                  <span className="field-label">Organization</span>
                  <span className="field-value">{activeRecord.companyName}</span>
                </div>
                <div className="summary-field">
                  <span className="field-label">Course</span>
                  <span className="field-value">{activeRecord.courseName}</span>
                </div>
                <div className="summary-field">
                  <span className="field-label">Final Assessment</span>
                  <span className="field-value text-emerald font-bold">
                    {activeRecord.payload.assessmentScore}
                  </span>
                </div>
              </div>

              <div className="details-section">
                <h4>Instructor Evaluation & Remarks</h4>
                <p className="remarks-text">{activeRecord.payload.assessorNotes}</p>
              </div>

              <div className="details-section">
                <h4>Practical Lab Grade</h4>
                <div className="lab-grade-tag">{activeRecord.payload.practicalLab}</div>
              </div>

              {/* Collapsible Cryptographic Proof */}
              <div className="crypto-details-wrap">
                <div className="crypto-header">
                  <span>Cryptographic Verification Details</span>
                </div>
                <div className="crypto-meta">
                  <div><strong>Credential Hash:</strong> <code>{activeRecord.payload.certificateHash}</code></div>
                  <div><strong>CP-ABE Scheme:</strong> Waters11 / BSW07 (SS512 Curve)</div>
                  <div><strong>Policy:</strong> <code>{activeRecord.encryptionPolicy}</code></div>
                </div>
              </div>
            </div>

            <div className="dialog-footer">
              <button className="btn btn-primary" onClick={() => setActiveRecord(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
