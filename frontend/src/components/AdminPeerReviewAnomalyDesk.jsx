import React, { useState, useEffect, useMemo } from 'react';
import { TableEmptyRow } from './TableEmptyState';
import { TablePagination, TablePaginationCompact, usePagination } from './TablePagination';
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
  Archive,
  BarChart3,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  fetchAnomalies, 
  reviewAnomalyAlert, 
  fetchAccessLogs, 
  fetchAnomalyRules, 
  updateAnomalyRule, 
  approveAnomalyRule, 
  runRetentionJob, 
  fetchRetentionWarnings,
  fetchExecutiveAnomalyReport,
  downloadAnomalyReportPdf,
  downloadAnomalyReportCsv,
  exportAuditLogsCsv
} from '../services/api';

export const DEFAULT_ANOMALY_RULES = [
  {
    rule_code: "R1_OUT_OF_SCOPE",
    parameters: { threshold: 1, window_minutes: 1440, severity: "LOW" },
    description: "Single out-of-scope attempt aggregated daily",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R1_REPEATED_OUT_OF_SCOPE",
    parameters: { threshold: 3, window_minutes: 15, severity: "MEDIUM" },
    description: "Repeated out-of-scope attempts in 15 min",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R2_FAILED_LOGINS_ACCOUNT",
    parameters: { threshold: 5, window_minutes: 10, severity: "MEDIUM" },
    description: "Failed logins for single account",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R2_FAILED_LOGINS_IP",
    parameters: { threshold: 10, distinct_usernames_threshold: 2, window_minutes: 10, severity: "MEDIUM" },
    description: "Failed logins for single IP (>=10 failures across >=2 distinct usernames in 10 min)",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R3_HIGH_RECORD_ACCESS",
    parameters: {
      thresholds: { account_manager: 25, trainer: 25, finance: 50, admin: 50, trainee: 15 },
      window_minutes: 15
    },
    description: "High distinct record access",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R3_REPORT_BURSTS",
    parameters: { threshold: 5, window_minutes: 60, severity: "MEDIUM" },
    description: "Report generation bursts",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R4_RECORD_DELETION",
    parameters: { threshold: 1, severity: "HIGH" },
    description: "Soft deletion of client data",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R4_RECORD_EDIT",
    parameters: { threshold: 1, severity: "LOW" },
    description: "Edit of client data",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "R4_BULK_EDIT",
    parameters: { threshold: 10, window_minutes: 15, severity: "MEDIUM" },
    description: "Bulk record edits in 15 min",
    version_no: 1,
    client_reviewed: true
  },
  {
    rule_code: "S1_AFTER_HOURS",
    parameters: { start_hour: 9, end_hour: 18, tz: "UTC+8" },
    description: "After-hours supporting indicator",
    version_no: 1,
    client_reviewed: true
  }
];

export const DEFAULT_ALERTS = [
  {
    id: "ALT-2026-9041",
    rule_code: "R1_OUT_OF_SCOPE",
    severity: "LOW",
    status: "NEW",
    actor_role: "account_manager",
    actor_user_id: "USR-AM-04",
    occurred_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    details: { attempted_client: "FINTECH_BETA", reason: "Single out-of-scope decryption attempt" },
    description: "Single out-of-scope attempt aggregated daily",
    tags: ["R1", "OUT_OF_SCOPE", "CP_ABE_BLOCKED"]
  },
  {
    id: "ALT-2026-8812",
    rule_code: "S1_AFTER_HOURS",
    severity: "MEDIUM",
    status: "NEW",
    actor_role: "trainer",
    actor_user_id: "USR-TRN-02",
    occurred_at: new Date(Date.now() - 1000 * 60 * 185).toISOString(),
    after_hours_tag: true,
    details: { hour: 23, tz: "UTC+8", reason: "Decryption outside 09:00-18:00 standard window" },
    description: "After-hours supporting indicator",
    tags: ["S1", "AFTER_HOURS"]
  }
];

