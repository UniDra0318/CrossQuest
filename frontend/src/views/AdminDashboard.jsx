import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  UserCheck, 
  Users,
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
  Download,
  Copy,
  Check,
  Eye,
  CheckSquare,
  UserPlus,
  Building2,
  X,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { TableEmptyBlock } from '../components/TableEmptyState';
import { TablePagination, TablePaginationCompact, usePagination } from '../components/TablePagination';
import { 
  admin as defaultAdmin, 
  overview as defaultOverview, 
  staff as defaultStaff, 
  clients as defaultClients, 
  anomalies as defaultAnomalies, 
  records as defaultRecords, 
  settings as defaultSettings 
} from '../data/adminData';
import { exportAuditLogs, exportVaultRecords } from '../api/admin';
import { 
  fetchRecords, 
  fetchAnomalies, 
  fetchCompanies, 
  fetchStaffUsers, 
  fetchSystemOverview,
  fetchAnomalyRules,
  updateStaffAttributes, 
  createUserApi, 
  createCompanyApi 
} from '../services/api';
import BitMascot from '../components/BitMascot/BitMascot';
import AdminPeerReviewAnomalyDesk from '../components/AdminPeerReviewAnomalyDesk';
import TenantAssignmentPicker from '../components/TenantAssignmentPicker';
import PageHeader from '../components/PageHeader';
import Overview from '../admin/pages/Overview';
import PeopleAccess from '../admin/pages/PeopleAccess';
import Alerts from '../admin/pages/Alerts';
import RecordsVault from '../admin/pages/RecordsVault';
import SystemSettings from '../admin/pages/SystemSettings';
import '../styles/admin.css';
export default function AdminDashboard({ activeSubView, setActiveView }) {
  const { token, currentUser } = useAuth();
  const { isDark } = useTheme();
  const [adminProfile] = useState(defaultAdmin);
  const [overview, setOverview] = useState(defaultOverview);
  const [clients] = useState(defaultClients);
  const [staffList, setStaffList] = useState(defaultStaff);
  const [anomalies, setAnomalies] = useState(defaultAnomalies);
  const [records, setRecords] = useState(defaultRecords);
  const [settings] = useState(defaultSettings);
  const [liveRules, setLiveRules] = useState([]);
  const [editingStaffUser, setEditingStaffUser] = useState(null);

  // Helper to format staff users consistently for PeopleAccess table
  const formatStaffUser = (u) => {
    const roleNorm = (u.role || 'STAFF').toLowerCase();
    const defaultLevel = roleNorm.includes('admin') ? 3 :
      (roleNorm.includes('account') || roleNorm.includes('staff') || roleNorm.includes('finance')) ? 2 : 1;
    const level = (typeof u.clearance_level === 'number' && u.clearance_level >= 1 && u.clearance_level <= 3)
      ? u.clearance_level
      : defaultLevel;

    return {
      id: u.id,
      name: u.full_name || u.name,
      initials: (u.full_name || u.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      email: u.email,
      role: (u.role || 'STAFF').replace(/_/g, ' ').toUpperCase(),
      level: level,
      clients: u.assigned_client_accounts || ['CORP_ALPHA'],
      is_active: u.is_active !== false,
      tone: u.role === 'admin' ? 'purple' : u.role === 'trainer' ? 'green' : u.role === 'trainee' ? 'blue' : 'orange'
    };
  };

  // Client Companies & Tenancy Registry State
  const DEFAULT_COMPANIES = [
    { code: 'CORP_ALPHA', name: 'San Miguel Conglomerate Holdings', industry: 'Conglomerate & Industrial', am_name: 'Erika Bana' },
    { code: 'FINTECH_BETA', name: 'Maya FinTech Digital Innovations', industry: 'Financial Services & Digital Payments', am_name: 'Sharon De Vera' },
    { code: 'RETAIL_GAMMA', name: 'Ayala Retail Omnichannel Corp', industry: 'Retail & Supply Chain', am_name: 'Sharon De Vera' },
    { code: 'BANK_DELTA', name: 'BDO Unibank Enterprise Systems', industry: 'Commercial Banking & Capital Markets', am_name: 'Erika Bana' },
    { code: 'TELCO_EPSILON', name: 'Globe Telecom Digital Infrastructure', industry: 'Telecommunications & Cloud', am_name: 'Brian Mendoza' }
  ];
  const [companiesList, setCompaniesList] = useState(DEFAULT_COMPANIES);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    code: '',
    name: '',
    industry: 'Enterprise & Financial Services',
    assigned_am_id: ''
  });
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [createCompanyError, setCreateCompanyError] = useState(null);
  const [createdCompanyResult, setCreatedCompanyResult] = useState(null);

  const handleCreateCompanySubmit = async (e) => {
    e.preventDefault();
    setIsCreatingCompany(true);
    setCreateCompanyError(null);

    const cleanCode = newCompanyForm.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const cleanName = newCompanyForm.name.trim();

    const companyRes = await createCompanyApi({
      code: cleanCode,
      name: cleanName,
      industry: newCompanyForm.industry.trim()
    }, token);

    setIsCreatingCompany(false);

    if (companyRes.ok) {
      const selectedAm = staffList.find(s => s.id === newCompanyForm.assigned_am_id);
      
      // If AM was selected, update their assignments
      if (selectedAm && token) {
        try {
          const currentClients = selectedAm.clients || [];
          if (!currentClients.includes(cleanCode)) {
            await updateStaffAttributes(selectedAm.id, {
              role: selectedAm.role.toLowerCase().replace(/ /g, '_'),
              clearance_level: selectedAm.level || 1,
              assigned_client_accounts: [...currentClients, cleanCode]
            }, token);
          }
        } catch (err) {
          console.warn("Could not bind AM to company:", err);
        }
      }

      const newCompObj = {
        code: cleanCode,
        name: cleanName,
        industry: newCompanyForm.industry.trim(),
        am_name: selectedAm?.name || 'Erika Bana'
      };

      setCompaniesList(prev => [newCompObj, ...prev]);
      setCreatedCompanyResult({
        ...companyRes.data,
        attribute_token: `CLIENT${cleanCode}V1`,
        assigned_am: selectedAm?.name || 'Erika Bana'
      });
    } else {
      setCreateCompanyError(companyRes.error || 'Failed to create client company.');
    }
  };

  const handleCloseCompanyModal = () => {
    setIsCreateCompanyOpen(false);
    setCreatedCompanyResult(null);
    setCreateCompanyError(null);
    setNewCompanyForm({
      code: '',
      name: '',
      industry: 'Enterprise & Financial Services',
      assigned_am_id: ''
    });
  };

  // Provision User Modal state (FR-02, SEC-01)
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    full_name: '',
    email: '',
    role: 'account_manager',
    assigned_client_accounts: ['CORP_ALPHA'],
    temporary_password: ''
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState(null);
  const [createdUserResult, setCreatedUserResult] = useState(null);
  const [copiedActivationLink, setCopiedActivationLink] = useState(false);

  const handleToggleNewUserClient = (code) => {
    setNewUserForm(prev => {
      const exists = prev.assigned_client_accounts.includes(code);
      return {
        ...prev,
        assigned_client_accounts: exists
          ? prev.assigned_client_accounts.filter(c => c !== code)
          : [...prev.assigned_client_accounts, code]
      };
    });
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setCreateUserError(null);

    const payload = {
      full_name: newUserForm.full_name.trim(),
      email: newUserForm.email.trim().toLowerCase(),
      role: newUserForm.role,
      assigned_client_accounts: newUserForm.assigned_client_accounts,
      temporary_password: newUserForm.temporary_password.trim() || undefined
    };

    const userRes = await createUserApi(payload, token);
    setIsCreatingUser(false);

    if (userRes.ok) {
      setCreatedUserResult(userRes.data);
      const u = userRes.data.user;
      const roleNorm = (u.role || 'STAFF').toLowerCase();
      const defaultLevel = roleNorm.includes('admin') ? 3 :
        (roleNorm.includes('account') || roleNorm.includes('finance') || roleNorm.includes('staff')) ? 2 : 1;
      const level = (typeof u.clearance_level === 'number' && u.clearance_level >= 1 && u.clearance_level <= 3)
        ? u.clearance_level
        : defaultLevel;

      setStaffList(prev => [
        {
          id: u.id,
          name: u.full_name,
          initials: u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          email: u.email,
          role: u.role.replace(/_/g, ' ').toUpperCase(),
          level: level,
          clients: u.assigned_client_accounts || ['CORP_ALPHA'],
          tone: u.role === 'admin' ? 'purple' : u.role === 'trainer' ? 'green' : u.role === 'finance' ? 'blue' : 'orange'
        },
        ...prev
      ]);
    } else {
      setCreateUserError(userRes.error || 'Failed to provision user.');
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateUserOpen(false);
    setCreatedUserResult(null);
    setCreateUserError(null);
    setNewUserForm({
      full_name: '',
      email: '',
      role: 'account_manager',
      assigned_client_accounts: ['CORP_ALPHA'],
      temporary_password: ''
    });
  };

  const handleCopyActivationLink = () => {
    if (!createdUserResult?.activation_link) return;
    const fullLink = `${window.location.origin}${createdUserResult.activation_link}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedActivationLink(true);
    setTimeout(() => setCopiedActivationLink(false), 2000);
  };
  const [editForm, setEditForm] = useState({ role: '', level: 1, clients: [] });
  const [anomalyFilter, setAnomalyFilter] = useState('ALL');
  const [staffSearch, setStaffSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [exportingAuditLogs, setExportingAuditLogs] = useState(false);
  const [exportingVaultRecords, setExportingVaultRecords] = useState(false);
  const [vaultToast, setVaultToast] = useState(null);

  const handleExportAuditLogs = async () => {
    if (exportingAuditLogs) return;
    setExportingAuditLogs(true);
    setVaultToast(null);
    try {
      const ok = await exportAuditLogs(token);
      if (ok) {
        setVaultToast({ type: 'success', text: 'Master Audit Logs (CSV) exported successfully.' });
      } else {
        setVaultToast({ type: 'error', text: 'Failed to export master audit logs.' });
      }
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Export error.' });
    } finally {
      setExportingAuditLogs(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  const handleExportVaultRecords = async () => {
    if (exportingVaultRecords) return;
    setExportingVaultRecords(true);
    setVaultToast(null);
    try {
      const ok = await exportVaultRecords(token);
      if (ok) {
        setVaultToast({ type: 'success', text: 'Master Vault Training Records (CSV) exported successfully.' });
      } else {
        setVaultToast({ type: 'error', text: 'Failed to export vault records.' });
      }
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Export error.' });
    } finally {
      setExportingVaultRecords(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };
  const [companySearch, setCompanySearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  // Sync real data from database if available
  useEffect(() => {
    async function loadAdminData() {
      if (!token) return;
      try {
        const [dbRecords, dbAnomalies, dbCompanies, dbStaff, dbOverview, dbRules] = await Promise.all([
          fetchRecords(token),
          fetchAnomalies(token),
          fetchCompanies(token),
          fetchStaffUsers(token),
          fetchSystemOverview(token),
          fetchAnomalyRules(token)
        ]);
        if (dbRules && dbRules.length > 0) {
          setLiveRules(dbRules);
        }
        if (dbOverview) {
          setOverview(prev => ({
            ...prev,
            usersTotal: dbOverview.users_total,
            usersActiveNow: dbOverview.users_active_now,
            clientsTotal: dbOverview.clients_total,
            policiesEnforced: dbOverview.policies_enforced,
            anomalies24h: dbOverview.anomalies_24h,
            systemStatus: dbOverview.system_status
          }));
        }
        if (dbCompanies && dbCompanies.length > 0) {
          setCompaniesList(dbCompanies.map(c => {
            const am = (dbStaff || []).find(u => u.role === 'account_manager' && (u.assigned_client_accounts || []).includes(c.code))
              || (dbStaff || []).find(u => (u.assigned_client_accounts || []).includes(c.code));
            return {
              id: c.id,
              code: c.code,
              name: c.name,
              industry: c.industry || 'Enterprise Client',
              am_name: am?.full_name || am?.name || (c.code === 'TELCO_EPSILON' ? 'Brian Mendoza' : 'Unassigned')
            };
          }));
        }
        if (dbStaff && dbStaff.length > 0) {
          setStaffList(dbStaff.map(formatStaffUser));
        }
        if (dbRecords && dbRecords.length > 0) {
          setRecords(dbRecords.map((r, idx) => {
            const compCode = r.company_code || (
              r.encryption_policy?.includes('FINTECH_BETA') ? 'FINTECH_BETA' :
              r.encryption_policy?.includes('RETAIL_GAMMA') ? 'RETAIL_GAMMA' :
              r.encryption_policy?.includes('BANK_DELTA') ? 'BANK_DELTA' :
              r.encryption_policy?.includes('TELCO_EPSILON') ? 'TELCO_EPSILON' : 'CORP_ALPHA'
            );
            return {
              id: r.id || `rec-${100 + idx}`,
              trainee: r.trainee_name || '',
              email: r.trainee_email || '',
              org: r.company_name || compCode || '',
              course: r.course_name || '',
              policy: r.encryption_policy || `(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:${compCode})`,
              status: (r.status || 'COMPLETED').toUpperCase()
            };
          }));
        }
        if (dbAnomalies && dbAnomalies.length > 0) {
          setAnomalies(dbAnomalies.map(a => {
            const subject = (dbStaff || []).find(s => s.id === a.subject_user_id);
            return {
              id: a.id,
              type: a.rule_code || 'OUT_OF_SCOPE',
              name: subject?.full_name || subject?.name || 'Staff User',
              email: subject?.email || (a.rule_code?.includes('DELETION') ? 'trainer.lead@crossworks.ph' : 'staff@crossworks.ph'),
              message: a.description || 'Unauthorized decryption attempt detected outside scope.',
              at: a.created_at ? new Date(a.created_at).toLocaleString() : '2026-10-03 14:18:22',
              status: a.status === 'CLOSED' ? 'RESOLVED' : 'UNREVIEWED',
              severity: a.severity_final || a.severity || 'MEDIUM'
            };
          }));
        }
      } catch (err) {
        console.warn("Could not load backend admin data, using robust local state:", err);
        setUsingFallback(true);
      }
    }
    loadAdminData();
  }, [token]);

  // Always refresh rules when visiting Settings tab
  useEffect(() => {
    if (activeSubView === 'system_settings' && token) {
      fetchAnomalyRules(token)
        .then(rules => {
          if (rules && rules.length > 0) setLiveRules(rules);
        })
        .catch(console.warn);
    }
  }, [activeSubView, token]);

  // Start inline editing staff
  const startEditStaff = (user) => {
    setEditingStaffUser(user);
    const roleNorm = (user.role || '').toLowerCase();
    const defaultLevel = roleNorm.includes('admin') ? 3 :
      (roleNorm.includes('account') || roleNorm.includes('staff') || roleNorm.includes('finance')) ? 2 : 1;
    setEditForm({
      role: user.role,
      level: user.level || defaultLevel,
      clients: [...(user.clients || [])]
    });
  };
  // Save staff attributes
  const handleSaveStaff = async (id) => {
    if (token) {
      try {
        await updateStaffAttributes(id, {
          role: editForm.role.toLowerCase().replace(/ /g, '_'),
          clearance_level: editForm.level,
          assigned_client_accounts: editForm.clients
        }, token);
      } catch (e) {
        console.warn("Error persisting staff update:", e);
      }
    }
    setStaffList(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          role: editForm.role,
          level: editForm.level,
          clients: editForm.clients
        };
      }
      return s;
    }));
    setEditingStaffUser(null);
  };
  const toggleClientInEdit = (clientCode) => {
    setEditForm(prev => {
      const exists = prev.clients.includes(clientCode);
      return {
        ...prev,
        clients: exists ? prev.clients.filter(c => c !== clientCode) : [...prev.clients, clientCode]
      };
    });
  };
  const handleCopyPublicKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(overview.architecture.publicKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };
  const unreviewedCount = anomalies.filter(a => a.status === 'UNREVIEWED').length;
  const filteredAnomalies = anomalies.filter(a => {
    if (anomalyFilter === 'UNREVIEWED') return a.status === 'UNREVIEWED';
    if (anomalyFilter === 'RESOLVED') return a.status === 'RESOLVED';
    return true;
  });
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) || 
    s.email.toLowerCase().includes(staffSearch.toLowerCase())
  );
  const filteredCompanies = companiesList.filter(c =>
    (c.name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(companySearch.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(companySearch.toLowerCase()) ||
    (c.am_name || '').toLowerCase().includes(companySearch.toLowerCase())
  );
  const filteredRecords = records.filter(r => 
    r.trainee.toLowerCase().includes(recordSearch.toLowerCase()) || 
    r.course.toLowerCase().includes(recordSearch.toLowerCase()) ||
    r.org.toLowerCase().includes(recordSearch.toLowerCase()) ||
    r.id.toLowerCase().includes(recordSearch.toLowerCase())
  );

  const {
    currentPage: staffPage,
    setCurrentPage: setStaffPage,
    paginatedItems: pagedStaff,
    totalItems: totalStaff
  } = usePagination(filteredStaff, 4);

  const {
    currentPage: companyPage,
    setCurrentPage: setCompanyPage,
    paginatedItems: pagedCompanies,
    totalItems: totalCompanies
  } = usePagination(filteredCompanies, 4);

  const {
    currentPage: recordPage,
    setCurrentPage: setRecordPage,
    paginatedItems: pagedRecords,
    totalItems: totalRecords
  } = usePagination(filteredRecords, 4);
  return (
    <div className="adm-main admin-dashboard">
      {usingFallback && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '10px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#d97706" />
          <span>Notice: Displaying cached baseline data. Live telemetry synchronization in progress or server offline.</span>
        </div>
      )}
      {/* SLIM PAGE HEADER (Replaces 280px Hero Banner & 3D Cube per Section 5.1) */}
      {(() => {
        switch (activeSubView) {
          case 'records_vault':
          case 'attribute_authority':
          case 'anomalies':
          case 'system_settings':
            return null;
          case 'admin_overview':
          default:
            return (
              <PageHeader
                title="Home"
                subtitle="Platform health, security posture score, and operational activity across enterprise cohorts."
                badge="AUTHORITY ACTIVE"
                badgeType="success"
                actions={
                  unreviewedCount > 0 ? (
                    <button
                      type="button"
                      className="adm-btn adm-btn--primary"
                      onClick={() => setActiveView && setActiveView('anomalies')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <AlertTriangle size={14} />
                      <span>Review {unreviewedCount} Pending Alert{unreviewedCount > 1 ? 's' : ''}</span>
                    </button>
                  ) : null
                }
              />
            );
        }
      })()}
      {/* =====================================================================
          VIEW 1: SECURITY OVERVIEW
          ===================================================================== */}
      {/* Route-driven Modular Admin Pages */}
      {(!activeSubView || activeSubView === 'admin_overview' || !['attribute_authority', 'anomalies', 'records_vault', 'system_settings'].includes(activeSubView)) && (
        <Overview
          overview={overview}
          unreviewedCount={unreviewedCount}
          clients={clients}
          staffList={staffList}
          anomalies={anomalies}
          onNavigateTab={setActiveView}
        />
      )}

      {activeSubView === 'attribute_authority' && (
        <PeopleAccess
          staffList={staffList}
          companiesList={companiesList}
          onOpenCreateUserModal={() => setIsCreateUserOpen(true)}
          onOpenCreateCompanyModal={() => setIsCreateCompanyOpen(true)}
          startEditStaff={startEditStaff}
          token={token}
          onRefreshStaff={async () => {
            const s = await fetchStaffUsers(token);
            if (s && s.length > 0) setStaffList(s.map(formatStaffUser));
          }}
        />
      )}

      {activeSubView === 'anomalies' && (
        <Alerts onRuleUpdated={(updated) => {
          setLiveRules(prev => {
            const exists = prev.some(r => r.rule_code === updated.rule_code);
            return exists ? prev.map(r => r.rule_code === updated.rule_code ? updated : r) : [...prev, updated];
          });
        }} />
      )}

      {activeSubView === 'records_vault' && (
        <RecordsVault
          records={records}
          token={token}
          onRefreshRecords={async () => {
            const dbRecs = await fetchRecords(token);
            if (dbRecs) setRecords(dbRecs);
          }}
        />
      )}

      {activeSubView === 'system_settings' && (
        <SystemSettings
          settings={settings}
          liveRules={liveRules}
          token={token}
          onRuleUpdated={(updated) => {
            setLiveRules(prev => {
              const exists = prev.some(r => r.rule_code === updated.rule_code);
              return exists ? prev.map(r => r.rule_code === updated.rule_code ? updated : r) : [...prev, updated];
            });
          }}
          onTuneRules={() => setActiveView && setActiveView('anomalies')}
        />
      )}

      {/* =====================================================================
          REGISTER CLIENT COMPANY MODAL
          ===================================================================== */}
      {isCreateCompanyOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCreatingCompany) handleCloseCompanyModal();
          }}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    {createdCompanyResult ? 'Company Registered' : 'Register New Client Company'}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Enterprise Multi-Tenant Onboarding & CP-ABE Token Activation
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseCompanyModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>
              {createdCompanyResult ? (
                /* SUCCESS VIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#ecfdf5', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: '#065f46', lineHeight: 1.5 }}>
                      <strong>Enterprise Client Company successfully registered!</strong>
                      <div>The company code is active and Row-Level Security isolation is enforced.</div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Company Name:</span>
                      <strong style={{ color: '#1e293b' }}>{createdCompanyResult.name}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Tenant Code:</span>
                      <code style={{ color: '#0284c7', fontFamily: 'monospace', fontWeight: 800 }}>{createdCompanyResult.code}</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>CP-ABE Token:</span>
                      <span style={{ color: '#7c3aed', fontFamily: 'monospace', fontWeight: 800 }}>
                        {createdCompanyResult.attribute_token}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Assigned AM:</span>
                      <span style={{ color: '#1e293b', fontWeight: 700 }}>{createdCompanyResult.assigned_am}</span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                    Training records for this tenant will now be encrypted with <code>{createdCompanyResult.attribute_token}</code>. The assigned Account Manager can immediately generate scoped compliance reports.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleCloseCompanyModal}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '10px',
                        background: '#1e293b',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* FORM VIEW */
                <form onSubmit={handleCreateCompanySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      COMPANY FULL LEGAL NAME:
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Jollibee Foods Corporation"
                      value={newCompanyForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const autoCode = name.replace(/[^A-Za-z0-9]/g, '_').toUpperCase().slice(0, 16);
                        setNewCompanyForm({ ...newCompanyForm, name, code: newCompanyForm.code || autoCode });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      <span>COMPANY TENANT CODE:</span>
                      <span style={{ color: '#0284c7', fontSize: '11px', fontFamily: 'monospace' }}>Bound to CP-ABE</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. JLL_BEE"
                      value={newCompanyForm.code}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, code: e.target.value.toUpperCase() })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      INDUSTRY SECTOR:
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Food, Beverage & Hospitality"
                      value={newCompanyForm.industry}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, industry: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      PRIMARY ASSIGNED ACCOUNT MANAGER:
                    </label>
                    <select
                      value={newCompanyForm.assigned_am_id}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, assigned_am_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        fontWeight: 600,
                        color: '#1e293b',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select Account Manager...</option>
                      {staffList.filter(s => s.role.includes('STAFF') || s.role.includes('ACCOUNT')).map(am => (
                        <option key={am.id} value={am.id}>{am.name} ({am.email})</option>
                      ))}
                    </select>
                  </div>

                  {createCompanyError && (
                    <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12.5px' }}>
                      {createCompanyError}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={handleCloseCompanyModal}
                      disabled={isCreatingCompany}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingCompany || !newCompanyForm.code.trim() || !newCompanyForm.name.trim()}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: isCreatingCompany ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                      }}
                    >
                      {isCreatingCompany ? (
                        <>
                          <RefreshCw size={14} className="spin-animation" />
                          <span>Activating Tenant...</span>
                        </>
                      ) : (
                        <>
                          <Building2 size={14} />
                          <span>Register & Activate CP-ABE Tenant</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}


      {/* =====================================================================
          PROVISION NEW USER MODAL (FR-02, SEC-01)
          ===================================================================== */}
      {/* =====================================================================
          3. STAFF PERMISSIONS & CLEARANCE EDIT MODAL (POPUP DIALOG)
          ===================================================================== */}
      {editingStaffUser && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingStaffUser(null);
          }}
        >
          <div 
            style={{
              background: isDark ? '#0f172a' : '#ffffff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDark ? '#1e293b' : '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                  color: isDark ? '#c4b5fd' : '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Edit Staff Permissions
                  </h3>
                  <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    {editingStaffUser.name} &bull; <span style={{ fontFamily: 'monospace' }}>{editingStaffUser.email}</span>
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingStaffUser(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#94a3b8' : '#64748b',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveStaff(editingStaffUser.id);
              }}
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                {/* Role Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: isDark ? '#cbd5e1' : '#475569', marginBottom: '6px' }}>
                    ASSIGNED ROLE
                  </label>
                  <select 
                    value={editForm.role}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      const roleNorm = nextRole.toLowerCase();
                      const autoLevel = roleNorm.includes('admin') ? 3 :
                        (roleNorm.includes('staff') || roleNorm.includes('account') || roleNorm.includes('finance')) ? 2 : 1;
                      setEditForm({ ...editForm, role: nextRole, level: autoLevel });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isDark ? '1px solid #334155' : '1.5px solid #cbd5e1',
                      background: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                    <option value="ACCOUNT MANAGER">ACCOUNT MANAGER (Client Scoped)</option>
                    <option value="CROSSWORKS STAFF">CROSSWORKS STAFF</option>
                    <option value="FINANCE">FINANCE (Audit & Verification)</option>
                    <option value="TRAINER">TRAINER (Sessions & Quizzes)</option>
                    <option value="TRAINEE">TRAINEE (Learning Quests)</option>
                  </select>
                </div>

                {/* Clearance Level */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: isDark ? '#cbd5e1' : '#475569', marginBottom: '6px' }}>
                    CLEARANCE LEVEL
                  </label>
                  <select 
                    value={editForm.level}
                    onChange={(e) => setEditForm({ ...editForm, level: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isDark ? '1px solid #334155' : '1.5px solid #cbd5e1',
                      background: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={1}>Level 1 (Standard Scope)</option>
                    <option value={2}>Level 2 (Supervisor / Client Scope)</option>
                    <option value={3}>Level 3 (Executive Master / Root)</option>
                  </select>
                </div>
              </div>

              {/* Flexible Tenant Assignment Picker */}
              <div>
                <TenantAssignmentPicker
                  selectedTenants={editForm.clients}
                  onChange={(newClients) => setEditForm({ ...editForm, clients: newClients })}
                  companies={companiesList}
                  role={editForm.role}
                  isDark={isDark}
                  label="ASSIGNED CLIENT TENANTS (CP-ABE SCOPES)"
                  helperText="Define cryptographic tenant boundaries. Personnel holding these attributes can decrypt records for these companies only."
                />
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '6px',
                paddingTop: '16px',
                borderTop: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9'
              }}>
                <button 
                  type="button" 
                  onClick={() => setEditingStaffUser(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    background: isDark ? '#334155' : '#f1f5f9',
                    color: isDark ? '#cbd5e1' : '#475569',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    background: '#6d28d9',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.3)'
                  }}
                >
                  <Check size={14} /> Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateUserOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCreatingUser) handleCloseCreateModal();
          }}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    {createdUserResult ? 'Account Provisioned' : 'Provision Enterprise User'}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Institutional Account Setup & CP-ABE Key Issuance (FR-02)
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseCreateModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto' }}>
              {createdUserResult ? (
                /* SUCCESS VIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#ecfdf5', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
                    <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: '#065f46', lineHeight: 1.5 }}>
                      <strong>User account successfully registered!</strong>
                      <div>Initial CP-ABE cryptographic keys were generated and bound.</div>
                    </div>
                  </div>

                  {/* Account Summary Card */}
                  <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Full Name:</span>
                      <strong style={{ color: '#1e293b' }}>{createdUserResult.user.full_name}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Email Address:</span>
                      <code style={{ color: '#1e293b', fontFamily: 'monospace' }}>{createdUserResult.user.email}</code>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Assigned Role:</span>
                      <span style={{ fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
                        {createdUserResult.user.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Tenant Scope:</span>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>
                        {(createdUserResult.user.assigned_client_accounts || []).join(', ') || 'Enterprise Universal'}
                      </span>
                    </div>
                  </div>

                  {/* Copyable Activation Link */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      SINGLE-USE ACTIVATION LINK (VALID FOR 24 HOURS):
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}${createdUserResult.activation_link}`}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          background: '#f1f5f9',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          color: '#334155'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCopyActivationLink}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '10px',
                          background: copiedActivationLink ? '#059669' : '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {copiedActivationLink ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedActivationLink ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
                      An automated setup invitation email was sent to <code>{createdUserResult.user.email}</code>. You may also provide this link directly to the employee.
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '10px',
                        background: '#1e293b',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* FORM VIEW */
                <form onSubmit={handleCreateUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Full Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      FULL NAME:
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Erika Bana"
                      value={newUserForm.full_name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Corporate Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      CORPORATE EMAIL ADDRESS:
                    </label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. andrea.am@crossworks.ph"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* System Role */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      ASSIGNED ROLE:
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => {
                        const nextRole = e.target.value;
                        let defaultClients = newUserForm.assigned_client_accounts;
                        if (nextRole === 'admin' && (companiesList || []).length > 0) {
                          defaultClients = (companiesList || []).map(c => c.code);
                        }
                        setNewUserForm({ ...newUserForm, role: nextRole, assigned_client_accounts: defaultClients });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        fontWeight: 600,
                        color: '#1e293b',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="account_manager">Account Manager (Scoped to assigned enterprise tenants)</option>
                      <option value="trainer">Lead Trainer (Course & practical evaluation sign-off)</option>
                      <option value="finance">Finance Personnel (Reconciliation, audit review, no delete)</option>
                      <option value="trainee">Trainee Learner (Portable learning quests & achievements)</option>
                      <option value="admin">Administrator (Universal authority & peer-review)</option>
                    </select>
                  </div>

                  {/* Flexible Assigned Client Tenants */}
                  <div>
                    <TenantAssignmentPicker
                      selectedTenants={newUserForm.assigned_client_accounts}
                      onChange={(newTenants) => setNewUserForm({ ...newUserForm, assigned_client_accounts: newTenants })}
                      companies={companiesList}
                      role={newUserForm.role}
                      isDark={isDark}
                      label="ASSIGNED CLIENT TENANTS:"
                      helperText="Cryptographic multi-tenant CP-ABE scope boundary"
                    />
                  </div>

                  {/* Optional Initial Password */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      <span>TEMPORARY INITIAL PASSWORD (OPTIONAL):</span>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>Leave blank to auto-generate</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Leave blank for secure auto-generated temporary key"
                      value={newUserForm.temporary_password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, temporary_password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Error Notification */}
                  {createUserError && (
                    <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12.5px' }}>
                      {createUserError}
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      disabled={isCreatingUser}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingUser || !newUserForm.full_name.trim() || !newUserForm.email.trim()}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: isCreatingUser ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                      }}
                    >
                      {isCreatingUser ? (
                        <>
                          <RefreshCw size={14} className="spin-animation" />
                          <span>Provisioning User...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} />
                          <span>Provision & Generate Activation Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
