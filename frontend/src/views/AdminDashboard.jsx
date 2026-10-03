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
  Edit2
} from 'lucide-react';
import { INITIAL_ANOMALIES, INITIAL_STAFF_PROFILES } from '../data/mockData';

export default function AdminDashboard({ activeSubView }) {
  const [staffList, setStaffList] = useState(INITIAL_STAFF_PROFILES);
  const [anomalies, setAnomalies] = useState(INITIAL_ANOMALIES);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newCompanyInput, setNewCompanyInput] = useState('');

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

  return (
    <div className="dashboard-content-layout">
      {/* Top Banner Metric Cards */}
      <div className="metrics-summary-row">
        <div className="card metric-tile">
          <div className="metric-tile-header">
            <span className="tile-label">CP-ABE Authority Keys</span>
            <Key size={18} className="text-cyan" />
          </div>
          <div className="tile-value">SS512 Active</div>
          <div className="tile-sub">Master Public & Secret Key Initialized</div>
        </div>

        <div className="card metric-tile">
          <div className="metric-tile-header">
            <span className="tile-label">Unreviewed Anomalies</span>
            <AlertTriangle size={18} className="text-rose" />
          </div>
          <div className="tile-value">{unreviewedCount} Alerts</div>
          <div className="tile-sub">Rule- & Threshold-based Engine</div>
        </div>

        <div className="card metric-tile">
          <div className="metric-tile-header">
            <span className="tile-label">Row-Level Security (RLS)</span>
            <Database size={18} className="text-emerald" />
          </div>
          <div className="tile-value">Enforced</div>
          <div className="tile-sub">PostgreSQL Defense-in-Depth Layer</div>
        </div>

        <div className="card metric-tile">
          <div className="metric-tile-header">
            <span className="tile-label">Staff Identity Profiles</span>
            <UserCheck size={18} className="text-purple" />
          </div>
          <div className="tile-value">{staffList.length} Accounts</div>
          <div className="tile-sub">Attribute Bound Access Control</div>
        </div>
      </div>

      {/* CP-ABE Attribute Authority Management Section */}
      <div className="card section-card">
        <div className="card-header-bar">
          <div>
            <h3 className="card-title">CP-ABE Attribute Authority Management</h3>
            <p className="card-subtitle">
              Issue, modify, or revoke staff CP-ABE attributes (Role, Clearance Level, Assigned Client Accounts).
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role Attribute</th>
                <th>Clearance Level</th>
                <th>Assigned Client Accounts</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
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

      {/* Access Anomaly Detection Incident Feed */}
      <div className="card section-card">
        <div className="card-header-bar">
          <div>
            <h3 className="card-title">Access Anomaly Detection & Incident Response</h3>
            <p className="card-subtitle">
              Real-time alerts for out-of-scope decryption attempts, off-hours access, and volume spikes.
            </p>
          </div>
        </div>

        <div className="alerts-feed-list">
          {anomalies.map((item) => (
            <div 
              key={item.id}
              className={`clean-alert-item ${item.status === 'RESOLVED' ? 'resolved' : 'pending'}`}
            >
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
                    <span className="alert-time">
                      <Clock size={12} /> {item.timestamp}
                    </span>
                    <span>Target: {item.targetRecord}</span>
                  </div>
                </div>
              </div>

              <div className="alert-item-right">
                {item.status === 'UNREVIEWED' ? (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAcknowledge(item.id)}
                  >
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
                  <label className="field-label">Assigned Role</label>
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
                  <label className="field-label">Clearance Level (1-3)</label>
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
                  <label className="field-label">Assigned Client Accounts</label>
                  <div className="company-toggle-row">
                    {['CORP_ALPHA', 'FINTECH_BETA', 'RETAIL_GAMMA'].map((c) => {
                      const selected = editingStaff.assigned_companies.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`pill-btn ${selected ? 'active' : ''}`}
                          onClick={() => toggleCompany(c)}
                        >
                          {c} {selected ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs text-secondary mt-8">
                    Note: CP-ABE private keys will be automatically regenerated on next decryption event.
                  </span>
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingStaff(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Re-Issue Attributes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
