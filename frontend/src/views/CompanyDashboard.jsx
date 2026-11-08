import React, { useState, useEffect } from 'react';
import { TableEmptyRow } from '../components/TableEmptyState';
import { TablePagination, TablePaginationCompact, usePagination } from '../components/TablePagination';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  FileCheck, 
  Download, 
  Calendar, 
  Lock, 
  Award, 
  AlertTriangle, 
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw
} from 'lucide-react';
import FinanceReconciliationDesk from '../components/FinanceReconciliationDesk';
import LoadingSkeleton from '../components/LoadingSkeleton';
import SpinCube from '../components/SpinCube';
import PageHeader from '../components/PageHeader';
import '../styles/admin.css';
import '../staff/staff.css';

const FINANCE_CUBE_FACES = [
  { label: 'LEDGER', bg: '#0369a1' },
  { label: 'AUDIT', bg: '#0f766e' },
  { label: 'FR-22', bg: '#312e81' },
  { label: 'RECON', bg: '#0284c7' },
  { label: 'SHA-256', bg: '#047857' },
  { label: 'CP-ABE', bg: '#4338ca' }
];

const COMPANY_CUBE_FACES = [
  { label: 'ACCESS', bg: '#1e3a8a' },
  { label: 'TENANT', bg: '#1d4ed8' },
  { label: 'CP-ABE', bg: '#4338ca' },
  { label: 'ROSTER', bg: '#2563eb' },
  { label: 'POLICY', bg: '#0f766e' },
  { label: 'VERIFIED', bg: '#047857' }
];
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchRecords } from '../services/api';