export const DEFAULT_ACCESS_LOGS = [
  {
    id: "LOG-88910",
    occurred_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    actor_role: "admin",
    actor_user_id: "USR-ADM-01",
    event_type: "CRYPTOGRAPHIC_KEY_ROTATION",
    resource_type: "DMA_ABE_KEY_AUTHORITY",
    resource_id: "KA-01",
    outcome: "SUCCESS",
    source_ip: "127.0.0.1",
    details: { algorithm: "Native Charm CP-ABE BSW07", curve: "SS512" }
  },
  {
    id: "LOG-88909",
    occurred_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    actor_role: "admin",
    actor_user_id: "USR-ADM-01",
    event_type: "RULE_MODIFIED",
    resource_type: "ANOMALY_RULE",
    resource_id: "RULE-R1",
    outcome: "SUCCESS",
    source_ip: "127.0.0.1",
    details: { rule_code: "R1_OUT_OF_SCOPE", version: 1 }
  },
  {
    id: "LOG-88908",
    occurred_at: new Date(Date.now() - 1000 * 60 * 68).toISOString(),
    actor_role: "account_manager",
    actor_user_id: "USR-AM-04",
    event_type: "RECORD_ACCESS_DENIED",
    resource_type: "ENCRYPTED_RECORD",
    resource_id: "REC-9014",
    outcome: "DENIED",
    reason_code: "CP_ABE_POLICY_MISMATCH",
    source_ip: "192.168.1.104",
    details: { attempted_client: "FINTECH_BETA", assigned_scope: "CORP_ALPHA" }
  },
  {
    id: "LOG-88907",
    occurred_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    actor_role: "system",
    actor_user_id: "SYS-DAEMON",
    event_type: "SECURITY_AUDIT_VERIFIED",
    resource_type: "AUDIT_ENGINE",
    resource_id: "ENG-01",
    outcome: "SUCCESS",
    source_ip: "127.0.0.1",
    details: { statutory_limit_days: 365, schedule: "DAILY" }
  }
];

export function synthesizeReport(currentAlerts = [], currentRules = []) {
  const totalAlerts = currentAlerts.length;
  const unreviewedAlerts = currentAlerts.filter(a => a.status !== 'CLOSED').length;
  const closedAlerts = currentAlerts.filter(a => a.status === 'CLOSED').length;
  const highSeverityCount = currentAlerts.filter(a => (a.severity_final || a.severity) === 'HIGH').length;
  const mediumSeverityCount = currentAlerts.filter(a => (a.severity_final || a.severity) === 'MEDIUM').length;
  const lowSeverityCount = currentAlerts.filter(a => (a.severity_final || a.severity) === 'LOW').length;
  const afterHoursCount = currentAlerts.filter(a => a.after_hours_tag).length;

  const ruleCounts = {};
  currentAlerts.forEach(a => {
    const rc = a.rule_code || 'UNKNOWN';
    ruleCounts[rc] = (ruleCounts[rc] || 0) + 1;
  });

  const rulesBreakdown = (currentRules && currentRules.length > 0 ? currentRules : DEFAULT_ANOMALY_RULES).map(r => {
    const params = r.parameters || {};
    const maxEvents = params.threshold || params.distinct_usernames_threshold || 1;
    return {
      rule_code: r.rule_code,
      name: r.description || r.rule_code,
      severity: r.rule_code.includes('DELETION') ? 'HIGH' : (params.severity || 'MEDIUM'),
      threshold: `${maxEvents} events`,
      count: ruleCounts[r.rule_code] || 0
    };
  });

  return {
    total_alerts: totalAlerts,
    unreviewed_alerts: unreviewedAlerts,
    closed_alerts: closedAlerts,
    high_severity_count: highSeverityCount,
    medium_severity_count: mediumSeverityCount,
    low_severity_count: lowSeverityCount,
    after_hours_count: afterHoursCount,
    rules_breakdown: rulesBreakdown,
    recent_alerts: currentAlerts.slice(0, 10)
  };
}

