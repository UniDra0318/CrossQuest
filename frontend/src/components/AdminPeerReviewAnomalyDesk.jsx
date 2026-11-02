import React, { useState, useEffect, useMemo } from 'react';
import { TableEmptyRow } from './TableEmptyState';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Filter, 
  Search, 
  RefreshCw, 
  Lock, 
  Eye, 
  Sliders, 
  Database, 
  Trash2, 
  FileText, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle,
  ShieldCheck,
  History,
  Archive
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  fetchAnomalies, 
  reviewAnomalyAlert, 
  fetchAccessLogs, 
  fetchAnomalyRules, 
  updateAnomalyRule, 
  runRetentionJob, 
  fetchRetentionWarnings 
} from '../services/api';

export default function AdminPeerReviewAnomalyDesk() {
  const { token, currentUser } = useAuth();
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const themeStyles = {
    cardBg: isDark ? '#111827' : '#ffffff',
    panelBg: isDark ? '#111827' : '#ffffff',
    panelBorder: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
    borderSubtle: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9',
    inputBg: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    inputText: isDark ? '#f8fafc' : '#1e293b',
    textMain: isDark ? '#f8fafc' : '#1e293b',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    textSub: isDark ? '#cbd5e1' : '#475569',
    tableThBg: isDark ? '#0f172a' : '#f8fafc',
    tableThColor: isDark ? '#94a3b8' : '#475569',
    tableBorder: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
    chipBg: isDark ? '#1e293b' : '#f1f5f9',
    chipText: isDark ? '#cbd5e1' : '#475569',
    subtleBox: isDark ? '#0f172a' : '#f8fafc',
    subtleBoxBorder: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
  };

  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'audit_trail' | 'rules' | 'retention'

  // Queue state
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Review Modal state
  const [selectedAlertForReview, setSelectedAlertForReview] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('CLOSED');
  const [reviewDisposition, setReviewDisposition] = useState('CLOSED_EXPECTED_ACTIVITY');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [actionSuccessToast, setActionSuccessToast] = useState(null);

  // Audit Logs state
  const [accessLogs, setAccessLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Rules state
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleParamInput, setRuleParamInput] = useState('');
  const [ruleReason, setRuleReason] = useState('');
  const [ruleClientReviewed, setRuleClientReviewed] = useState(true);
  const [submittingRule, setSubmittingRule] = useState(false);

  // Retention state
  const [retentionWarnings, setRetentionWarnings] = useState([]);
  const [retentionJobResult, setRetentionJobResult] = useState(null);
  const [runningRetention, setRunningRetention] = useState(false);

  // Load Alerts
  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const data = await fetchAnomalies(token);
      if (data && Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (err) {
      console.warn('Could not load anomaly alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Load Logs
  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchAccessLogs(150, token);
      if (data && Array.isArray(data)) {
        setAccessLogs(data);
      }
    } catch (err) {
      console.warn('Could not load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load Rules
  const loadRules = async () => {
    setLoadingRules(true);
    try {
      const data = await fetchAnomalyRules(token);
      if (data && Array.isArray(data)) {
        setRules(data);
      }
    } catch (err) {
      console.warn('Could not load anomaly rules:', err);
    } finally {
      setLoadingRules(false);
    }
  };

  // Load Retention Warnings
  const loadRetentionWarnings = async () => {
    try {
      const data = await fetchRetentionWarnings(token);
      if (data && Array.isArray(data)) {
        setRetentionWarnings(data);
      }
    } catch (err) {
      console.warn('Could not load retention warnings:', err);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadLogs();
    loadRules();
    loadRetentionWarnings();
  }, [token]);

  // Open Review Modal
  const openReviewModal = (alert) => {
    setSelectedAlertForReview(alert);
    setReviewStatus(alert.status === 'NEW' ? 'UNDER_REVIEW' : 'CLOSED');
    setReviewDisposition(alert.disposition || 'CLOSED_EXPECTED_ACTIVITY');
    setReviewNote(alert.review_note || '');
    setReviewError(null);
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedAlertForReview) return;
    if (!reviewNote.trim()) {
      setReviewError('A detailed review sign-off note is strictly mandatory (Section 3.7.5).');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    const payload = {
      status: reviewStatus,
      review_note: reviewNote.trim()
    };

    if (reviewStatus === 'CLOSED') {
      payload.disposition = reviewDisposition;
    }

    try {
      const updated = await reviewAnomalyAlert(selectedAlertForReview.id, payload, token);
      setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
      setActionSuccessToast(`Alert ${updated.id.slice(0, 8)}... successfully updated to ${updated.status}.`);
      setSelectedAlertForReview(null);
      // Refresh logs
      loadLogs();
    } catch (err) {
      console.error('Review submission error:', err);
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Open Edit Rule Modal
  const openEditRuleModal = (rule) => {
    setEditingRule(rule);
    setRuleParamInput(JSON.stringify(rule.parameters || {}, null, 2));
    setRuleClientReviewed(Boolean(rule.client_reviewed));
    setRuleReason(`Threshold updated by ${currentUser?.name || 'Administrator'} (OI-08)`);
  };

  // Save Rule Update
  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!editingRule) return;

    let parsedParams;
    try {
      parsedParams = JSON.parse(ruleParamInput);
    } catch (err) {
      alert('Invalid JSON in parameters field.');
      return;
    }

    setSubmittingRule(true);
    try {
      const updated = await updateAnomalyRule(editingRule.rule_code, {
        parameters: parsedParams,
        client_reviewed: ruleClientReviewed,
        reason: ruleReason
      }, token);
      setRules(prev => prev.map(r => r.rule_code === updated.rule_code ? updated : r));
      setActionSuccessToast(`Rule ${updated.rule_code} parameters updated to v${updated.version_no}.`);
      setEditingRule(null);
      loadLogs();
    } catch (err) {
      alert(err.message || 'Failed to update rule parameters.');
    } finally {
      setSubmittingRule(false);
    }
  };

  // Execute Retention Job
  const handleExecuteRetention = async () => {
    if (!confirm('Execute statutory 12-month retention purge now? Old logs and closed alerts exceeding 365 days will be purged, and approaching alerts warned (OI-20).')) {
      return;
    }
    setRunningRetention(true);
    try {
      const res = await runRetentionJob(token);
      setRetentionJobResult(res);
      setActionSuccessToast(`Retention job executed: ${res.audit_logs_purged} audit logs & ${res.closed_alerts_purged} alerts purged.`);
      loadAlerts();
      loadLogs();
      loadRetentionWarnings();
    } catch (err) {
      alert(err.message || 'Retention job execution failed.');
    } finally {
      setRunningRetention(false);
    }
  };

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      // Status filter
      if (statusFilter === 'UNREVIEWED' && a.status === 'CLOSED') return false;
      if (statusFilter !== 'ALL' && statusFilter !== 'UNREVIEWED' && a.status !== statusFilter) return false;

      // Severity filter
      if (severityFilter !== 'ALL' && (a.severity_final || a.severity_base) !== severityFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ruleMatch = (a.rule_code || '').toLowerCase().includes(q);
        const descMatch = (a.description || '').toLowerCase().includes(q);
        const tagMatch = (a.tags || []).some(t => t.toLowerCase().includes(q));
        const statusMatch = (a.status || '').toLowerCase().includes(q);
        if (!ruleMatch && !descMatch && !tagMatch && !statusMatch) return false;
      }
      return true;
    });
  }, [alerts, statusFilter, severityFilter, searchQuery]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return accessLogs.filter(log => {
      if (logFilter !== 'ALL' && log.event_type !== logFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const typeMatch = (log.event_type || '').toLowerCase().includes(q);
        const actorMatch = (log.actor_role || '').toLowerCase().includes(q);
        const resMatch = (log.resource_type || '').toLowerCase().includes(q);
        const ipMatch = (log.source_ip || '').toLowerCase().includes(q);
        if (!typeMatch && !actorMatch && !resMatch && !ipMatch) return false;
      }
      return true;
    });
  }, [accessLogs, logFilter, logSearch]);

  const unreviewedCount = alerts.filter(a => a.status !== 'CLOSED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. TOP SUB-NAVIGATION TABS */}
      <div 
        className="adm-panel" 
        style={{ 
          background: themeStyles.panelBg, 
          borderRadius: '20px', 
          padding: '12px 20px', 
          border: themeStyles.panelBorder,
          boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.3)' : '0 4px 18px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'queue' ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'queue' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              border: activeTab === 'queue' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              boxShadow: activeTab === 'queue' ? '0 4px 12px rgba(225, 29, 72, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldAlert size={15} />
            <span>Anomaly & Incident Queue</span>
            {unreviewedCount > 0 && (
              <span style={{ background: activeTab === 'queue' ? '#ffffff' : '#e11d48', color: activeTab === 'queue' ? '#be123c' : '#ffffff', padding: '1px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                {unreviewedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit_trail')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: activeTab === 'audit_trail' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              cursor: 'pointer',
              background: activeTab === 'audit_trail' ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'audit_trail' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              boxShadow: activeTab === 'audit_trail' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <History size={15} />
            <span>Master Audit Trail ({accessLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: activeTab === 'rules' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              cursor: 'pointer',
              background: activeTab === 'rules' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'rules' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              boxShadow: activeTab === 'rules' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={15} />
            <span>Anomaly Rules ({rules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('retention')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: activeTab === 'retention' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              cursor: 'pointer',
              background: activeTab === 'retention' ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'retention' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              boxShadow: activeTab === 'retention' ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Archive size={15} />
            <span>12-Month Retention Engine (OI-20)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => { loadAlerts(); loadLogs(); loadRules(); loadRetentionWarnings(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: isDark ? '#1e293b' : '#f8fafc',
            border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
            color: isDark ? '#cbd5e1' : '#475569',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} className={loadingAlerts || loadingLogs ? 'spin-animation' : ''} />
          <span>Sync All</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessToast && (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{actionSuccessToast}</span>
          </div>
          <button type="button" onClick={() => setActionSuccessToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* =======================================================================
          TAB 1: ANOMALY & INCIDENT QUEUE (WITH PEER REVIEW ENFORCEMENT)
          ======================================================================= */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Radar Telemetry Banner */}
          <div className="adm-pad" style={{ background: '#120726', padding: '28px 24px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="adm-pill adm-pill--green" style={{ marginBottom: '8px' }}>
                  <span className="adm-live" /> REAL-TIME RADAR TELEMETRY ACTIVE
                </span>
                <h2 style={{ margin: '6px 0 4px 0', color: '#ffffff', fontSize: '20px', fontWeight: 800 }}>
                  Peer-Review Incident Resolution Workbench (FR-21, OI-30)
                </h2>
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px' }}>
                  Strict multi-administrator conflict-of-interest enforcement. Peer sign-off required for all security disposals.
                </p>
              </div>

              {/* Quick stats in banner */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '10px 18px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                  <div style={{ color: '#fda4af', fontSize: '20px', fontWeight: 800 }}>{unreviewedCount}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Review</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '10px 18px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                  <div style={{ color: '#86efac', fontSize: '20px', fontWeight: 800 }}>{alerts.filter(a => a.status === 'CLOSED').length}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Closed & Signed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div 
            style={{ 
              background: themeStyles.cardBg, 
              borderRadius: '16px', 
              padding: '14px 20px', 
              border: themeStyles.panelBorder, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '14px',
              position: 'sticky',
              top: '10px',
              zIndex: 10,
              boxShadow: isDark ? '0 6px 20px rgba(0, 0, 0, 0.4)' : '0 4px 16px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Left: Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textMuted }}>STATUS:</span>
              {['ALL', 'NEW', 'UNDER_REVIEW', 'AWAITING_UNINVOLVED_ADMIN', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    background: statusFilter === st ? (isDark ? '#6366f1' : '#1e293b') : themeStyles.inputBg,
                    color: statusFilter === st ? '#ffffff' : themeStyles.textSub,
                    borderColor: statusFilter === st ? (isDark ? '#818cf8' : '#1e293b') : themeStyles.inputBorder
                  }}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
              <span 
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 800, 
                  padding: '3px 10px', 
                  borderRadius: '20px', 
                  background: themeStyles.chipBg, 
                  color: themeStyles.chipText, 
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  marginLeft: '4px' 
                }}
              >
                {filteredAlerts.length} {filteredAlerts.length === 1 ? 'INCIDENT' : 'INCIDENTS'}
              </span>
            </div>

            {/* Right: Search */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: themeStyles.textMuted }} />
              <input
                type="text"
                placeholder="Search rule, subject, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '10px',
                  border: themeStyles.inputBorder,
                  fontSize: '12.5px',
                  color: themeStyles.inputText,
                  background: themeStyles.inputBg,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Alerts Feed (Contained & Scrollable) */}
          <div 
            className="adm-scroll"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '14px',
              maxHeight: 'clamp(480px, calc(100vh - 360px), 720px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '6px 10px 16px 4px',
              border: 'none',
              borderRadius: '16px',
              scrollbarWidth: 'thin'
            }}
          >
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => {
                const isClosed = alert.status === 'CLOSED';
                const isSubject = alert.subject_user_id && alert.subject_user_id === currentUser?.id;
                const meta = alert.metadata_info || {};
                const involvedAdmins = meta.involved_admin_ids || [];
                const isRecused = alert.status === 'AWAITING_UNINVOLVED_ADMIN' && (involvedAdmins.includes(currentUser?.id) || isSubject);

                const severity = alert.severity_final || alert.severity_base || 'LOW';
                const sevColor = severity === 'HIGH' ? '#e11d48' : severity === 'MEDIUM' ? '#d97706' : '#0284c7';
                const sevBg = severity === 'HIGH' 
                  ? (isDark ? 'rgba(225, 29, 72, 0.2)' : '#ffe4e6') 
                  : severity === 'MEDIUM' 
                  ? (isDark ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7') 
                  : (isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe');

                return (
                  <div
                    key={alert.id}
                    style={{
                      background: themeStyles.cardBg,
                      borderRadius: '20px',
                      padding: '22px 26px',
                      border: isClosed 
                        ? themeStyles.panelBorder 
                        : `1.5px solid ${sevColor}`,
                      boxShadow: isClosed ? 'none' : (isDark ? '0 6px 20px rgba(0,0,0,0.35)' : '0 6px 20px rgba(0,0,0,0.04)'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      position: 'relative'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span 
                          style={{ 
                            background: sevBg, 
                            color: sevColor, 
                            padding: '4px 10px', 
                            borderRadius: '12px', 
                            fontSize: '11.5px', 
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            border: isDark ? `1px solid ${sevColor}` : 'none'
                          }}
                        >
                          {severity} SEVERITY
                        </span>
                        <strong style={{ fontSize: '15px', color: themeStyles.textMain }}>
                          {alert.rule_code}
                        </strong>
                        <span style={{ fontSize: '12px', color: themeStyles.textMuted, fontFamily: 'monospace' }}>
                          ALERT-ID: {alert.id.slice(0, 12)}...
                        </span>
                        {alert.after_hours_tag && (
                          <span style={{ 
                            background: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', 
                            color: isDark ? '#fbbf24' : '#b45309', 
                            border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : 'none',
                            padding: '3px 8px', 
                            borderRadius: '8px', 
                            fontSize: '11px', 
                            fontWeight: 700 
                          }}>
                            🌙 AFTER HOURS
                          </span>
                        )}
                      </div>

                      {/* Status Chip */}
                      <div>
                        <span 
                          style={{ 
                            background: isClosed 
                              ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') 
                              : alert.status === 'UNDER_REVIEW' 
                              ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff') 
                              : alert.status === 'AWAITING_UNINVOLVED_ADMIN' 
                              ? (isDark ? 'rgba(168, 85, 247, 0.2)' : '#faf5ff') 
                              : (isDark ? 'rgba(225, 29, 72, 0.2)' : '#fff1f2'),
                            color: isClosed 
                              ? (isDark ? '#34d399' : '#047857') 
                              : alert.status === 'UNDER_REVIEW' 
                              ? (isDark ? '#93c5fd' : '#1d4ed8') 
                              : alert.status === 'AWAITING_UNINVOLVED_ADMIN' 
                              ? (isDark ? '#d8b4fe' : '#6b21a8') 
                              : (isDark ? '#fda4af' : '#be123c'),
                            border: isDark 
                              ? (isClosed 
                                  ? '1px solid rgba(5, 150, 105, 0.35)' 
                                  : alert.status === 'UNDER_REVIEW' 
                                  ? '1px solid rgba(59, 130, 246, 0.35)' 
                                  : alert.status === 'AWAITING_UNINVOLVED_ADMIN' 
                                  ? '1px solid rgba(168, 85, 247, 0.35)' 
                                  : '1px solid rgba(225, 29, 72, 0.35)') 
                              : 'none',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          {isClosed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                          {alert.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Alert Description */}
                    <p style={{ margin: 0, fontSize: '14px', color: themeStyles.textSub, lineHeight: 1.5 }}>
                      {alert.description}
                    </p>

                    {/* Metadata Badges & Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: themeStyles.textMuted }}>
                        Subject User ID: <code style={{ color: isDark ? '#38bdf8' : '#1e293b', fontWeight: 600 }}>{alert.subject_user_id || 'SYSTEM'}</code>
                      </span>
                      <span style={{ fontSize: '12px', color: themeStyles.textMuted }}>•</span>
                      <span style={{ fontSize: '12px', color: themeStyles.textMuted }}>
                        Event Count: <strong style={{ color: themeStyles.textMain }}>{alert.event_count || 1}</strong>
                      </span>
                      <span style={{ fontSize: '12px', color: themeStyles.textMuted }}>•</span>
                      <span style={{ fontSize: '12px', color: themeStyles.textMuted, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Recent'}
                      </span>
                      {(alert.tags || []).map(tag => (
                        <span key={tag} style={{ 
                          background: themeStyles.chipBg, 
                          color: themeStyles.chipText, 
                          border: isDark ? '1px solid #334155' : 'none',
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: 600 
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Reviewer Note Box if Already Reviewed */}
                    {(alert.review_note || alert.disposition) && (
                      <div style={{ background: themeStyles.subtleBox, borderRadius: '12px', padding: '12px 16px', border: themeStyles.subtleBoxBorder, fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          {alert.disposition && (
                            <strong style={{ color: alert.disposition === 'CLOSED_EXPECTED_ACTIVITY' ? (isDark ? '#34d399' : '#047857') : (isDark ? '#f87171' : '#b91c1c') }}>
                              Disposition: {alert.disposition}
                            </strong>
                          )}
                          {alert.reviewed_at && (
                            <span style={{ color: themeStyles.textMuted }}>
                              • Reviewed on {new Date(alert.reviewed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, color: themeStyles.textSub, fontStyle: 'italic' }}>
                          "{alert.review_note}"
                        </p>
                      </div>
                    )}

                    {/* Peer Review Security Gate & Action Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '6px', borderTop: themeStyles.borderSubtle }}>
                      {/* Conflict-of-Interest Warning for Subject Admin */}
                      {isSubject ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#fb7185' : '#be123c', fontSize: '12.5px', fontWeight: 700 }}>
                          <Lock size={15} />
                          <span>⚠️ CONFLICT OF INTEREST (OI-30): You are the subject of this alert. Peer Administrator review required.</span>
                        </div>
                      ) : isRecused ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#c084fc' : '#7e22ce', fontSize: '12.5px', fontWeight: 700 }}>
                          <Lock size={15} />
                          <span>⚠️ RECUSAL ACTIVE: You are marked as an involved administrator. Uninvolved peer must sign off.</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: themeStyles.textMuted }}>
                          {isClosed ? 'Resolved and archived with cryptographic audit log.' : 'Requires formal Peer Administrator evaluation & sign-off.'}
                        </div>
                      )}

                      {/* Action Button */}
                      <div>
                        {isSubject || isRecused ? (
                          <button
                            type="button"
                            disabled
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              background: themeStyles.chipBg,
                              color: themeStyles.textMuted,
                              border: themeStyles.subtleBoxBorder,
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Lock size={13} />
                            <span>Recused from Review</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openReviewModal(alert)}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '10px',
                              background: isClosed 
                                ? (isDark ? '#1e293b' : '#f8fafc') 
                                : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                              color: isClosed ? themeStyles.textMain : '#ffffff',
                              border: isClosed ? themeStyles.inputBorder : (isDark ? '1px solid #334155' : 'none'),
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: isClosed ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.2)'
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>{isClosed ? 'Reopen / Update Review' : 'Review & Sign Off'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ background: themeStyles.cardBg, borderRadius: '20px', padding: '40px', textAlign: 'center', border: themeStyles.panelBorder }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ margin: 0, color: themeStyles.textMain }}>No Anomaly Alerts Pending</h3>
                <p style={{ margin: '6px 0 0 0', color: themeStyles.textMuted, fontSize: '13.5px' }}>
                  All access requests are currently within normal policy thresholds.
                </p>
              </div>
            )}
            {filteredAlerts.length > 3 && (
              <div style={{ textAlign: 'center', padding: '12px 0 6px 0', color: '#94a3b8', fontSize: '12px' }}>
                End of {filteredAlerts.length} incident records &bull; Real-time audit telemetry active
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 2: MASTER SECURITY AUDIT TRAIL (access_logs)
          ======================================================================= */}
      {activeTab === 'audit_trail' && (
        <div className="adm-panel" style={{ background: themeStyles.panelBg, borderRadius: '24px', border: themeStyles.panelBorder, overflow: 'hidden' }}>
          <div className="adm-panel__head" style={{ padding: '20px 24px', borderBottom: themeStyles.panelBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: themeStyles.textMain }}>Append-Only Security Audit Trail (SEC-12, SEC-13)</h3>
              <span className="adm-mono" style={{ fontSize: '12px', color: themeStyles.textMuted }}>
                Immutable ledger of all decryption, report generation, and administrative actions
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: themeStyles.inputBorder, fontSize: '12.5px', background: themeStyles.inputBg, color: themeStyles.inputText, outline: 'none' }}
              >
                <option value="ALL">All Event Types</option>
                <option value="REPORT_GENERATED">REPORT_GENERATED</option>
                <option value="ACCESS_DENIED">ACCESS_DENIED</option>
                <option value="ALERT_REVIEWED">ALERT_REVIEWED</option>
                <option value="RULE_MODIFIED">RULE_MODIFIED</option>
                <option value="RECORD_DELETED">RECORD_DELETED</option>
              </select>

              <input
                type="text"
                placeholder="Search audit logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: themeStyles.inputBorder, fontSize: '12.5px', background: themeStyles.inputBg, color: themeStyles.inputText, outline: 'none' }}
              />
            </div>
          </div>

          <div className="adm-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: themeStyles.tableThBg, borderBottom: themeStyles.tableBorder, color: themeStyles.tableThColor, fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 20px' }}>Timestamp (UTC+8)</th>
                  <th style={{ padding: '12px 16px' }}>Actor & Role</th>
                  <th style={{ padding: '12px 16px' }}>Event Type</th>
                  <th style={{ padding: '12px 16px' }}>Resource</th>
                  <th style={{ padding: '12px 16px' }}>Outcome</th>
                  <th style={{ padding: '12px 16px' }}>IP Address</th>
                  <th style={{ padding: '12px 20px' }}>Details / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const isSuccess = log.outcome === 'SUCCESS';
                    return (
                      <tr key={log.id} style={{ borderBottom: themeStyles.borderSubtle }}>
                        <td style={{ padding: '12px 20px', fontFamily: 'monospace', color: themeStyles.textMuted }}>
                          {log.occurred_at ? new Date(log.occurred_at).toLocaleString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 600, color: themeStyles.textMain }}>{log.actor_role}</span>
                          <div style={{ fontSize: '11px', color: themeStyles.textMuted, fontFamily: 'monospace' }}>
                            {log.actor_user_id ? log.actor_user_id.slice(0, 8) : 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: themeStyles.textMain }}>
                          {log.event_type}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            background: themeStyles.subtleBox, 
                            color: isDark ? '#a5b4fc' : '#334155', 
                            border: themeStyles.subtleBoxBorder, 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11.5px', 
                            fontFamily: 'monospace' 
                          }}>
                            {log.resource_type || 'N/A'}:{log.resource_id ? log.resource_id.slice(0, 6) : ''}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span 
                            style={{ 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: 800,
                              background: isSuccess 
                                ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') 
                                : (isDark ? 'rgba(225, 29, 72, 0.2)' : '#fff1f2'),
                              color: isSuccess 
                                ? (isDark ? '#34d399' : '#047857') 
                                : (isDark ? '#fb7185' : '#be123c'),
                              border: isDark 
                                ? (isSuccess ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid rgba(225, 29, 72, 0.35)') 
                                : 'none'
                            }}
                          >
                            {log.outcome}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: themeStyles.textMuted }}>
                          {log.source_ip || '127.0.0.1'}
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: '12px', color: themeStyles.textSub, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.reason_code ? `[${log.reason_code}] ` : ''}
                          {JSON.stringify(log.details || {})}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <TableEmptyRow
                    colSpan={7}
                    icon={History}
                    title="No Security Audit Trail Records"
                    subtitle="No cryptographic events match the selected event type filter or search parameters."
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 3: ANOMALY RULES & THRESHOLD MANAGEMENT (FIGURE 10, TABLE 22)
          ======================================================================= */}
      {activeTab === 'rules' && (
        <div className="adm-panel" style={{ background: themeStyles.panelBg, borderRadius: '24px', border: themeStyles.panelBorder, overflow: 'hidden' }}>
          <div className="adm-panel__head" style={{ padding: '20px 24px', borderBottom: themeStyles.panelBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: themeStyles.textMain }}>Rule-Based Detection Parameters & Client Review (OI-08)</h3>
              <span className="adm-mono" style={{ fontSize: '12px', color: themeStyles.textMuted }}>
                Threshold configuration for access frequency, failed authentications, burst decryptions, and after-hours activities
              </span>
            </div>
            <span className="adm-chip adm-chip--green">
              <ShieldCheck size={12} /> {rules.length} ACTIVE RULES
            </span>
          </div>

          <div className="adm-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: themeStyles.tableThBg, borderBottom: themeStyles.tableBorder, color: themeStyles.tableThColor, fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 20px' }}>Rule Code</th>
                  <th style={{ padding: '12px 16px' }}>Rule Description</th>
                  <th style={{ padding: '12px 16px' }}>Threshold Parameters</th>
                  <th style={{ padding: '12px 16px' }}>Version</th>
                  <th style={{ padding: '12px 16px' }}>Client Approved</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rules && rules.length > 0 ? (
                  rules.map((rule) => (
                  <tr key={rule.rule_code} style={{ borderBottom: themeStyles.borderSubtle }}>
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: themeStyles.textMain }}>
                      {rule.rule_code}
                    </td>
                    <td style={{ padding: '14px 16px', color: themeStyles.textSub }}>
                      {rule.description}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <pre style={{ 
                        margin: 0, 
                        fontSize: '11.5px', 
                        background: themeStyles.subtleBox, 
                        color: isDark ? '#a5b4fc' : '#1e293b', 
                        border: themeStyles.subtleBoxBorder, 
                        padding: '6px 10px', 
                        borderRadius: '6px', 
                        fontFamily: 'monospace', 
                        maxWidth: '280px', 
                        overflow: 'hidden' 
                      }}>
                        {JSON.stringify(rule.parameters || {}, null, 1)}
                      </pre>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: themeStyles.textMain }}>
                      v{rule.version_no}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span 
                        style={{ 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          background: rule.client_reviewed 
                            ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') 
                            : (isDark ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7'),
                          color: rule.client_reviewed 
                            ? (isDark ? '#34d399' : '#047857') 
                            : (isDark ? '#fbbf24' : '#b45309'),
                          border: isDark 
                            ? (rule.client_reviewed ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid rgba(217, 119, 6, 0.35)') 
                            : 'none'
                        }}
                      >
                        {rule.client_reviewed ? 'Approved ✓' : 'Pending Review'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => openEditRuleModal(rule)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: themeStyles.inputBg,
                          border: themeStyles.inputBorder,
                          color: themeStyles.textMain,
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Tune Threshold
                      </button>
                    </td>
                  </tr>
                ))
                ) : (
                  <TableEmptyRow
                    colSpan={6}
                    icon={Sliders}
                    title="No Detection Parameter Rules Configured"
                    subtitle="Default baseline thresholds are currently being applied. No custom client-reviewed rules active."
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 4: 12-MONTH RETENTION & DISPOSAL ENGINE (OI-20)
          ======================================================================= */}
      {activeTab === 'retention' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div 
            style={{ 
              background: themeStyles.cardBg, 
              borderRadius: '24px', 
              padding: '24px 28px', 
              border: themeStyles.panelBorder,
              boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.3)' : '0 4px 18px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="adm-pill adm-pill--purple" style={{ marginBottom: '8px' }}>
                  STATUTORY COMPLIANCE: SECTION 3.7.5 & OI-20
                </span>
                <h2 style={{ margin: '6px 0', fontSize: '20px', fontWeight: 800, color: themeStyles.textMain }}>
                  12-Month Audit Log & Closed Alert Retention Policy
                </h2>
                <p style={{ margin: 0, color: themeStyles.textSub, fontSize: '13.5px', maxWidth: '680px', lineHeight: 1.5 }}>
                  Philippine Data Privacy Act (DPA 2012) and enterprise client agreements mandate disposal of audit logs and closed incident records older than 365 days. Alerts approaching 12 months enter a 30-day proactive warning cycle.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExecuteRetention}
                disabled={runningRetention}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: runningRetention ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                }}
              >
                <Trash2 size={15} />
                <span>{runningRetention ? 'Executing Purge Job...' : 'Execute Retention Job (Purge >365d)'}</span>
              </button>
            </div>

            {/* Retention Result Banner */}
            {retentionJobResult && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#faf5ff', borderRadius: '14px', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <CheckCircle2 size={24} color="#7c3aed" />
                <div>
                  <strong style={{ color: '#581c87', fontSize: '14px' }}>Retention Job Completed Successfully</strong>
                  <div style={{ fontSize: '13px', color: '#6b21a8', marginTop: '2px' }}>
                    Audit logs purged: <b>{retentionJobResult.audit_logs_purged}</b> • Closed alerts purged: <b>{retentionJobResult.closed_alerts_purged}</b> • Active warnings: <b>{retentionJobResult.approaching_disposal_warnings}</b>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Retention Warnings Card */}
          <div className="adm-panel" style={{ background: themeStyles.cardBg, borderRadius: '24px', border: themeStyles.panelBorder, overflow: 'hidden' }}>
            <div className="adm-panel__head" style={{ padding: '20px 24px', borderBottom: themeStyles.panelBorder }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: themeStyles.textMain }}>Alerts Approaching 12-Month Disposal Limit (Within 30 Days)</h3>
                <span className="adm-mono" style={{ fontSize: '12px', color: themeStyles.textMuted }}>
                  Proactive warnings for open incidents requiring expedited review prior to automated purge
                </span>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {retentionWarnings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {retentionWarnings.map((w, idx) => (
                    <div key={idx} style={{ padding: '12px 16px', borderRadius: '12px', background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb', border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle size={18} color="#d97706" />
                        <div>
                          <strong style={{ color: isDark ? '#fcd34d' : '#92400e' }}>{w.rule_code}</strong> <span style={{ color: themeStyles.textMuted }}>(ID: {w.alert_id})</span>
                          <div style={{ fontSize: '12px', color: isDark ? '#fbbf24' : '#b45309' }}>Age: {w.age_days} days • Created on {new Date(w.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span style={{ background: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef3c7', color: isDark ? '#fde68a' : '#b45309', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 800 }}>
                        {w.days_until_disposal} DAYS UNTIL PURGE
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  <ShieldCheck size={32} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ margin: 0 }}>Zero open alerts are approaching the 12-month retention threshold.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          PEER REVIEW RESOLUTION MODAL (OI-30)
          ======================================================================= */}
      {selectedAlertForReview && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15, 23, 42, 0.65)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            style={{ 
              background: isDark ? '#0f172a' : '#ffffff', 
              borderRadius: '24px', 
              width: '100%', 
              maxWidth: '580px', 
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)', 
              border: isDark ? '1px solid #1e293b' : 'none',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '22px 28px', background: '#1e293b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700 }}>
                  PEER REVIEW WORKBENCH • OI-30
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
                  Incident Resolution Sign-Off
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedAlertForReview(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitReview} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Alert Snippet */}
              <div style={{ background: themeStyles.subtleBox, borderRadius: '12px', padding: '12px 16px', border: themeStyles.subtleBoxBorder }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textMuted }}>
                  {selectedAlertForReview.rule_code} • {selectedAlertForReview.severity_final || selectedAlertForReview.severity_base} SEVERITY
                </div>
                <div style={{ fontSize: '13.5px', color: themeStyles.textMain, marginTop: '4px', lineHeight: 1.4 }}>
                  {selectedAlertForReview.description}
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textSub, marginBottom: '8px' }}>
                  TARGET WORKFLOW STATUS:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('UNDER_REVIEW')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      background: reviewStatus === 'UNDER_REVIEW' ? (isDark ? 'rgba(59, 130, 246, 0.25)' : '#eff6ff') : (isDark ? '#1e293b' : '#ffffff'),
                      color: reviewStatus === 'UNDER_REVIEW' ? (isDark ? '#93c5fd' : '#1d4ed8') : themeStyles.textMuted,
                      borderColor: reviewStatus === 'UNDER_REVIEW' ? '#3b82f6' : (isDark ? '#334155' : '#cbd5e1')
                    }}
                  >
                    Under Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('AWAITING_UNINVOLVED_ADMIN')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      background: reviewStatus === 'AWAITING_UNINVOLVED_ADMIN' ? (isDark ? 'rgba(168, 85, 247, 0.25)' : '#faf5ff') : (isDark ? '#1e293b' : '#ffffff'),
                      color: reviewStatus === 'AWAITING_UNINVOLVED_ADMIN' ? (isDark ? '#d8b4fe' : '#7e22ce') : themeStyles.textMuted,
                      borderColor: reviewStatus === 'AWAITING_UNINVOLVED_ADMIN' ? '#a855f7' : (isDark ? '#334155' : '#cbd5e1')
                    }}
                  >
                    Recuse & Escalate
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('CLOSED')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      background: reviewStatus === 'CLOSED' ? (isDark ? 'rgba(16, 185, 129, 0.25)' : '#ecfdf5') : (isDark ? '#1e293b' : '#ffffff'),
                      color: reviewStatus === 'CLOSED' ? (isDark ? '#6ee7b7' : '#047857') : themeStyles.textMuted,
                      borderColor: reviewStatus === 'CLOSED' ? '#10b981' : (isDark ? '#334155' : '#cbd5e1')
                    }}
                  >
                    Close & Resolve
                  </button>
                </div>
              </div>

              {/* Disposition (Mandatory if CLOSED) */}
              {reviewStatus === 'CLOSED' && (
                <div>
                  <label htmlFor="review-disposition" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textSub, marginBottom: '6px' }}>
                    FORMAL DISPOSITION (OI-30):
                  </label>
                  <select
                    id="review-disposition"
                    value={reviewDisposition}
                    onChange={(e) => setReviewDisposition(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: themeStyles.inputBorder,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: themeStyles.inputText,
                      background: themeStyles.inputBg,
                      outline: 'none'
                    }}
                  >
                    <option value="CLOSED_EXPECTED_ACTIVITY">
                      CLOSED_EXPECTED_ACTIVITY (Verified legitimate operational activity)
                    </option>
                    <option value="CLOSED_FOLLOW_UP_REQUIRED">
                      CLOSED_FOLLOW_UP_REQUIRED (Policy violation confirmed; follow-up logged)
                    </option>
                  </select>
                </div>
              )}

              {/* Mandatory Review Note */}
              <div>
                <label htmlFor="review-note" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textSub, marginBottom: '6px' }}>
                  REVIEW SIGN-OFF NOTE (STRICTLY REQUIRED):
                </label>
                <textarea
                  id="review-note"
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Explain justification for closing or reason for recusal..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: themeStyles.inputBorder,
                    fontSize: '13px',
                    color: themeStyles.inputText,
                    background: themeStyles.inputBg,
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Error Box */}
              {reviewError && (
                <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{reviewError}</span>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAlertForReview(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    color: isDark ? '#cbd5e1' : '#475569',
                    border: isDark ? '1px solid #334155' : 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingReview}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: submittingReview ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingReview ? 'Submitting Sign-Off...' : 'Confirm Review Sign-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          TUNE RULE THRESHOLD MODAL (OI-08)
          ======================================================================= */}
      {editingRule && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15, 23, 42, 0.65)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            style={{ 
              background: isDark ? '#0f172a' : '#ffffff', 
              borderRadius: '24px', 
              width: '100%', 
              maxWidth: '540px', 
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)', 
              border: isDark ? '1px solid #1e293b' : 'none',
              overflow: 'hidden' 
            }}
          >
            <div style={{ padding: '20px 24px', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#e0f2fe', fontWeight: 700 }}>
                  THRESHOLD TUNING • OI-08
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 800 }}>
                  Tune Rule: {editingRule.rule_code}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingRule(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textSub, marginBottom: '6px' }}>
                  PARAMETERS (JSON FORMAT):
                </label>
                <textarea
                  rows={6}
                  value={ruleParamInput}
                  onChange={(e) => setRuleParamInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: themeStyles.inputBorder,
                    fontFamily: 'monospace',
                    fontSize: '12.5px',
                    color: themeStyles.inputText,
                    background: themeStyles.inputBg,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textSub, marginBottom: '6px' }}>
                  CHANGE JUSTIFICATION (AUDIT TRAIL LOG):
                </label>
                <input
                  type="text"
                  value={ruleReason}
                  onChange={(e) => setRuleReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: themeStyles.inputBorder,
                    fontSize: '12.5px',
                    color: themeStyles.inputText,
                    background: themeStyles.inputBg,
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="client-reviewed-chk"
                  checked={ruleClientReviewed}
                  onChange={(e) => setRuleClientReviewed(e.target.checked)}
                />
                <label htmlFor="client-reviewed-chk" style={{ fontSize: '13px', color: themeStyles.textMain, fontWeight: 600 }}>
                  Mark as Client Approved / Reviewed (OI-08)
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: themeStyles.inputBg, color: themeStyles.textMuted, border: themeStyles.inputBorder, fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRule}
                  style={{ padding: '8px 20px', borderRadius: '8px', background: '#0284c7', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  {submittingRule ? 'Saving...' : 'Save & Bump Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