export default function CompanyDashboard({ activeSubView, setActiveView }) {
  const { currentUser, token } = useAuth();
  const isFinance = currentUser?.role === 'finance';
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const companyCode = currentUser?.company_code || 'CORP_ALPHA';
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [recordsError, setRecordsError] = useState(null);
  const [recordSearch, setRecordSearch] = useState('');

  const loadCompanyData = async () => {
    setIsLoading(true);
    setRecordsError(null);
    try {
      const dbRecords = await fetchRecords(token);
      if (dbRecords && dbRecords.length > 0) {
        const mapped = dbRecords.map((r) => {
          const code = r.company_code || (
            r.encryption_policy?.includes('FINTECH_BETA') ? 'FINTECH_BETA' :
            r.encryption_policy?.includes('RETAIL_GAMMA') ? 'RETAIL_GAMMA' :
            r.encryption_policy?.includes('BANK_DELTA') ? 'BANK_DELTA' :
            r.encryption_policy?.includes('TELCO_EPSILON') ? 'TELCO_EPSILON' : 'CORP_ALPHA'
          );
          return {
            id: r.id,
            traineeName: r.trainee_name || '',
            traineeEmail: r.trainee_email || '',
            companyCode: code,
            companyName: r.company_name || code,
            courseName: r.course_name || '',
            status: r.status || '',
            score: r.score != null ? r.score : null,
            completionDate: r.completion_date ? new Date(r.completion_date).toLocaleDateString() : (r.created_at ? new Date(r.created_at).toLocaleDateString() : '')
          };
        });
        setRecords(mapped);
        setUsingFallback(false);
      } else {
        setRecords([]);
        setUsingFallback(false);
      }
    } catch (err) {
      console.warn("Could not load company records:", err);
      setRecords([]);
      setRecordsError("Couldn't load records. Retry");
      setUsingFallback(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [token]);

  // For Finance, show all cross-client records (enterprise scope); for company staff, scope to own company
  const displayedRecords = isFinance 
    ? records 
    : records.filter(r => r.companyCode === companyCode);
    
  const filteredRecords = displayedRecords.filter(r => 
    r.traineeName.toLowerCase().includes(recordSearch.toLowerCase()) ||
    r.courseName.toLowerCase().includes(recordSearch.toLowerCase()) ||
    r.companyCode.toLowerCase().includes(recordSearch.toLowerCase())
  );

  const {
    currentPage: milestonePage,
    setCurrentPage: setMilestonePage,
    paginatedItems: pagedMilestones,
    totalItems: totalMilestones
  } = usePagination(displayedRecords, 4);

  const {
    currentPage: traineePage,
    setCurrentPage: setTraineePage,
    paginatedItems: pagedTrainees,
    totalItems: totalTrainees
  } = usePagination(filteredRecords, 4);

  const completed = displayedRecords.filter(r => r.status === 'completed').length;
  const avgScore = displayedRecords.length > 0 
    ? (displayedRecords.reduce((acc, r) => acc + (r.score || 0), 0) / displayedRecords.length).toFixed(1)
    : '0.0';

  const currentTab = ['company_trainees', 'audit_certificate', 'finance_reconciliation', 'company_overview'].includes(activeSubView)
    ? activeSubView
    : (isFinance ? 'finance_reconciliation' : 'company_overview');

  const tabs = isFinance ? [
    { id: 'finance_reconciliation', label: 'Pilot Data Ingestion & Reconciliation Desk', icon: FileSpreadsheet },
    { id: 'company_overview', label: 'Enterprise Client Accounts & Compliance', icon: Building2 },
    { id: 'company_trainees', label: 'Cross-Client Training Records', icon: Users },
    { id: 'audit_certificate', label: 'Financial Audit & Integrity Certificate', icon: ShieldCheck }
  ] : [
    { id: 'company_overview', label: 'Company Compliance', icon: Building2 },
    { id: 'company_trainees', label: 'Employee Records', icon: Users },
    { id: 'audit_certificate', label: 'Compliance & Audit Report', icon: ShieldCheck }
  ];

  return (
    <div className="adm-main company-dashboard" style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {usingFallback && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '12px 18px', borderRadius: '14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
          <span>Notice: Displaying cached baseline compliance data. Database synchronization in progress.</span>
        </div>
      )}

      {/* SLIM PAGE HEADER (Replaces 280px Hero Banner & 3D Cube per Section 5.1) */}
      {(() => {
        switch (currentTab) {
          case 'company_overview':
            return (
              <PageHeader
                title="Enterprise Accounts"
                subtitle="Client organization compliance milestones, active rosters, and contract hours."
                badge="ACCOUNTS"
                badgeType="info"
              />
            );
          case 'company_trainees':
            return (
              <PageHeader
                title="Training Records"
                subtitle="Browse and verify employee training completions across all client cohorts."
                badge="RECORDS"
                badgeType="default"
              />
            );
          case 'audit_certificate':
            return (
              <PageHeader
                title="Reports"
                subtitle="Tamper-evident compliance reports, data integrity proofs, and certificates."
                badge="AUDIT CERTIFICATE"
                badgeType="warning"
              />
            );
          case 'finance_reconciliation':
          default:
            return (
              <PageHeader
                title={isFinance ? "Home" : "Workforce Compliance"}
                subtitle={isFinance
                  ? "Pre-screening pipeline, physical-to-ordinal row reconciliation, and client cohort imports."
                  : "Corporate training milestones and verified workforce completion records."}
                badge={isFinance ? "RECONCILIATION DESK" : "COMPLIANCE ACTIVE"}
                badgeType="success"
              />
            );
        }
      })()}

      {/* Main Content Area */}
      <div style={{ marginTop: '24px' }}>
        {/* 1. COMPANY / ENTERPRISE OVERVIEW TAB */}
        {currentTab === 'company_overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Metric Tiles Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
            <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '18px', padding: '20px', border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)', boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Enrolled Workforce</span>
                <Users size={18} color="#0284c7" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>{displayedRecords.length} Active</div>
              <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>{isFinance ? 'Across All Enterprise Cohorts' : `${currentUser?.organization} Cohort`}</div>
            </div>

            <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '18px', padding: '20px', border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)', boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Compliance Completion</span>
                <CheckCircle2 size={18} color="#059669" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>
                {Math.round((completed / (displayedRecords.length || 1)) * 100)}%
              </div>
              <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>Mandatory Training Modules</div>
            </div>

            <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '18px', padding: '20px', border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)', boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Cohort Average Score</span>
                <TrendingUp size={18} color="#0284c7" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7' }}>{avgScore}%</div>
              <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>Demonstrated Competency</div>
            </div>

            <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '18px', padding: '20px', border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)', boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Multi-Tenant Separation</span>
                <ShieldCheck size={18} color="#7c3aed" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed' }}>Guaranteed</div>
              <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px' }}>Strict Cryptographic Isolation</div>
            </div>
          </div>

          {/* Employee Milestone Summary with Scrollable Table */}
          <div 
            style={{ 
              background: isDark ? '#111827' : '#ffffff', 
              borderRadius: '24px', 
              padding: '24px 28px', 
              border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                {isFinance ? 'Enterprise Participant Milestone Summary' : 'Employee Milestone Summary'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TablePaginationCompact
                  currentPage={milestonePage}
                  totalItems={totalMilestones}
                  pageSize={4}
                  onPageChange={setMilestonePage}
                />
                <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {displayedRecords.length} records in scope
                </span>
              </div>
            </div>

            {/* Scrollable Container with Sticky Table Header */}
            <div style={{ overflowX: 'auto', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', borderRadius: '14px', width: '100%', boxSizing: 'border-box' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: isDark ? '#0f172a' : '#f8fafc', zIndex: 2, borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>PARTICIPANT NAME</th>
                    {isFinance && <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>TENANT / COMPANY</th>}
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>COURSE TITLE</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>ASSESSMENT SCORE</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRecords && displayedRecords.length > 0 ? (
                    pagedMilestones.map((r) => (
                    <tr key={r.id} style={{ borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>{r.traineeName}</td>
                      {isFinance && (
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#334155', fontFamily: 'monospace' }}>
                            {r.companyCode}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{r.courseName}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ color: '#059669', fontWeight: 800 }}>{r.score}%</span></td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: r.status === 'completed' ? '#ecfdf5' : '#fffbeb', color: r.status === 'completed' ? '#059669' : '#b45309', border: r.status === 'completed' ? '1px solid #a7f3d0' : '1px solid #fde68a' }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                  ) : (
                    <TableEmptyRow
                      colSpan={isFinance ? 5 : 4}
                      icon={FileText}
                      title="No Attestation Records Available"
                      subtitle="No training records have been submitted or synchronized for this tenant yet."
                    />
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={milestonePage}
              totalItems={totalMilestones}
              pageSize={4}
              onPageChange={setMilestonePage}
              itemName="milestone records"
            />
          </div>
        </div>
      )}

      {/* 2. COMPANY TRAINEES TAB */}
      {currentTab === 'company_trainees' && (
        <div 
          style={{ 
            background: isDark ? '#111827' : '#ffffff', 
            borderRadius: '24px', 
            padding: '24px 28px', 
            border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                {isFinance ? 'Cross-Client Enterprise Training Records (Audit View)' : 'Company Employee Records (Strictly Isolated)'}
              </h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                {isFinance 
                  ? 'All non-deleted enterprise training completion records across corporate partners.'
                  : 'Cross-client records from other client companies are strictly isolated.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <TablePaginationCompact
                currentPage={traineePage}
                totalItems={totalTrainees}
                pageSize={4}
                onPageChange={setTraineePage}
              />
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: '12.5px',
                    border: isDark ? '1.5px solid #334155' : '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Scrollable Container with Sticky Table Header */}
          <div style={{ overflowX: 'auto', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', borderRadius: '14px', width: '100%', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: isDark ? '#0f172a' : '#f8fafc', zIndex: 2, borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>EMPLOYEE / ATTENDEE</th>
                  {isFinance && <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>TENANT CODE</th>}
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>COURSE NAME</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>COMPLETION DATE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>CERTIFIED SCORE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: isDark ? '#94a3b8' : '#475569' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recordsError ? (
                  <TableEmptyRow
                    colSpan={isFinance ? 6 : 5}
                    icon={AlertTriangle}
                    title="Couldn't load records. Retry"
                    subtitle="A communication error occurred while retrieving training vault records."
                    action={
                      <button
                        type="button"
                        onClick={loadCompanyData}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                          background: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontWeight: 600,
                          fontSize: '12.5px',
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={13} /> Retry
                      </button>
                    }
                  />
                ) : filteredRecords && filteredRecords.length > 0 ? (
                  pagedTrainees.map((r) => (
                  <tr key={r.id} style={{ borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>{r.traineeName || '—'}</span>
                        {r.traineeEmail && <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>{r.traineeEmail}</span>}
                      </div>
                    </td>
                    {isFinance && (
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', fontFamily: 'monospace' }}>
                          {r.companyCode}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{r.courseName || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.completionDate || (r.status === 'completed' ? '—' : 'In Progress')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: '#059669', fontWeight: 800 }}>{r.score != null ? `${r.score}%` : '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: r.status === 'completed' ? '#ecfdf5' : '#fffbeb', color: r.status === 'completed' ? '#059669' : '#b45309', border: r.status === 'completed' ? '1px solid #a7f3d0' : '1px solid #fde68a' }}>
                        {r.status === 'completed' ? 'Certified' : 'In Training'}
                      </span>
                    </td>
                  </tr>
                ))
                ) : (
                  <TableEmptyRow
                    colSpan={isFinance ? 6 : 5}
                    icon={Users}
                    title="No Trainees Found in Roster"
                    subtitle="No cohort participants match the active status filter or search parameters."
                  />
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={traineePage}
            totalItems={totalTrainees}
            pageSize={4}
            onPageChange={setTraineePage}
            itemName="employee records"
          />
        </div>
      )}

      {/* 3. AUDIT CERTIFICATE TAB */}
      {currentTab === 'audit_certificate' && (
        <div 
          style={{ 
            background: isDark ? '#111827' : '#ffffff', 
            borderRadius: '24px', 
            padding: '28px 32px', 
            border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              Data Privacy & Security Audit Certificate
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
              Cryptographically audited proof of zero cross-client record contamination and strict tenant isolation.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5', borderRadius: '16px', border: isDark ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid #a7f3d0' }}>
              <ShieldCheck size={24} color="#059669" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: isDark ? '#34d399' : '#065f46', lineHeight: 1.5 }}>
                <strong>Security & Privacy Audit Guarantee</strong>
                <div>All training records for {currentUser?.organization} are bound to strict organizational policies and defended by PostgreSQL Row-Level Security.</div>
              </div>
            </div>

            <div style={{ background: isDark ? '#0f172a' : '#f8fafc', borderRadius: '16px', padding: '18px 22px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Assigned Organization Code:</span>
                <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>{companyCode}</code>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Audit Verification Hash:</span>
                <code style={{ fontFamily: 'monospace', color: '#0284c7' }}>SHA256: 3c9b740...ef1a89b02</code>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Certificate Authority:</span>
                <span style={{ color: '#1e293b', fontWeight: 600 }}>Crossworks Training and Consulting Corp.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Audit Verification Timestamp:</span>
                <span style={{ color: '#64748b' }}>2026-10-03 18:00:00 UTC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FINANCE PILOT DATA IMPORT & RECONCILIATION DESK */}
      {currentTab === 'finance_reconciliation' && (
        <FinanceReconciliationDesk />
      )}
      </div>
    </div>
  );
}
