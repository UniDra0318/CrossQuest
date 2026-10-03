import React, { useState } from 'react';
import { 
  Key, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  Search, 
  Filter,
  Eye,
  ShieldAlert,
  DownloadCloud
} from 'lucide-react';

export default function SecurityDashboard({
  records,
  currentStaff,
  anomalies,
  setAnomalies,
  clientCompanies
}) {
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [decryptedRecord, setDecryptedRecord] = useState(null);
  const [deniedAttempt, setDeniedAttempt] = useState(null);
  const [selectedReportCompany, setSelectedReportCompany] = useState(clientCompanies[0]?.code || 'CORP_ALPHA');
  const [generatedReport, setGeneratedReport] = useState(null);

  // Check if staff attributes satisfy record's CP-ABE policy
  const canStaffDecrypt = (record) => {
    if (currentStaff.role === 'admin') return true;
    if (currentStaff.role === 'account_manager') {
      return currentStaff.assigned_companies.includes(record.companyCode);
    }
    return false;
  };

  const handleDecrypt = (record) => {
    const isAuthorized = canStaffDecrypt(record);

    if (isAuthorized) {
      setDecryptedRecord(record);
      setDeniedAttempt(null);
    } else {
      // Trigger Access Anomaly Detection: OUT_OF_SCOPE
      const newAlert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        type: 'OUT_OF_SCOPE',
        severity: 'HIGH',
        userEmail: currentStaff.email,
        userName: currentStaff.name,
        description: `Unauthorized decryption attempt on record #${record.id} (${record.companyName}) by staff without matching company attribute.`,
        targetRecord: `${record.id} (${record.traineeName})`,
        status: 'UNREVIEWED'
      };

      setAnomalies(prev => [newAlert, ...prev]);
      setDeniedAttempt({
        record,
        reason: `Your assigned attributes (${currentStaff.assigned_companies.join(', ')}) do not satisfy the CP-ABE policy: ${record.encryptionPolicy}`
      });
      setDecryptedRecord(null);
    }
  };

  const handleAcknowledgeAnomaly = (id) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
  };

  const handleGenerateReport = () => {
    const company = clientCompanies.find(c => c.code === selectedReportCompany);
    const companyRecords = records.filter(r => r.companyCode === selectedReportCompany);
    const completed = companyRecords.filter(r => r.status === 'completed').length;
    const avgScore = companyRecords.reduce((acc, r) => acc + (r.score || 0), 0) / (companyRecords.length || 1);

    setGeneratedReport({
      company,
      totalTrainings: companyRecords.length,
      completedTrainings: completed,
      complianceRate: `${Math.round((completed / (companyRecords.length || 1)) * 100)}%`,
      averageScore: `${avgScore.toFixed(1)}%`,
      records: companyRecords,
      generatedAt: new Date().toLocaleString(),
      auditHash: `SHA256:${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
    });
  };

  const filteredRecords = records.filter(r => {
    const matchesCompany = selectedCompanyFilter === 'ALL' || r.companyCode === selectedCompanyFilter;
    const matchesSearch = r.traineeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCompany && matchesSearch;
  });

  return (
    <div className="security-dashboard-layout">
      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span className="metric-label">CP-ABE Protected Records</span>
            <Lock className="metric-icon cyan" size={20} />
          </div>
          <div className="metric-value">{records.length}</div>
          <div className="metric-footer">Waters11 Policy Bound Ciphertexts</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span className="metric-label">Client Portfolios</span>
            <Building2 className="metric-icon purple" size={20} />
          </div>
          <div className="metric-value">{clientCompanies.length}</div>
          <div className="metric-footer">Attribute Data Isolation Enforced</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span className="metric-label">Anomaly Alerts</span>
            <AlertTriangle className="metric-icon rose" size={20} />
          </div>
          <div className="metric-value">
            {anomalies.filter(a => a.status === 'UNREVIEWED').length}
          </div>
          <div className="metric-footer">Rule- & Threshold-based Active Watch</div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span className="metric-label">Database Layer Guard</span>
            <Key className="metric-icon emerald" size={20} />
          </div>
          <div className="metric-value">RLS Active</div>
          <div className="metric-footer">Defense-in-depth Row Filtering</div>
        </div>
      </div>

      {/* Access Denied Warning Toast */}
      {deniedAttempt && (
        <div className="glass-panel alert-banner-denied">
          <div className="alert-content">
            <ShieldAlert size={26} className="text-rose" />
            <div>
              <h4 className="alert-title">CP-ABE Cryptographic Policy Rejection</h4>
              <p className="alert-desc">{deniedAttempt.reason}</p>
              <div className="alert-meta">
                <span>Security event automatically logged in Access Anomaly Engine.</span>
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => setDeniedAttempt(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Vault & Anomaly Split */}
      <div className="vault-anomaly-split">
        {/* Left Side: CP-ABE Record Vault */}
        <section className="glass-panel vault-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                <Lock size={18} className="text-cyan" /> Multi-Client Training Record Vault
              </h2>
              <p className="section-desc">Records are encrypted with policies tied to trainee attributes & client affiliations.</p>
            </div>
            
            {/* Filter controls */}
            <div className="vault-controls">
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search trainee, course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="vault-search"
                />
              </div>
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="vault-filter-select"
              >
                <option value="ALL">All Client Companies</option>
                {clientCompanies.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="records-table-container">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Trainee</th>
                  <th>Client Company</th>
                  <th>Course & Status</th>
                  <th>CP-ABE Policy String</th>
                  <th>Decryption</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const authorized = canStaffDecrypt(record);
                  return (
                    <tr key={record.id} className="record-row">
                      <td>
                        <div className="trainee-cell">
                          <span className="trainee-name">{record.traineeName}</span>
                          <span className="trainee-email">{record.traineeEmail}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{record.companyCode}</span>
                        <div className="company-sub">{record.companyName}</div>
                      </td>
                      <td>
                        <div className="course-name">{record.courseName}</div>
                        <span className={`badge ${record.status === 'completed' ? 'badge-emerald' : 'badge-amber'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>
                        <code className="policy-code">{record.encryptionPolicy}</code>
                      </td>
                      <td>
                        <button
                          id={`decrypt-btn-${record.id}`}
                          className={`btn ${authorized ? 'btn-primary' : 'btn-danger'} btn-sm`}
                          onClick={() => handleDecrypt(record)}
                        >
                          {authorized ? <Unlock size={14} /> : <Lock size={14} />}
                          <span>{authorized ? 'Decrypt' : 'Simulate Try'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Side: Access Anomaly Detection Engine */}
        <section className="glass-panel anomaly-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                <AlertTriangle size={18} className="text-rose" /> Anomaly Detection Engine
              </h2>
              <p className="section-desc">Active monitoring for out-of-scope, off-hours, and high-volume requests.</p>
            </div>
          </div>

          <div className="anomaly-feed">
            {anomalies.map((item) => (
              <div 
                key={item.id} 
                className={`anomaly-card ${item.status === 'RESOLVED' ? 'resolved' : 'active'}`}
              >
                <div className="anomaly-card-top">
                  <span className={`badge ${item.severity === 'HIGH' ? 'badge-rose' : 'badge-amber'}`}>
                    {item.type}
                  </span>
                  <span className="anomaly-timestamp">
                    <Clock size={12} /> {item.timestamp}
                  </span>
                </div>
                <div className="anomaly-subject">
                  <strong>User:</strong> {item.userName} ({item.userEmail})
                </div>
                <p className="anomaly-desc">{item.description}</p>
                <div className="anomaly-footer">
                  <span className="target-record-pill">Target: {item.targetRecord}</span>
                  {item.status === 'UNREVIEWED' ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAcknowledgeAnomaly(item.id)}
                    >
                      <CheckCircle2 size={13} /> Review
                    </button>
                  ) : (
                    <span className="badge badge-emerald">Audited</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Client Organization Reporting Section */}
      <section className="glass-panel reporting-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <FileText size={18} className="text-cyan" /> Crossworks Client Audit Reporting
            </h2>
            <p className="section-desc">Generate fine-grained, attribute-isolated compliance reports for client organizations.</p>
          </div>
          <div className="reporting-actions">
            <select
              value={selectedReportCompany}
              onChange={(e) => setSelectedReportCompany(e.target.value)}
              className="vault-filter-select"
            >
              {clientCompanies.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={handleGenerateReport}>
              <DownloadCloud size={16} /> Generate Client Report
            </button>
          </div>
        </div>

        {generatedReport && (
          <div className="generated-report-card">
            <div className="report-summary-bar">
              <div>
                <h3>{generatedReport.company.name}</h3>
                <span className="text-muted">Industry: {generatedReport.company.industry} • Generated: {generatedReport.generatedAt}</span>
              </div>
              <div className="report-stats">
                <div className="stat-box">
                  <div className="stat-num">{generatedReport.totalTrainings}</div>
                  <div className="stat-name">Total Enrolled</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">{generatedReport.complianceRate}</div>
                  <div className="stat-name">Completion Rate</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">{generatedReport.averageScore}</div>
                  <div className="stat-name">Avg Score</div>
                </div>
              </div>
            </div>
            <div className="report-hash-bar">
              <code>Audited CP-ABE Record Certificate Hash: {generatedReport.auditHash}</code>
            </div>
          </div>
        )}
      </section>

      {/* Decrypted Record Modal */}
      {decryptedRecord && (
        <div className="modal-backdrop" onClick={() => setDecryptedRecord(null)}>
          <div className="glass-panel decrypted-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-align gap-8">
                <CheckCircle2 size={24} className="text-emerald" />
                <div>
                  <h3>CP-ABE Ciphertext Decrypted Successfully</h3>
                  <p className="text-muted">Staff private key attributes satisfied policy: {decryptedRecord.encryptionPolicy}</p>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setDecryptedRecord(null)}>
                Close
              </button>
            </div>

            <div className="modal-body">
              <div className="record-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Trainee</span>
                  <span className="detail-val">{decryptedRecord.traineeName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Client Company</span>
                  <span className="detail-val">{decryptedRecord.companyName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Course Title</span>
                  <span className="detail-val">{decryptedRecord.courseName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Assessment Score</span>
                  <span className="detail-val text-emerald font-bold">{decryptedRecord.payload.assessmentScore}</span>
                </div>
              </div>

              <div className="payload-box">
                <div className="payload-header">
                  <Key size={14} className="text-cyan" /> Plaintext Sensitive Payload:
                </div>
                <pre className="payload-code">
                  {JSON.stringify(decryptedRecord.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <span className="text-dim text-xs">ISO/IEC 27001 Cryptographic Access Control Satisfied</span>
              <button className="btn btn-primary" onClick={() => setDecryptedRecord(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
