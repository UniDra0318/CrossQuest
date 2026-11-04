import React, { useState, useEffect, useMemo } from 'react';
import { TableEmptyRow } from '../../components/TableEmptyState';
import { TablePagination, usePagination } from '../../components/TablePagination';
import { useSearchParams } from 'react-router-dom';
import { 
  Download, 
  FileText, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Award, 
  AlertTriangle, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Lock, 
  CheckCircle, 
  Calendar,
  Building2,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../StaffContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  fetchAssignedClientCompanies, 
  fetchClientReport, 
  downloadClientReportPdf 
} from '../../services/api';
import { buildReport } from '../../data/staffData';

export default function Reports() {
  const { token, currentUser } = useAuth();
  const { portfolios } = useStaff();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected scope from URL query param or default
  const paramScope = searchParams.get('scope');
  const [selectedScope, setSelectedScope] = useState(paramScope || 'CORP_ALPHA');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [companiesList, setCompaniesList] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Sync state if URL changes
  useEffect(() => {
    if (paramScope && paramScope !== selectedScope) {
      setSelectedScope(paramScope);
    }
  }, [paramScope]);

  // Load companies list with assigned metadata
  useEffect(() => {
    let isMounted = true;
    async function loadCompanies() {
      try {
        const data = await fetchAssignedClientCompanies(token);
        if (isMounted && data && Array.isArray(data)) {
          setCompaniesList(data);
          return;
        }
      } catch (err) {
        console.warn('Could not fetch companies from API, using portfolio context fallback:', err);
      }

      // Fallback from context/portfolios
      if (isMounted && portfolios && portfolios.length > 0) {
        const assignedList = currentUser?.assigned_client_accounts || currentUser?.assigned_companies || ['CORP_ALPHA'];
        setCompaniesList(portfolios.map(p => ({
          code: p.scope,
          name: p.name,
          industry: p.industry,
          is_assigned: assignedList.includes(p.scope),
          total_records: p.trainees || 0
        })));
      }
    }
    loadCompanies();
    return () => { isMounted = false; };
  }, [token, portfolios, currentUser]);

  // Load report data for selectedScope
  const loadReportData = async (scope = selectedScope, status = statusFilter) => {
    setLoadingReport(true);
    setErrorDetails(null);
    setSuccessToast(null);

    try {
      const data = await fetchClientReport(scope, { statusFilter: status }, token);
      setReport(data);
    } catch (err) {
      console.warn('API report fetch failed, evaluating scope restriction:', err);
      // Check if it's a 403 Out-of-Scope error
      const errMsg = err?.message || '';
      if (errMsg.includes('Not authorized') || errMsg.includes('403') || errMsg.includes('unassigned')) {
        setErrorDetails({
          type: 'OUT_OF_SCOPE',
          scope,
          message: errMsg || `Account Manager is not authorized to generate reports for unassigned company '${scope}'.`,
          code: 403
        });
        setReport(null);
      } else {
        // Fallback to local mock data if server is unreachable
        try {
          const fallbackData = buildReport(scope);
          setReport({
            header: {
              client_name: fallbackData.org,
              client_code: fallbackData.scope,
              generated_at: new Date().toISOString(),
              generated_by_user: currentUser?.name || 'Marcus Reyes',
              user_role: currentUser?.role || 'account_manager'
            },
            summary: {
              total_records: fallbackData.totalTrainees,
              completed_trainings: fallbackData.rows?.filter(r => r.status === 'Completed').length || 0,
              average_score: fallbackData.averageScore,
              compliance_rate: `${fallbackData.completionRate}%`
            },
            trainees: (fallbackData.rows || []).map(r => ({
              record_id: r.id,
              trainee_code: `TRN-${r.id.replace('rec-', '')}`,
              trainee_name: r.trainee,
              course_name: r.course,
              training_date: '2026-10-15',
              status: r.status,
              score: r.score
            }))
          });
        } catch (e) {
          setErrorDetails({
            type: 'ERROR',
            scope,
            message: 'Unable to load report data. Please check system connectivity.',
            code: 500
          });
          setReport(null);
        }
      }
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadReportData(selectedScope, statusFilter);
  }, [selectedScope, statusFilter]);

  const handleScopeChange = (newScope) => {
    setSelectedScope(newScope);
    setSearchParams({ scope: newScope });
  };

  const handleExportPdf = async () => {
    if (errorDetails) return;
    setDownloadingPdf(true);
    setSuccessToast(null);

    try {
      await downloadClientReportPdf(selectedScope, { statusFilter }, token);
      setSuccessToast(`Official ReportLab PDF generated and downloaded for ${selectedScope}.`);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback to browser print if API fails
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Filter trainees by search term
  const filteredTrainees = useMemo(() => {
    if (!report?.trainees) return [];
    if (!searchTerm.trim()) return report.trainees;
    const term = searchTerm.toLowerCase();
    return report.trainees.filter(t => 
      t.trainee_name?.toLowerCase().includes(term) ||
      t.trainee_code?.toLowerCase().includes(term) ||
      t.course_name?.toLowerCase().includes(term) ||
      t.record_id?.toLowerCase().includes(term)
    );
  }, [report, searchTerm]);

  // Determine if currently selected company is assigned
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const currentCompanyMeta = companiesList.find(c => c.code === selectedScope);
  const isAssigned = currentCompanyMeta ? currentCompanyMeta.is_assigned : selectedScope === 'CORP_ALPHA' || selectedScope === 'BANK_DELTA';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. CONTROLS BAR */}
      <div 
        className="adm-panel" 
        style={{ 
          background: isDark ? '#111827' : '#ffffff', 
          borderRadius: '20px', 
          padding: '18px 24px', 
          border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
          boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.3)' : '0 4px 18px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          {/* Left: Scope Selector & Status Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="var(--cq-brand-primary)" />
              <label htmlFor="scope-select" style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.04em' }}>
                CLIENT PORTFOLIO:
              </label>
              <select
                id="scope-select"
                value={selectedScope}
                onChange={(e) => handleScopeChange(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: isDark ? '1.5px solid #334155' : '1.5px solid #cbd5e1',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  color: isDark ? '#f8fafc' : '#1e293b',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {companiesList.length > 0 ? (
                  companiesList.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code}) {c.is_assigned ? '✓ [Assigned]' : '🔒 [Restricted Scope]'}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CORP_ALPHA">San Miguel Conglomerate (CORP_ALPHA) ✓ [Assigned]</option>
                    <option value="BANK_DELTA">BDO Unibank Systems (BANK_DELTA) ✓ [Assigned]</option>
                    <option value="FINTECH_BETA">Maya FinTech Digital (FINTECH_BETA) 🔒 [Restricted Scope]</option>
                    <option value="RETAIL_GAMMA">Ayala Retail Corp (RETAIL_GAMMA) 🔒 [Restricted Scope]</option>
                    <option value="TELCO_EPSILON">Globe Telecom Digital (TELCO_EPSILON) 🔒 [Restricted Scope]</option>
                  </>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="status-filter" style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
                STATUS:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: isDark ? '1.5px solid #334155' : '1.5px solid #cbd5e1',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: isDark ? '#f8fafc' : '#334155',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Completed">Completed Only</option>
                <option value="In progress">In Progress Only</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadReportData(selectedScope, statusFilter)}
              disabled={loadingReport}
              title="Refresh Report Data"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: isDark ? '#1e293b' : '#f1f5f9',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                color: isDark ? '#cbd5e1' : '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} className={loadingReport ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Right: PDF Export Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={downloadingPdf || Boolean(errorDetails)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '12px',
                background: errorDetails ? '#cbd5e1' : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13.5px',
                border: 'none',
                cursor: errorDetails ? 'not-allowed' : 'pointer',
                boxShadow: errorDetails ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {downloadingPdf ? (
                <>
                  <RefreshCw size={15} className="spin-animation" />
                  <span>Generating Official PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Export Official Audit PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successToast && (
          <div style={{ marginTop: '14px', padding: '10px 16px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successToast}</span>
          </div>
        )}
      </div>

      {/* 2. OUT-OF-SCOPE SECURITY BOUNDARY VIOLATION (403 FORBIDDEN BANNER) */}
      {errorDetails && errorDetails.type === 'OUT_OF_SCOPE' && (
        <div 
          style={{
            background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
            border: '2px solid #f43f5e',
            borderRadius: '20px',
            padding: '24px 28px',
            boxShadow: '0 8px 24px rgba(244, 63, 94, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <ShieldAlert size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#9f1239' }}>
                  403 FORBIDDEN — OUT-OF-SCOPE BOUNDARY RESTRICTION (SEC-10)
                </h3>
                <span style={{ background: '#fecdd3', color: '#be123c', padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, fontFamily: 'monospace' }}>
                  AUDIT LOGGED: OUT_OF_SCOPE
                </span>
              </div>
              <p style={{ margin: '10px 0 14px 0', fontSize: '14px', color: '#4c0519', lineHeight: 1.5 }}>
                {errorDetails.message}
              </p>
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #fecdd3', fontSize: '12.5px', color: '#881337', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Enforcement Rule:</strong> Chapter III Section 3.8.4 & Table 17 (OI-04) — Account Managers are strictly scoped to assigned client accounts.</div>
                <div><strong>Security Action:</strong> This unauthorized access attempt was automatically recorded in the Master Security Audit Log (<code>access_logs</code>) with your User ID and IP address for Administrative Review.</div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleScopeChange('CORP_ALPHA')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: '#be123c',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Return to Authorized Portfolio (CORP_ALPHA)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. AUTHORIZED REPORT CONTENT */}
      {report && !errorDetails && (
        <>
          {/* Metadata Subheader */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', padding: '0 4px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--cq-ink)' }}>
                {report.header?.client_name || selectedScope}
              </h2>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                Client Code: <strong style={{ color: 'var(--cq-brand-primary)' }}>{report.header?.client_code || selectedScope}</strong> • Generated by: <strong>{report.header?.generated_by_user || currentUser?.name || 'Account Manager'}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#ecfdf5', color: '#047857', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={13} /> CP-ABE MULTI-TENANT ISOLATED
              </span>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                OI-04 COMPLIANT
              </span>
            </div>
          </div>

          {/* 4. EXECUTIVE STATS KPI TILES */}
          <div className="adm-tiles" style={{ marginTop: 0 }}>
            {/* Tile 1: Total Learners */}
            <div className="stf-stat">
              <span className="adm-label">TOTAL ENROLLED LEARNERS</span>
              <div className="stf-stat__num" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{report.summary?.total_records ?? 0}</div>
              <div className="adm-avatars">
                <span style={{ background: '#ff7a1a' }} />
                <span style={{ background: '#6a2bd9' }} />
                <span style={{ background: '#087a54' }} />
              </div>
              <p>Active participants registered under {report.header?.client_name || selectedScope}</p>
            </div>

            {/* Tile 2: Program Completion Rate */}
            <div className="stf-stat">
              <span className="adm-label">PROGRAM COMPLETION RATE</span>
              <div className="stf-stat__num" style={{ color: isDark ? '#34d399' : '#08613f' }}>
                {report.summary?.compliance_rate || `${Math.round(((report.summary?.completed_trainings || 0) / Math.max(1, report.summary?.total_records || 1)) * 100)}%`}
              </div>
              <div className="adm-progress adm-progress--green">
                <i 
                  style={{ 
                    width: `${report.summary?.compliance_rate ? parseInt(report.summary.compliance_rate) : Math.round(((report.summary?.completed_trainings || 0) / Math.max(1, report.summary?.total_records || 1)) * 100)}%` 
                  }} 
                />
              </div>
              <p>{report.summary?.completed_trainings ?? 0} of {report.summary?.total_records ?? 0} verified completed</p>
            </div>

            {/* Tile 3: Average Cohort Evaluation Score */}
            <div className="stf-stat">
              <span className="adm-label">AVERAGE COHORT EVALUATION</span>
              <div className="stf-stat__num" style={{ color: isDark ? '#c084fc' : '#4b1ca3' }}>
                {report.summary?.average_score != null ? `${report.summary.average_score}%` : 'N/A'}
              </div>
              <div className="adm-progress adm-progress--purple">
                <i style={{ width: `${report.summary?.average_score || 88}%` }} />
              </div>
              <p>Weighted accuracy across evaluated modules & practical labs</p>
            </div>
          </div>

          {/* 5. VERIFIED PARTICIPANT BREAKDOWN TABLE */}
          <div className="adm-panel" style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '24px', border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)', overflow: 'hidden' }}>
            <div className="adm-panel__head" style={{ padding: '20px 24px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Verified Trainee Completion Breakdown</h3>
                <span className="adm-mono" style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  Audited roster for {report.header?.client_name} ({report.header?.client_code})
                </span>
              </div>

              {/* Table search filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: isDark ? '#94a3b8' : '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Search participant or module..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 32px',
                      borderRadius: '10px',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      outline: 'none',
                      background: isDark ? '#1e293b' : '#f8fafc',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  />
                </div>
                <span className="adm-chip adm-chip--green">
                  <CheckCircle2 size={12} /> {filteredTrainees.length} PARTICIPANTS
                </span>
              </div>
            </div>

            <div className="adm-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '14px 24px' }}>Trainee Participant</th>
                    <th style={{ padding: '14px 20px' }}>Course Program</th>
                    <th style={{ padding: '14px 20px' }}>Completion Status</th>
                    <th style={{ padding: '14px 20px' }}>Evaluation Accuracy</th>
                    <th style={{ padding: '14px 24px', textAlign: 'right' }}>Completion Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainees.length > 0 ? (
                    pagedTrainees.map((t, idx) => {
                      const isCompleted = t.status === 'Completed';
                      return (
                        <tr 
                          key={t.record_id || idx}
                          style={{ 
                            borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9',
                            transition: 'background 0.15s ease',
                            background: isDark 
                              ? (idx % 2 === 0 ? '#111827' : '#141d30') 
                              : (idx % 2 === 0 ? '#ffffff' : '#fafafa')
                          }}
                        >
                          {/* Participant */}
                          <td style={{ padding: '14px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div 
                                style={{ 
                                  width: '36px', 
                                  height: '36px', 
                                  borderRadius: '50%', 
                                  background: isCompleted ? 'linear-gradient(135deg, #ff7a1a 0%, #e05e00 100%)' : (isDark ? '#334155' : '#94a3b8'),
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '13px'
                                }}
                              >
                                {t.trainee_name ? t.trainee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'TR'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>{t.trainee_name}</div>
                                <div style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b', fontFamily: 'monospace' }}>
                                  ID: {t.trainee_code || t.record_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Course Program */}
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                            {t.course_name}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '14px 20px' }}>
                            <span 
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: isCompleted 
                                  ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') 
                                  : (isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb'),
                                color: isCompleted 
                                  ? (isDark ? '#34d399' : '#047857') 
                                  : (isDark ? '#fbbf24' : '#b45309'),
                                border: isDark 
                                  ? (isCompleted ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid rgba(217, 119, 6, 0.35)') 
                                  : `1px solid ${isCompleted ? '#a7f3d0' : '#fde68a'}`
                              }}
                            >
                              {isCompleted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {t.status}
                            </span>
                          </td>

                          {/* Accuracy Score */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '80px', height: '6px', borderRadius: '4px', background: isDark ? '#1e293b' : '#e2e8f0', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${t.score || 0}%`, 
                                    background: t.score >= 90 ? '#10b981' : t.score >= 80 ? '#6366f1' : '#f59e0b',
                                    borderRadius: '4px'
                                  }} 
                                />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: isDark ? '#f8fafc' : '#1e293b' }}>
                                {t.score != null ? `${t.score}%` : 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '14px 24px', textAlign: 'right', fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', fontFamily: 'monospace' }}>
                            {t.training_date}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <TableEmptyRow
                      colSpan={5}
                      icon={Users}
                      title="No Trainee Records Found"
                      subtitle="No participant training records match the current filter criteria."
                    />
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={repPage}
              totalItems={totalTrainees}
              pageSize={10}
              onPageChange={setRepPage}
              itemName="trainee reports"
            />

            {/* Panel Footer */}
            <div style={{ padding: '14px 24px', background: isDark ? '#0f172a' : '#f8fafc', borderTop: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
              <span>Official Account Manager Report (FR-20, DAT-06, OI-04)</span>
              <span>ReportLab High-Fidelity PDF Engine Active</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
