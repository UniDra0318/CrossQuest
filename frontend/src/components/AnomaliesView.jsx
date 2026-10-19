import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  User, 
  Filter,
  Check,
  Moon,
  Eye,
  FileEdit,
  Trash2,
  X,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AnomaliesView({ anomalies, setAnomalies }) {
  const { currentUser, token } = useAuth();
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | NEW | UNDER_REVIEW | CLOSED
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [disposition, setDisposition] = useState('CLOSED_EXPECTED_ACTIVITY');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  const handleOpenReview = (alert) => {
    setSelectedAlert(alert);
    setDisposition(alert.disposition || 'CLOSED_EXPECTED_ACTIVITY');
    setReviewNote(alert.reviewNote || alert.review_note || '');
    setReviewError('');
    setReviewModalOpen(true);
  };

  const handleMarkUnderReview = async () => {
    if (!selectedAlert) return;
    try {
      if (token) {
        await fetch(`http://localhost:8000/api/v1/anomalies/alerts/${selectedAlert.id}/review`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'UNDER_REVIEW' })
        });
      }
    } catch (e) {
      console.warn("Backend alert review update failed:", e);
    }

    setAnomalies(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, status: 'UNDER_REVIEW' } : a));
    setSelectedAlert(prev => ({ ...prev, status: 'UNDER_REVIEW' }));
  };

  const handleCloseAlert = async () => {
    if (!reviewNote.trim()) {
      setReviewError('A review note is required by specification to close an anomaly alert (Section 3.7.5).');
      return;
    }

    try {
      if (token) {
        await fetch(`http://localhost:8000/api/v1/anomalies/alerts/${selectedAlert.id}/review`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'CLOSED',
            disposition: disposition,
            review_note: reviewNote.trim()
          })
        });
      }
    } catch (e) {
      console.warn("Backend alert close failed:", e);
    }

    setAnomalies(prev => prev.map(a => a.id === selectedAlert.id ? {
      ...a,
      status: 'CLOSED',
      disposition: disposition,
      reviewNote: reviewNote.trim()
    } : a));

    setReviewModalOpen(false);
    setSelectedAlert(null);
  };

  const newCount = anomalies.filter(a => a.status === 'NEW' || a.status === 'UNREVIEWED').length;
  const underReviewCount = anomalies.filter(a => a.status === 'UNDER_REVIEW').length;
  const closedCount = anomalies.filter(a => a.status === 'CLOSED' || a.status === 'RESOLVED').length;

  const filtered = anomalies.filter(item => {
    const itemStatus = item.status === 'UNREVIEWED' ? 'NEW' : (item.status === 'RESOLVED' ? 'CLOSED' : item.status);
    if (filterStatus === 'ALL') return true;
    return itemStatus === filterStatus;
  });

  const getRuleBadge = (code) => {
    const rule = code || '';
    if (rule.includes('DELETION')) return { label: 'R4-a Deletion', class: 'badge-rose' };
    if (rule.includes('EDIT')) return { label: 'R4-b Record Edit', class: 'badge-amber' };
    if (rule.includes('REPEATED_OUT_OF_SCOPE')) return { label: 'R1-b Repeated Out-of-Scope', class: 'badge-purple' };
    if (rule.includes('OUT_OF_SCOPE')) return { label: 'R1-a Out-of-Scope', class: 'badge-amber' };
    if (rule.includes('FAILED_LOGINS')) return { label: 'R2 Failed Logins', class: 'badge-amber' };
    if (rule.includes('HIGH_RECORD') || rule.includes('VOLUME')) return { label: 'R3 High Volume', class: 'badge-purple' };
    if (rule.includes('REPORT_BURSTS')) return { label: 'R3-b Report Burst', class: 'badge-purple' };
    return { label: rule || 'Security Event', class: 'badge-cyan' };
  };

  return (
    <div className="anomalies-view">
      {/* Top Overview Cards */}
      <div className="overview-row">
        <div className="card overview-card">
          <div className="overview-meta">
            <span className="overview-label">New Alerts</span>
            <AlertTriangle size={18} className="text-amber" />
          </div>
          <div className="overview-value">{newCount}</div>
          <div className="overview-sub">Awaiting Administrator Review</div>
        </div>

        <div className="card overview-card">
          <div className="overview-meta">
            <span className="overview-label">Under Investigation</span>
            <Clock size={18} className="text-cyan" />
          </div>
          <div className="overview-value">{underReviewCount}</div>
          <div className="overview-sub">Active inquiry in progress</div>
        </div>

        <div className="card overview-card">
          <div className="overview-meta">
            <span className="overview-label">Evaluator Rules</span>
            <ShieldAlert size={18} className="text-emerald" />
          </div>
          <div className="overview-value">Rules R1–R4 + S1</div>
          <div className="overview-sub">Scope, Volume, Logins, Mod, S1 Tag</div>
        </div>
      </div>

      {/* Main Alert List Card */}
      <div className="card alerts-container-card">
        <div className="card-header-bar">
          <div>
            <h2 className="card-title">Access Anomaly & Audit Feed</h2>
            <p className="card-subtitle">
              Predefined rule- and threshold-based indicators (Chapter III Section 3.7). No automatic account lock-outs.
            </p>
          </div>

          <div className="header-actions">
            <div className="pill-filters">
              {['ALL', 'NEW', 'UNDER_REVIEW', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  className={`pill-btn ${filterStatus === st ? 'active' : ''}`}
                  onClick={() => setFilterStatus(st)}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="alerts-feed-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={36} className="text-emerald" />
              <h3>All Monitored Events Clear</h3>
              <p>No anomalous access patterns match the selected lifecycle filter.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const ruleMeta = getRuleBadge(item.ruleCode || item.type);
              const normalizedStatus = item.status === 'UNREVIEWED' ? 'NEW' : (item.status === 'RESOLVED' ? 'CLOSED' : item.status);
              const hasAfterHours = (item.tags || []).includes('after_hours') || item.type === 'OFF_HOURS';

              return (
                <div 
                  key={item.id}
                  className={`clean-alert-item ${normalizedStatus.toLowerCase()}`}
                >
                  <div className="alert-item-left">
                    <div className="alert-type-badge-col">
                      <span className={`badge ${ruleMeta.class}`}>
                        {ruleMeta.label}
                      </span>
                      <span className={`badge ${item.severity === 'CRITICAL' || item.severity === 'HIGH' ? 'badge-rose' : 'badge-amber'}`}>
                        {item.severity}
                      </span>
                      {hasAfterHours && (
                        <span className="badge badge-purple" title="Triggered outside normal hours (Mon-Fri 09:00-18:00 PHT). +1 Severity applied.">
                          <Moon size={10} style={{ marginRight: 4 }} /> S1 After-Hours
                        </span>
                      )}
                    </div>

                    <div className="alert-main-content">
                      <div className="alert-heading">
                        <strong>{item.userName || 'System User'}</strong> ({item.userEmail || 'system@crossworks.ph'})
                        {item.eventCount > 1 && (
                          <span className="event-count-chip">{item.eventCount} aggregated events</span>
                        )}
                      </div>
                      <p className="alert-text">{item.description}</p>
                      
                      {item.disposition && (
                        <div className="alert-disposition-box">
                          <span className="disp-label">Disposition:</span>
                          <span className="disp-val">{item.disposition.replace(/_/g, ' ')}</span>
                          {item.reviewNote && <p className="disp-note">"{item.reviewNote}"</p>}
                        </div>
                      )}

                      <div className="alert-footer-info">
                        <span className="alert-time">
                          <Clock size={12} /> {item.timestamp}
                        </span>
                        {item.targetRecord && (
                          <span className="alert-target">Target: {item.targetRecord}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="alert-item-right">
                    {normalizedStatus === 'CLOSED' ? (
                      <span className="badge badge-gray">Closed</span>
                    ) : (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenReview(item)}
                      >
                        <Eye size={13} /> Review Alert
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Administrator Review Modal (Section 3.7.5) */}
      {reviewModalOpen && selectedAlert && (
        <div className="modal-backdrop">
          <div className="modal-box modal-medium">
            <div className="modal-header">
              <div className="modal-header-info">
                <h3>Administrator Security Review</h3>
                <p>Alert ID: {selectedAlert.id} | Rule: {selectedAlert.ruleCode || selectedAlert.type}</p>
              </div>
              <button className="icon-btn-close" onClick={() => setReviewModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="review-context-card">
                <div className="review-row">
                  <span className="label">Subject User:</span>
                  <span className="val">{selectedAlert.userName} ({selectedAlert.userEmail})</span>
                </div>
                <div className="review-row">
                  <span className="label">Triggered At:</span>
                  <span className="val">{selectedAlert.timestamp}</span>
                </div>
                <div className="review-row">
                  <span className="label">Current Status:</span>
                  <span className="val badge badge-cyan">{selectedAlert.status}</span>
                </div>
                <div className="review-row">
                  <span className="label">Description:</span>
                  <span className="val">{selectedAlert.description}</span>
                </div>
              </div>

              {selectedAlert.status !== 'UNDER_REVIEW' && (
                <div className="review-action-banner">
                  <p>Investigating this user activity further?</p>
                  <button className="btn btn-secondary btn-sm" onClick={handleMarkUnderReview}>
                    Mark Under Review
                  </button>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">
                  Review Disposition <span className="text-rose">*</span>
                </label>
                <select 
                  className="form-control"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                >
                  <option value="CLOSED_EXPECTED_ACTIVITY">
                    Closed, expected activity (e.g. planned testing, authorized client transition)
                  </option>
                  <option value="CLOSED_FOLLOW_UP_REQUIRED">
                    Closed, follow-up required (internal inquiry or policy clarification needed)
                  </option>
                </select>
                <span className="help-text">
                  Note: Anomaly alerts never determine malice or automatically lock out accounts (SEC-15).
                </span>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">
                  Reviewer Justification & Notes <span className="text-rose">* (Required)</span>
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Provide detailed justification for the disposition recorded..."
                  value={reviewNote}
                  onChange={(e) => {
                    setReviewNote(e.target.value);
                    setReviewError('');
                  }}
                />
                {reviewError && <div className="form-error-msg">{reviewError}</div>}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCloseAlert}>
                <FileCheck size={14} /> Close Alert with Disposition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
