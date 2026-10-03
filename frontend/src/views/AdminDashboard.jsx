import React, { useState } from 'react';
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Database, 
  FileText,
  Plus,
  RefreshCw,
  Edit2,
  Lock,
  Unlock,
  Server,
  Layers,
  Search,
  Download
} from 'lucide-react';
import { INITIAL_ANOMALIES, INITIAL_STAFF_PROFILES, INITIAL_TRAINING_RECORDS, CLIENT_COMPANIES } from '../data/mockData';

export default function AdminDashboard({ activeSubView }) {
  const [staffList, setStaffList] = useState(INITIAL_STAFF_PROFILES);
  const [anomalies, setAnomalies] = useState(INITIAL_ANOMALIES);
  const [editingStaff, setEditingStaff] = useState(null);
  const [anomalyFilter, setAnomalyFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAcknowledge = (id) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
  };

  const handleSaveAttributes = (e) => {
    e.preventDefault();
    setStaffList(prev => prev.map(s => s.id === editingStaff.id ? editingStaff : s));
    setEditingStaff(null);
  };

  const toggleCompany = (companyCode) => {
    if (!editingStaff) return;
    const current = editingStaff.assigned_companies || [];
    const next = current.includes(companyCode)
      ? current.filter(c => c !== companyCode)
      : [...current, companyCode];
    setEditingStaff({ ...editingStaff, assigned_companies: next });
  };

  const unreviewedCount = anomalies.filter(a => a.status === 'UNREVIEWED').length;

  const filteredAnomalies = anomalies.filter(a => {
    if (anomalyFilter === 'UNREVIEWED') return a.status === 'UNREVIEWED';
    if (anomalyFilter === 'RESOLVED') return a.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="dashboard-content-layout">
      {/* 1. OVERVIEW VIEW */}
      {(activeSubView === 'admin_overview' || !activeSubView) && (
        <>
          <div className="view-title-header">
            <div>
              <h2>Executive Security & Cryptographic Posture</h2>
              <p className="text-secondary text-sm">
                Centralized monitoring for CP-ABE attribute-based access control, database RLS, and anomaly response.
              </p>
            </div>
            <div className="flex-align gap-8">
              <span className="badge badge-green">Authority Status: Active</span>
              <span className="badge badge-blue">Group: SS512</span>
            </div>
          </div>

          <div className="metrics-summary-row">
            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Security Posture Score</span>
                <Shield size={18} className="text-emerald" />
              </div>
              <div className="tile-value text-emerald">98.4%</div>
              <div className="tile-sub">ISO/IEC 27001:2022 Control Baseline Met</div>
            </div>

            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Pending Anomaly Incidents</span>
                <AlertTriangle size={18} className="text-rose" />
              </div>
              <div className="tile-value text-rose">{unreviewedCount} Alerts</div>
              <div className="tile-sub">Rule- & Threshold-based active flags</div>
            </div>

            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Managed Staff Profiles</span>
                <UserCheck size={18} className="text-cyan" />
              </div>
              <div className="tile-value">{staffList.length} Accounts</div>
              <div className="tile-sub">Single-authority managed keys</div>
            </div>

            <div className="card metric-tile">
              <div className="metric-tile-header">
                <span className="tile-label">Database Layer Guard</span>
                <Database size={18} className="text-purple" />
              </div>
              <div className="tile-value">RLS Active</div>
              <div className="tile-sub">PostgreSQL row filtering enabled</div>
            </div>
          </div>

          {/* Dual Panel: Recent Incidents & Key Authority Status */}
          <div className="dual-grid-section">
            <div className="card section-card">
              <div className="card-header-bar">
                <h3 className="card-title">Recent Access Anomaly Alerts</h3>
                <span className="badge badge-rose">{unreviewedCount} Unreviewed</span>
              </div>
              <div className="alerts-feed-list">
                {anomalies.slice(0, 3).map((item) => (
                  <div key={item.id} className={`clean-alert-item ${item.status === 'RESOLVED' ? 'resolved' : 'pending'}`}>
                    <div className="alert-item-left">
                      <span className={`badge ${item.severity === 'HIGH' ? 'badge-rose' : 'badge-amber'}`}>
                        {item.type.replace(/_/g, ' ')}
                      </span>
                      <div className="alert-main-content">
                        <div className="alert-heading"><strong>{item.userName}</strong> ({item.userEmail})</div>
                        <p className="alert-text">{item.description}</p>
                        <div className="alert-footer-info">
                          <span className="alert-time"><Clock size={12} /> {item.timestamp}</span>
                        </div>
                      </div>
                    </div>
                    {item.status === 'UNREVIEWED' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAcknowledge(item.id)}>
                        <CheckCircle2 size={13} /> Acknowledge
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card section-card">
              <div className="card-header-bar">
                <h3 className="card-title">Cryptographic Architecture Details</h3>
                <span className="badge badge-purple">Charm-Crypto</span>
              </div>
              <div className="p-20">
                <div className="tech-spec-item">
                  <span className="spec-label">Scheme</span>
                  <span className="spec-value">BSW07 / Waters11 (Ciphertext-Policy ABE)</span>
                </div>
                <div className="tech-spec-item">
                  <span className="spec-label">Elliptic Curve</span>
                  <span className="spec-value">SS512 (Symmetric Pairing Group)</span>
                </div>
                <div className="tech-spec-item">
                  <span className="spec-label">Authority Type</span>
                  <span className="spec-value">Single Crossworks Authority</span>
                </div>
                <div className="tech-spec-item">
                  <span className="spec-label">Master Public Key</span>
                  <code className="text-xs text-cyan">MPK_SHA256: 8a4f91b...34e2</code>
                </div>
                <div className="tech-spec-item">
                  <span className="spec-label">Defense-in-Depth</span>
                  <span className="spec-value">PostgreSQL Row-Level Security (RLS)</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. ATTRIBUTE AUTHORITY VIEW */}
      {activeSubView === 'attribute_authority' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">CP-ABE Staff Attribute Management</h3>
              <p className="card-subtitle">
                Configure roles, clearance levels, and assigned client accounts that form private decryption keys.
              </p>
            </div>
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search staff members..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Current Role</th>
                  <th>Clearance Level</th>
                  <th>Assigned Client Accounts</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((staff) => (
                    <tr key={staff.id}>
                      <td>
                        <div className="trainee-info-cell">
                          <span className="trainee-main-name">{staff.name}</span>
                          <span className="trainee-email-text">{staff.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{staff.role.toUpperCase()}</span>
                      </td>
                      <td>
                        <span className="badge badge-blue">Level {staff.clearance_level}</span>
                      </td>
                      <td>
                        <div className="context-chips">
                          {staff.assigned_companies.map(c => (
                            <span key={c} className="badge badge-green">{c}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingStaff({ ...staff })}
                        >
                          <Edit2 size={13} /> Edit Attributes
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ANOMALIES VIEW */}
      {activeSubView === 'anomalies' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Access Anomaly Incident Response Center</h3>
              <p className="card-subtitle">
                Rule- and threshold-based monitoring engine flagging suspicious, off-hours, or out-of-scope access attempts.
              </p>
            </div>
            <div className="company-filter-pills">
              <button className={`pill-btn ${anomalyFilter === 'ALL' ? 'active' : ''}`} onClick={() => setAnomalyFilter('ALL')}>
                All Incidents ({anomalies.length})
              </button>
              <button className={`pill-btn ${anomalyFilter === 'UNREVIEWED' ? 'active' : ''}`} onClick={() => setAnomalyFilter('UNREVIEWED')}>
                Unreviewed ({unreviewedCount})
              </button>
              <button className={`pill-btn ${anomalyFilter === 'RESOLVED' ? 'active' : ''}`} onClick={() => setAnomalyFilter('RESOLVED')}>
                Audited & Resolved
              </button>
            </div>
          </div>

          <div className="alerts-feed-list">
            {filteredAnomalies.map((item) => (
              <div key={item.id} className={`clean-alert-item ${item.status === 'RESOLVED' ? 'resolved' : 'pending'}`}>
                <div className="alert-item-left">
                  <span className={`badge ${item.severity === 'HIGH' ? 'badge-rose' : 'badge-amber'}`}>
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <div className="alert-main-content">
                    <div className="alert-heading">
                      <strong>{item.userName}</strong> ({item.userEmail})
                    </div>
                    <p className="alert-text">{item.description}</p>
                    <div className="alert-footer-info">
                      <span className="alert-time"><Clock size={12} /> {item.timestamp}</span>
                      <span>Target: {item.targetRecord}</span>
                    </div>
                  </div>
                </div>

                <div className="alert-item-right">
                  {item.status === 'UNREVIEWED' ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleAcknowledge(item.id)}>
                      <CheckCircle2 size={13} /> Acknowledge Alert
                    </button>
                  ) : (
                    <span className="badge badge-gray">Audited & Resolved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MASTER RECORDS VAULT VIEW */}
      {activeSubView === 'records_vault' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Master Multi-Client Record Store</h3>
              <p className="card-subtitle">
                Global view of all client ciphertexts protected by Ciphertext-Policy ABE.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => alert("Exporting master audit logs...")}>
              <Download size={13} /> Export Master Audit Logs
            </button>
          </div>

          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Trainee</th>
                  <th>Client Organization</th>
                  <th>Course Name</th>
                  <th>CP-ABE Policy String</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {INITIAL_TRAINING_RECORDS.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td>
                      <div className="trainee-info-cell">
                        <span className="trainee-main-name">{r.traineeName}</span>
                        <span className="trainee-email-text">{r.traineeEmail}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-purple">{r.companyName}</span></td>
                    <td>{r.courseName}</td>
                    <td><code className="text-xs text-cyan">{r.encryptionPolicy}</code></td>
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
      )}

      {/* 5. SYSTEM SETTINGS & CRYPTO CONFIG VIEW */}
      {activeSubView === 'system_settings' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">System & Cryptographic Engine Configuration</h3>
              <p className="card-subtitle">
                Core parameters for CP-ABE Waters11 scheme, Stanford PBC, and PostgreSQL RLS filters.
              </p>
            </div>
          </div>

          <div className="p-24 config-grid">
            <div className="config-card">
              <h4>CP-ABE Pairing Parameters</h4>
              <p className="text-secondary text-xs mb-16">Waters11 / BSW07 algorithm curve initialization</p>
              <div className="config-row">
                <span>Pairing Curve:</span>
                <strong>SS512 (512-bit symmetric)</strong>
              </div>
              <div className="config-row">
                <span>Underlying C-Libraries:</span>
                <span className="badge badge-green">GMP 6.2.1 + Stanford PBC 0.5.14</span>
              </div>
              <div className="config-row">
                <span>Key Authority Scheme:</span>
                <strong>Single-Authority (Crossworks Corp)</strong>
              </div>
            </div>

            <div className="config-card">
              <h4>Anomaly Detection Thresholds</h4>
              <p className="text-secondary text-xs mb-16">Rule- and threshold-based trigger levels</p>
              <div className="config-row">
                <span>Standard Business Window:</span>
                <strong>08:00 – 19:00 UTC (Mon–Fri)</strong>
              </div>
              <div className="config-row">
                <span>Consecutive Failed Attempts:</span>
                <strong>3 failed requests / 15 mins</strong>
              </div>
              <div className="config-row">
                <span>Burst Volume Threshold:</span>
                <strong>25 records / 15 mins</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attribute Edit Modal */}
      {editingStaff && (
        <div className="modal-backdrop" onClick={() => setEditingStaff(null)}>
          <div className="card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Edit CP-ABE Attributes: {editingStaff.name}</h3>
            </div>
            <form onSubmit={handleSaveAttributes}>
              <div className="dialog-body">
                <div className="form-field mb-16">
                  <label className="field-label">Assigned Role Attribute</label>
                  <select
                    className="clean-input"
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  >
                    <option value="admin">Administrator (admin)</option>
                    <option value="account_manager">Account Manager (account_manager)</option>
                    <option value="trainer">Lead Trainer (trainer)</option>
                  </select>
                </div>

                <div className="form-field mb-16">
                  <label className="field-label">Clearance Level (1–3)</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    className="clean-input"
                    value={editingStaff.clearance_level}
                    onChange={(e) => setEditingStaff({ ...editingStaff, clearance_level: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Assigned Client Organizations</label>
                  <div className="company-toggle-row">
                    {CLIENT_COMPANIES.map((c) => {
                      const selected = editingStaff.assigned_companies.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          className={`pill-btn ${selected ? 'active' : ''}`}
                          onClick={() => toggleCompany(c.code)}
                        >
                          {c.code} {selected ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingStaff(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update & Re-Issue Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