export default function AdminPeerReviewAnomalyDesk({ onRuleUpdated }) {
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
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS);
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
  const [accessLogs, setAccessLogs] = useState(DEFAULT_ACCESS_LOGS);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Rules state
  const [rules, setRules] = useState(DEFAULT_ANOMALY_RULES);
  const [approvingRuleCode, setApprovingRuleCode] = useState(null);
  const [loadingRules, setLoadingRules] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleParams, setRuleParams] = useState({});
  const [ruleReason, setRuleReason] = useState('');
  const [ruleClientReviewed, setRuleClientReviewed] = useState(true);
  const [submittingRule, setSubmittingRule] = useState(false);

  // Executive Anomaly Report state
  const [anomalyReport, setAnomalyReport] = useState(() => synthesizeReport(DEFAULT_ALERTS, DEFAULT_ANOMALY_RULES));
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingAuditLogsCsv, setDownloadingAuditLogsCsv] = useState(false);

  const handleDownloadAuditLogsCsv = async () => {
    if (downloadingAuditLogsCsv) return;
    setDownloadingAuditLogsCsv(true);
    try {
      const ok = await exportAuditLogsCsv(token);
      if (ok) {
        setActionSuccessToast('Master Audit Trail (CSV) exported successfully.');
      }
    } finally {
      setDownloadingAuditLogsCsv(false);
    }
  };

  // Load Executive Anomaly Report
  const loadExecutiveReport = async () => {
    setLoadingReport(true);
    try {
      const data = await fetchExecutiveAnomalyReport(token);
      if (data && data.rules_breakdown && data.rules_breakdown.length > 0) {
        setAnomalyReport(data);
      } else {
        setAnomalyReport(synthesizeReport(alerts, rules));
      }
    } catch (err) {
      console.warn('Could not load anomaly report, synthesizing from local data:', err);
      setAnomalyReport(synthesizeReport(alerts, rules));
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const ok = await downloadAnomalyReportPdf(token);
      if (ok) {
        setActionSuccessToast('Official Security Anomaly Audit Report (PDF) downloaded successfully.');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const ok = await downloadAnomalyReportCsv(token);
      if (ok) {
        setActionSuccessToast('Anomaly Incident Ledger (CSV) exported successfully.');
      }
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Retention state
  const [retentionWarnings, setRetentionWarnings] = useState([]);
  const [retentionJobResult, setRetentionJobResult] = useState(null);
  const [runningRetention, setRunningRetention] = useState(false);

  // Load Alerts
  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const data = await fetchAnomalies(token);
      if (data && Array.isArray(data) && data.length > 0) {
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
      if (data && Array.isArray(data) && data.length > 0) {
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
      if (data && Array.isArray(data) && data.length > 0) {
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
    loadExecutiveReport();
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
      let updated;
      try {
        updated = await reviewAnomalyAlert(selectedAlertForReview.id, payload, token);
      } catch (apiErr) {
        throw apiErr;
      }
      setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
      setActionSuccessToast(`Alert ${(updated.id || '').slice(0, 8)}... successfully updated to ${updated.status}.`);
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

  // Formatted Parameter Display Helper
  const renderRuleParameters = (params = {}) => {
    if (!params || Object.keys(params).length === 0) {
      return (
        <span style={{ fontSize: '12px', color: themeStyles.textMuted, fontStyle: 'italic' }}>
          None configured
        </span>
      );
    }

    const items = [];

    if (params.threshold !== undefined) {
      items.push({
        label: 'Event Limit',
        val: `${params.threshold} events`,
        color: '#6366f1'
      });
    }

    if (params.distinct_usernames_threshold !== undefined) {
      items.push({
        label: 'Target Accounts',
        val: `${params.distinct_usernames_threshold} distinct`,
        color: '#0ea5e9'
      });
    }

    if (params.window_minutes !== undefined) {
      items.push({
        label: 'Window',
        val: `${params.window_minutes} min`,
        color: '#8b5cf6'
      });
    }

    if (params.start_hour !== undefined && params.end_hour !== undefined) {
      items.push({
        label: 'Active Hours',
        val: `${String(params.start_hour).padStart(2, '0')}:00 – ${String(params.end_hour).padStart(2, '0')}:00 (${params.tz || 'UTC+8'})`,
        color: '#f59e0b'
      });
    }

    if (params.thresholds && typeof params.thresholds === 'object') {
      Object.entries(params.thresholds).forEach(([role, v]) => {
        items.push({
          label: `${role.replace(/_/g, ' ')} limit`,
          val: `${v} records`,
          color: '#10b981'
        });
      });
    }

    if (params.severity) {
      items.push({
        label: 'Severity',
        val: params.severity,
        color: params.severity === 'HIGH' ? '#f43f5e' : params.severity === 'MEDIUM' ? '#f59e0b' : '#38bdf8'
      });
    }

    Object.keys(params).forEach((k) => {
      if (!['threshold', 'distinct_usernames_threshold', 'window_minutes', 'start_hour', 'end_hour', 'tz', 'thresholds', 'severity'].includes(k)) {
        items.push({
          label: k.replace(/_/g, ' '),
          val: String(params[k]),
          color: '#64748b'
        });
      }
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
            <span style={{ color: themeStyles.textMuted, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
              {item.label}:
            </span>
            <span style={{ 
              fontWeight: 700, 
              fontFamily: 'monospace',
              color: item.color,
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
              padding: '2px 7px',
              borderRadius: '5px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
              whiteSpace: 'nowrap'
            }}>
              {item.val}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Open Edit Rule Modal
  const openEditRuleModal = (rule) => {
    setEditingRule(rule);
    setRuleParams(JSON.parse(JSON.stringify(rule.parameters || {})));
    setRuleClientReviewed(Boolean(rule.client_reviewed));
    setRuleReason(`Threshold updated by ${currentUser?.name || 'Administrator'} (OI-08)`);
  };

  // Save Rule Update
  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!editingRule) return;

    setSubmittingRule(true);
    try {
      let updated;
      try {
        updated = await updateAnomalyRule(editingRule.rule_code, {
          parameters: ruleParams,
          client_reviewed: ruleClientReviewed,
          reason: ruleReason
        }, token);
      } catch (apiErr) {
        throw apiErr;
      }
      setRules(prev => prev.map(r => r.rule_code === updated.rule_code ? updated : r));
      onRuleUpdated?.(updated);
      setActionSuccessToast(`Rule ${updated.rule_code} parameters updated to v${updated.version_no}.`);
      setEditingRule(null);
      loadLogs();
    } catch (err) {
      alert(err.message || 'Failed to update rule parameters.');
    } finally {
      setSubmittingRule(false);
    }
  };

  // Peer approval of a pending rule edit (U-16, OI-08). The backend refuses the last editor.
  const handleApproveRule = async (rule) => {
    setApprovingRuleCode(rule.rule_code);
    try {
      const updated = await approveAnomalyRule(
        rule.rule_code,
        `Peer review approval of ${rule.rule_code} v${rule.version_no} (OI-08)`,
        token
      );
      setRules(prev => prev.map(r => r.rule_code === updated.rule_code ? updated : r));
      onRuleUpdated?.(updated);
      setActionSuccessToast(`Rule ${updated.rule_code} v${updated.version_no} approved and now enforced.`);
      loadLogs();
    } catch (err) {
      alert(err.message || 'Failed to approve rule.');
    } finally {
      setApprovingRuleCode(null);
    }
  };

  // Execute Retention Job
  const handleExecuteRetention = async () => {
    if (!confirm('Execute statutory 12-month retention purge now? Old logs and closed alerts exceeding 365 days will be purged, and approaching alerts warned (OI-20).')) {
      return;
    }
    setRunningRetention(true);
    try {
      let res;
      try {
        res = await runRetentionJob(token);
      } catch (apiErr) {
        console.warn('Backend retention job failed, applying local simulated outcome:', apiErr);
        res = {
          audit_logs_purged: 0,
          closed_alerts_purged: 0,
          approaching_disposal_warnings: retentionWarnings.length,
          executed_at: new Date().toISOString()
        };
      }
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
  const {
    currentPage: alertPage,
    setCurrentPage: setAlertPage,
    paginatedItems: pagedAlerts,
    totalItems: totalAlerts
  } = usePagination(filteredAlerts, 4);

  const {
    currentPage: logPage,
    setCurrentPage: setLogPage,
    paginatedItems: pagedLogs,
    totalItems: totalLogs
  } = usePagination(filteredLogs, 4);

  const recentAlertsData = useMemo(() => {
    if (anomalyReport?.recent_alerts && anomalyReport.recent_alerts.length > 0) {
      return anomalyReport.recent_alerts;
    }
    return alerts.slice(0, 10);
  }, [anomalyReport, alerts]);

  const {
    currentPage: recentAlertPage,
    setCurrentPage: setRecentAlertPage,
    paginatedItems: pagedRecentAlerts,
    totalItems: totalRecentAlerts
  } = usePagination(recentAlertsData, 4);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. TOP SUB-NAVIGATION TABS */}
      <div 
        className="adm-panel" 
        style={{ 
          background: themeStyles.panelBg, 
          borderRadius: '20px', 
          padding: '10px 16px', 
          border: themeStyles.panelBorder,
          boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.3)' : '0 4px 18px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          overflowX: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              background: activeTab === 'queue' ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'queue' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              border: activeTab === 'queue' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              boxShadow: activeTab === 'queue' ? '0 4px 12px rgba(225, 29, 72, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldAlert size={14} />
            <span>Incident Queue</span>
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
              padding: '8px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
              border: activeTab === 'audit_trail' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              cursor: 'pointer',
              background: activeTab === 'audit_trail' ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'audit_trail' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              boxShadow: activeTab === 'audit_trail' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <History size={14} />
            <span>Audit Trail ({accessLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
              border: activeTab === 'rules' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              cursor: 'pointer',
              background: activeTab === 'rules' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'rules' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              boxShadow: activeTab === 'rules' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={14} />
            <span>Anomaly Rules ({rules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('report'); loadExecutiveReport(); }}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
              border: activeTab === 'report' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              cursor: 'pointer',
              background: activeTab === 'report' ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'report' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              boxShadow: activeTab === 'report' ? '0 4px 12px rgba(245, 158, 11, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChart3 size={14} />
            <span>Executive Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('retention')}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              whiteSpace: 'nowrap',
              border: activeTab === 'retention' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
              cursor: 'pointer',
              background: activeTab === 'retention' ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: activeTab === 'retention' ? '#ffffff' : (isDark ? '#94a3b8' : '#475569'),
              boxShadow: activeTab === 'retention' ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Archive size={14} />
            <span>Retention Engine (OI-20)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => { loadAlerts(); loadLogs(); loadRules(); loadRetentionWarnings(); loadExecutiveReport(); }}
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
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
          title="Synchronize all anomaly feeds and audit logs"
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
          {/* Crimson Cockpit Hero Stage matching RecordsVault & PeopleAccess */}
          <section className="trainee-hero-stage adm-alerts-hero-stage">
            <div className="trainee-hero-content">
              <div className="trainee-hero-badge" style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#ffe4e6' }}>
                <ShieldAlert size={13} style={{ color: '#fb7185' }} />
                <span>INCIDENT RESOLUTION WORKBENCH &bull; FR-21, OI-30</span>
              </div>

              <h2 className="trainee-hero-headline">Security Incidents &amp; Peer Review</h2>
              <p className="trainee-hero-sub">
                Strict multi-administrator conflict-of-interest enforcement with dual-signature disposal &amp; CP-ABE anomaly auditing.
              </p>

              <div className="trainee-hero-actions">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="trainee-hero-primary-btn adm-alerts-primary-btn"
                  title="Download Official Security Anomaly Audit Report (PDF)"
                >
                  <Download size={14} className={downloadingPdf ? 'spin-animation' : ''} />
                  <span>{downloadingPdf ? 'Generating PDF...' : 'Download Anomaly Report (PDF)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={downloadingCsv}
                  className="trainee-hero-secondary-btn"
                  title="Export complete anomaly incident ledger (CSV)"
                >
                  <FileText size={14} className={downloadingCsv ? 'spin-animation' : ''} />
                  <span>{downloadingCsv ? 'Exporting...' : 'Export Ledger (CSV)'}</span>
                </button>
              </div>
            </div>

            {/* 4-Cell Bento Telemetry Grid */}
            <div className="trainee-hero-metrics-panel">
              <div className="hero-metric-cell adm-alerts-metric-cell">
                <span className="metric-tag">PENDING REVIEW</span>
                <div className="metric-num" style={{ color: unreviewedCount > 0 ? '#fda4af' : '#f8fafc' }}>
                  {unreviewedCount}
                  <span className="metric-unit" style={{ color: '#fecdd3' }}>ALERTS</span>
                </div>
                <span className="metric-sub-label">Awaiting peer sign-off</span>
              </div>

              <div className="hero-metric-cell adm-alerts-metric-cell">
                <span className="metric-tag">CLOSED &amp; SIGNED</span>
                <div className="metric-num" style={{ color: '#34d399' }}>
                  {alerts.filter(a => a.status === 'CLOSED').length}
                  <span className="metric-unit" style={{ color: '#6ee7b7' }}>DONE</span>
                </div>
                <span className="metric-sub-label">Dual-admin signed</span>
              </div>

              <div className="hero-metric-cell adm-alerts-metric-cell">
                <span className="metric-tag">HIGH SEVERITY</span>
                <div className="metric-num" style={{ color: '#f87171' }}>
                  {alerts.filter(a => (a.severity_final || a.severity) === 'HIGH').length}
                  <span className="metric-unit" style={{ color: '#fca5a5' }}>HIGH</span>
                </div>
                <span className="metric-sub-label">Critical priority triage</span>
              </div>

              <div className="hero-metric-cell adm-alerts-metric-cell">
                <span className="metric-tag">TOTAL INCIDENTS</span>
                <div className="metric-num" style={{ color: '#38bdf8' }}>
                  {alerts.length}
                  <span className="metric-unit" style={{ color: '#7dd3fc' }}>LOGS</span>
                </div>
                <span className="metric-sub-label">Radar detection feed</span>
              </div>
            </div>
          </section>

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

            {/* Right: Compact pagination & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <TablePaginationCompact
                currentPage={alertPage}
                totalItems={totalAlerts}
                pageSize={4}
                onPageChange={setAlertPage}
              />
              <div style={{ position: 'relative', minWidth: '220px' }}>
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
          </div>

          {/* Alerts Feed (Natural Height, 10 items per page) */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '14px',
              padding: '6px 0 16px 0',
              border: 'none',
              borderRadius: '16px'
            }}
          >
            {filteredAlerts.length > 0 ? (
              pagedAlerts.map((alert) => {
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
                      {!isClosed && (
                        <span style={{ 
                          background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                          color: isDark ? '#38bdf8' : '#0369a1',
                          border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #bae6fd',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={11} />
                          <span>Review SLA: Due in {severity === 'HIGH' ? 3 : 5} working days (U-16)</span>
                        </span>
                      )}
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
                Total {filteredAlerts.length} incident records &bull; Real-time audit telemetry active
              </div>
            )}
          </div>
          <TablePagination
            currentPage={alertPage}
            totalItems={totalAlerts}
            pageSize={4}
            onPageChange={setAlertPage}
            itemName="incident alerts"
          />
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

              <button
                type="button"
                onClick={handleDownloadAuditLogsCsv}
                disabled={downloadingAuditLogsCsv}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Download size={14} className={downloadingAuditLogsCsv ? 'spin-animation' : ''} />
                <span>{downloadingAuditLogsCsv ? 'Exporting...' : 'Export Audit Trail (CSV)'}</span>
              </button>
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
                  pagedLogs.map((log) => {
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
          <TablePagination
            currentPage={logPage}
            totalItems={totalLogs}
            pageSize={4}
            onPageChange={setLogPage}
            itemName="audit trail records"
          />
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
                      {renderRuleParameters(rule.parameters)}
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
                      {!rule.client_reviewed && (
                        rule.last_edited_by_user_id && rule.last_edited_by_user_id === currentUser?.id ? (
                          <span style={{ marginRight: '10px', fontSize: '11px', fontWeight: 700, color: themeStyles.textMuted }}>
                            Awaiting peer review
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApproveRule(rule)}
                            disabled={approvingRuleCode === rule.rule_code}
                            style={{
                              marginRight: '8px',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              background: '#059669',
                              border: 'none',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {approvingRuleCode === rule.rule_code ? 'Approving...' : 'Approve'}
                          </button>
                        )
                      )}
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
          TAB 5: EXECUTIVE ANOMALY REPORT & AUDIT ANALYTICS (OI-29, OI-30)
          ======================================================================= */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Executive Header Banner */}
          <div 
            style={{ 
              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', 
              borderRadius: '24px', 
              padding: '28px 32px', 
              border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid #c7d2fe',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px'
            }}
          >
            <div>
              <span className="adm-pill adm-pill--purple" style={{ marginBottom: '8px' }}>
                <span className="adm-live" /> ISO/IEC 27001:2022 COMPLIANT AUDIT
              </span>
              <h2 style={{ margin: '8px 0 6px', color: '#ffffff', fontSize: '24px', fontWeight: 800 }}>
                Executive Security Posture & Anomaly Audit Report
              </h2>
              <p style={{ margin: 0, color: '#c7d2fe', fontSize: '13.5px', maxWidth: '640px' }}>
                Comprehensive threat detection summary, dual-admin peer review compliance, and rule violation metrics across all enterprise client cohorts.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                style={{
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 22px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 18px rgba(225, 29, 72, 0.4)'
                }}
              >
                <Download size={16} />
                <span>{downloadingPdf ? 'Generating PDF Report...' : 'Download Official Report (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={downloadingCsv}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FileText size={16} />
                <span>{downloadingCsv ? 'Exporting CSV...' : 'Export Ledger (CSV)'}</span>
              </button>
            </div>
          </div>

          {/* Executive KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: themeStyles.cardBg, borderRadius: '18px', padding: '20px', border: themeStyles.panelBorder }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
                Total Recorded Incidents
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: themeStyles.textMain }}>
                {anomalyReport?.total_alerts ?? alerts.length}
              </div>
              <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '6px' }}>
                Continuous 365-day audit retention
              </div>
            </div>

            <div style={{ background: themeStyles.cardBg, borderRadius: '18px', padding: '20px', border: themeStyles.panelBorder }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
                Pending Investigation
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#e11d48' }}>
                {anomalyReport?.unreviewed_alerts ?? unreviewedCount}
              </div>
              <div style={{ fontSize: '12px', color: '#f43f5e', marginTop: '6px' }}>
                Requires peer review disposition
              </div>
            </div>

            <div style={{ background: themeStyles.cardBg, borderRadius: '18px', padding: '20px', border: themeStyles.panelBorder }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
                Closed & Signed Off
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
                {anomalyReport?.closed_alerts ?? alerts.filter(a => a.status === 'CLOSED').length}
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>
                Dual-admin verified dispositions
              </div>
            </div>

            <div style={{ background: themeStyles.cardBg, borderRadius: '18px', padding: '20px', border: themeStyles.panelBorder }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
                High Severity Alerts
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
                {anomalyReport?.high_severity_count ?? alerts.filter(a => (a.severity_final || a.severity) === 'HIGH').length}
              </div>
              <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>
                Soft-delete & brute force events
              </div>
            </div>

            <div style={{ background: themeStyles.cardBg, borderRadius: '18px', padding: '20px', border: themeStyles.panelBorder }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
                After-Hours Events (S1)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6' }}>
                {anomalyReport?.after_hours_count ?? alerts.filter(a => a.after_hours_tag).length}
              </div>
              <div style={{ fontSize: '12px', color: '#8b5cf6', marginTop: '6px' }}>
                Outside 09:00-18:00 PHT window
              </div>
            </div>
          </div>

          {/* Anomaly Detection Rules Breakdown Table (Table 13) */}
          <div style={{ background: themeStyles.panelBg, borderRadius: '24px', border: themeStyles.panelBorder, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: themeStyles.panelBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: themeStyles.textMain }}>
                  1. Detection Rule Volume & Severity Matrix (Chapter III Table 13)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: themeStyles.textMuted }}>
                  Evaluation breakdown across out-of-scope access, brute-force attempts, volume bursts, and record modifications.
                </p>
              </div>
              <span className="adm-pill adm-pill--blue">{rules.length} RULES ACTIVE</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: themeStyles.panelBorder }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>RULE CODE</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>MONITORED EVENT</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>BASE SEVERITY</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>THRESHOLD WINDOW</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>TOTAL INCIDENTS</th>
                  </tr>
                </thead>
                <tbody>
                  {((anomalyReport?.rules_breakdown && anomalyReport.rules_breakdown.length > 0)
                    ? anomalyReport.rules_breakdown
                    : synthesizeReport(alerts, rules).rules_breakdown
                  ).map((r) => (
                    <tr key={r.rule_code} style={{ borderBottom: themeStyles.panelBorder }}>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: themeStyles.textMain }}>
                        <code>{r.rule_code}</code>
                      </td>
                      <td style={{ padding: '14px 18px', color: themeStyles.textSub }}>
                        {r.name}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: r.severity === 'HIGH' ? 'rgba(225, 29, 72, 0.2)' : 'rgba(217, 119, 6, 0.2)',
                            color: r.severity === 'HIGH' ? '#f43f5e' : '#f59e0b'
                          }}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: themeStyles.textMuted, fontSize: '12px' }}>
                        {r.threshold}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: r.count > 0 ? themeStyles.textMain : themeStyles.textMuted }}>
                        {r.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Critical Incident Highlights */}
          <div style={{ background: themeStyles.panelBg, borderRadius: '24px', border: themeStyles.panelBorder, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: themeStyles.panelBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: themeStyles.textMain }}>
                  2. Executive Incident Log & Timeline Highlights
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: themeStyles.textMuted }}>
                  High-priority security alerts with automated timestamping and investigator disposition notes.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: themeStyles.panelBorder }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>TIMESTAMP</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>RULE</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>SEV</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>STATUS</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMuted }}>DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecentAlerts.map((a) => (
                    <tr key={a.id} style={{ borderBottom: themeStyles.panelBorder }}>
                      <td style={{ padding: '12px 18px', color: themeStyles.textMuted, whiteSpace: 'nowrap' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: themeStyles.textMain }}>
                        <code>{a.rule_code}</code>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontWeight: 800, color: a.severity === 'HIGH' ? '#f43f5e' : '#f59e0b' }}>
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span 
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: a.status === 'CLOSED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(225, 29, 72, 0.2)',
                            color: a.status === 'CLOSED' ? '#10b981' : '#f43f5e'
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: themeStyles.textSub }}>
                        {a.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={recentAlertPage}
              totalItems={totalRecentAlerts}
              pageSize={4}
              onPageChange={setRecentAlertPage}
              itemName="executive incidents"
            />
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
            <div style={{ 
              padding: '22px 28px', 
              background: isDark ? '#1e293b' : '#f8fafc', 
              borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}>
                  PEER REVIEW WORKBENCH • OI-30
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Incident Resolution Sign-Off
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedAlertForReview(null)}
                style={{ background: 'none', border: 'none', color: isDark ? '#94a3b8' : '#64748b', cursor: 'pointer', padding: '4px' }}
                aria-label="Close modal"
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
                <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                  Tune Rule: {editingRule.rule_code}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingRule(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Rule Identity Card */}
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: isDark ? 'rgba(2, 132, 199, 0.12)' : '#f0f9ff', border: isDark ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7' }}>
                    {editingRule.rule_code}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: themeStyles.textMuted, background: isDark ? '#1e293b' : '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                    Current Version: v{editingRule.version_no}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: themeStyles.textSub, lineHeight: 1.4 }}>
                  {editingRule.description}
                </div>
              </div>

              {/* Generated Parameter Input Boxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: themeStyles.textMuted }}>
                  Detection Parameter Values:
                </span>

                {/* 1. Threshold (if present or applicable) */}
                {(ruleParams.threshold !== undefined || (!ruleParams.thresholds && !ruleParams.start_hour)) && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                      Event Threshold Limit (Count):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ruleParams.threshold ?? 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setRuleParams(prev => ({ ...prev, threshold: isNaN(val) ? 1 : val }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: themeStyles.inputBorder,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: themeStyles.inputText,
                        background: themeStyles.inputBg,
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '11px', color: themeStyles.textMuted }}>
                      Minimum event occurrences required to trigger an alert.
                    </span>
                  </div>
                )}

                {/* 2. Window Minutes (if present or applicable) */}
                {(ruleParams.window_minutes !== undefined || editingRule.rule_code.includes('BURST') || editingRule.rule_code.includes('FAILED_LOGINS') || editingRule.rule_code.includes('HIGH_RECORD') || editingRule.rule_code.includes('OUT_OF_SCOPE')) && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                      Observation Window (Minutes):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ruleParams.window_minutes ?? 15}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setRuleParams(prev => ({ ...prev, window_minutes: isNaN(val) ? 1 : val }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: themeStyles.inputBorder,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: themeStyles.inputText,
                        background: themeStyles.inputBg,
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '11px', color: themeStyles.textMuted }}>
                      Rolling evaluation time window in minutes.
                    </span>
                  </div>
                )}

                {/* 3. Distinct Targeted Usernames (for R2-b IP failed logins) */}
                {ruleParams.distinct_usernames_threshold !== undefined && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                      Distinct Targeted Usernames Threshold:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ruleParams.distinct_usernames_threshold ?? 3}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setRuleParams(prev => ({ ...prev, distinct_usernames_threshold: isNaN(val) ? 1 : val }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: themeStyles.inputBorder,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: themeStyles.inputText,
                        background: themeStyles.inputBg,
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '11px', color: themeStyles.textMuted }}>
                      Dual threshold (OI-08): Minimum distinct user accounts targeted by the same IP.
                    </span>
                  </div>
                )}

                {/* 4. Role Thresholds (for R3-a High Record Access) */}
                {ruleParams.thresholds && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                        Account Manager Limit (Records):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ruleParams.thresholds.account_manager ?? 30}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setRuleParams(prev => ({
                            ...prev,
                            thresholds: { ...prev.thresholds, account_manager: isNaN(val) ? 1 : val }
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: themeStyles.inputBorder,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: themeStyles.inputText,
                          background: themeStyles.inputBg,
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                        Trainer Limit (Records):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ruleParams.thresholds.trainer ?? 30}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setRuleParams(prev => ({
                            ...prev,
                            thresholds: { ...prev.thresholds, trainer: isNaN(val) ? 1 : val }
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: themeStyles.inputBorder,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: themeStyles.inputText,
                          background: themeStyles.inputBg,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 5. Business Hours Start / End (for S1 After Hours) */}
                {ruleParams.start_hour !== undefined && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                        Start Hour (24h):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={ruleParams.start_hour ?? 9}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setRuleParams(prev => ({ ...prev, start_hour: isNaN(val) ? 9 : val }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: themeStyles.inputBorder,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: themeStyles.inputText,
                          background: themeStyles.inputBg,
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                        End Hour (24h):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={ruleParams.end_hour ?? 18}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setRuleParams(prev => ({ ...prev, end_hour: isNaN(val) ? 18 : val }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: themeStyles.inputBorder,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: themeStyles.inputText,
                          background: themeStyles.inputBg,
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                        Timezone:
                      </label>
                      <input
                        type="text"
                        value={ruleParams.tz ?? 'UTC+8'}
                        onChange={(e) => {
                          setRuleParams(prev => ({ ...prev, tz: e.target.value }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: themeStyles.inputBorder,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: themeStyles.inputText,
                          background: themeStyles.inputBg,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 6. Base Severity (if present) */}
                {ruleParams.severity !== undefined && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px' }}>
                      Alert Base Severity:
                    </label>
                    <select
                      value={ruleParams.severity ?? 'MEDIUM'}
                      onChange={(e) => setRuleParams(prev => ({ ...prev, severity: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: themeStyles.inputBorder,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: themeStyles.inputText,
                        background: themeStyles.inputBg,
                        outline: 'none'
                      }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                )}

                {/* Dynamic fields for any other custom keys */}
                {Object.keys(ruleParams).map((k) => {
                  if (['threshold', 'window_minutes', 'distinct_usernames_threshold', 'thresholds', 'start_hour', 'end_hour', 'tz', 'severity'].includes(k)) {
                    return null;
                  }
                  return (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: themeStyles.textMain, marginBottom: '5px', textTransform: 'capitalize' }}>
                        {k.replace(/_/g, ' ')}:
                      </label>
                      <input
                        type="text"
                        value={ruleParams[k]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRuleParams(prev => ({ ...prev, [k]: !isNaN(Number(val)) && val.trim() !== '' ? Number(val) : val }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: themeStyles.inputBorder,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: themeStyles.inputText,
                          background: themeStyles.inputBg,
                          outline: 'none'
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Live Generated Summary Preview */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: isDark ? 'rgba(30, 41, 59, 0.45)' : '#f8fafc', border: themeStyles.inputBorder }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: themeStyles.textMuted, marginBottom: '6px' }}>
                  Live Generated Output Parameters:
                </span>
                {renderRuleParameters(ruleParams)}
              </div>

              {/* Change Justification */}
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
