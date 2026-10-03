import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  User, 
  Filter,
  Check
} from 'lucide-react';

export default function AnomaliesView({ anomalies, setAnomalies }) {
  const [filterUnreviewed, setFilterUnreviewed] = useState(false);

  const handleResolve = (id) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
  };

  const handleResolveAll = () => {
    setAnomalies(prev => prev.map(a => ({ ...a, status: 'RESOLVED' })));
  };

  const unreviewedCount = anomalies.filter(a => a.status === 'UNREVIEWED').length;
  const filtered = filterUnreviewed 
    ? anomalies.filter(a => a.status === 'UNREVIEWED')
    : anomalies;

  return (
    <div className="anomalies-view">
      {/* Top Overview Cards */}
      <div className="overview-row">
        <div className="card overview-card">
          <div className="overview-meta">
            <span className="overview-label">Active Warnings</span>
            <AlertTriangle size={18} className="text-amber" />
          </div>
          <div className="overview-value">{unreviewedCount}</div>
          <div className="overview-sub">Requires security review</div>
        </div>

        <div className="card overview-card">
          <div className="overview-meta">
            <span className="overview-label">Audit Engine Status</span>
            <CheckCircle2 size={18} className="text-emerald" />
          </div>
          <div className="overview-value">Active</div>
          <div className="overview-sub">Real-time CP-ABE log parsing</div>
        </div>

        <div className="card overview-card">
          <div className="overview-meta">
            <span className="overview-label">Rules Evaluated</span>
            <ShieldAlert size={18} className="text-cyan" />
          </div>
          <div className="overview-value">4 Rules</div>
          <div className="overview-sub">Scope, hours, volume, failed attempts</div>
        </div>
      </div>

      {/* Main Alert List Card */}
      <div className="card alerts-container-card">
        <div className="card-header-bar">
          <div>
            <h2 className="card-title">Security Event Feed</h2>
            <p className="card-subtitle">
              Suspicious or policy-violating decryption requests are flagged for review.
            </p>
          </div>

          <div className="header-actions">
            <button
              className={`pill-btn ${filterUnreviewed ? 'active' : ''}`}
              onClick={() => setFilterUnreviewed(!filterUnreviewed)}
            >
              <Filter size={13} />
              {filterUnreviewed ? 'Showing Unreviewed Only' : 'Filter: Unreviewed'}
            </button>
            {unreviewedCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleResolveAll}>
                <Check size={13} /> Mark All Reviewed
              </button>
            )}
          </div>
        </div>

        <div className="alerts-feed-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={36} className="text-emerald" />
              <h3>All Clear</h3>
              <p>No anomalous access attempts are pending review.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div 
                key={item.id}
                className={`clean-alert-item ${item.status === 'RESOLVED' ? 'resolved' : 'pending'}`}
              >
                <div className="alert-item-left">
                  <div className="alert-type-badge">
                    <span className={`badge ${item.severity === 'HIGH' ? 'badge-rose' : 'badge-amber'}`}>
                      {item.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="alert-main-content">
                    <div className="alert-heading">
                      <strong>{item.userName}</strong> ({item.userEmail})
                    </div>
                    <p className="alert-text">{item.description}</p>
                    <div className="alert-footer-info">
                      <span className="alert-time">
                        <Clock size={12} /> {item.timestamp}
                      </span>
                      <span className="alert-target">Target: {item.targetRecord}</span>
                    </div>
                  </div>
                </div>

                <div className="alert-item-right">
                  {item.status === 'UNREVIEWED' ? (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleResolve(item.id)}
                    >
                      <Check size={13} /> Acknowledge
                    </button>
                  ) : (
                    <span className="badge badge-gray">Reviewed</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
