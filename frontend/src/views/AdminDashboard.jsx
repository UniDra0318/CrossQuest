import React, { useState, useEffect } from 'react';
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
import { 
  admin as defaultAdmin, 
  overview as defaultOverview, 
  staff as defaultStaff, 
  clients as defaultClients, 
  anomalies as defaultAnomalies, 
  records as defaultRecords, 
  settings as defaultSettings 
} from '../data/adminData';
import { exportAuditLogs } from '../api/admin';
import { 
  fetchRecords, 
  fetchAnomalies, 
  fetchCompanies, 
  fetchStaffUsers, 
  fetchSystemOverview,
  updateStaffAttributes, 
  createUserApi, 
  createCompanyApi 
} from '../services/api';
import SpinCube from '../components/SpinCube';
import BitMascot from '../components/BitMascot/BitMascot';
import AdminPeerReviewAnomalyDesk from '../components/AdminPeerReviewAnomalyDesk';
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
  const [editingStaffId, setEditingStaffId] = useState(null);

  // Client Companies & Tenancy Registry State
  const DEFAULT_COMPANIES = [
    { code: 'CORP_ALPHA', name: 'San Miguel Conglomerate Holdings', industry: 'Conglomerate & Industrial', am_name: 'Marcus Reyes' },
    { code: 'FINTECH_BETA', name: 'Maya FinTech Digital Innovations', industry: 'Financial Services & Digital Payments', am_name: 'Andrea Salazar' },
    { code: 'RETAIL_GAMMA', name: 'Ayala Retail Omnichannel Corp', industry: 'Retail & Supply Chain', am_name: 'Andrea Salazar' },
    { code: 'BANK_DELTA', name: 'BDO Unibank Enterprise Systems', industry: 'Commercial Banking & Capital Markets', am_name: 'Marcus Reyes' },
    { code: 'TELCO_EPSILON', name: 'Globe Telecom Digital Infrastructure', industry: 'Telecommunications & Cloud', am_name: 'Marcus Reyes' }
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
        am_name: selectedAm?.name || 'Marcus Reyes'
      };

      setCompaniesList(prev => [newCompObj, ...prev]);
      setCreatedCompanyResult({
        ...companyRes.data,
        attribute_token: `CLIENT${cleanCode}V1`,
        assigned_am: selectedAm?.name || 'Marcus Reyes'
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
      setStaffList(prev => [
        {
          id: u.id,
          name: u.full_name,
          initials: u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          email: u.email,
          role: u.role.replace(/_/g, ' ').toUpperCase(),
          level: 1,
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
  const [copiedKey, setCopiedKey] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  // Sync real data from database if available
  useEffect(() => {
    async function loadAdminData() {
      if (!token) return;
      try {
        const [dbRecords, dbAnomalies, dbCompanies, dbStaff, dbOverview] = await Promise.all([
          fetchRecords(token),
          fetchAnomalies(token),
          fetchCompanies(token),
          fetchStaffUsers(token),
          fetchSystemOverview(token)
        ]);
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
              am_name: am?.full_name || am?.name || (c.code === 'TELCO_EPSILON' ? 'Marcus Reyes' : 'Unassigned')
            };
          }));
        }
        if (dbStaff && dbStaff.length > 0) {
          setStaffList(dbStaff.map(u => ({
            id: u.id,
            name: u.full_name || u.name,
            initials: (u.full_name || u.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
            email: u.email,
            role: (u.role || 'STAFF').replace(/_/g, ' ').toUpperCase(),
            level: u.clearance_level || 1,
            clients: u.assigned_client_accounts || ['CORP_ALPHA'],
            tone: u.role === 'admin' ? 'purple' : u.role === 'trainer' ? 'green' : 'orange'
          })));
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
              trainee: r.trainee_name || `Learner ${idx + 1}`,
              email: r.trainee_email || `learner${idx + 1}@${compCode.toLowerCase().replace(/_/g, '-')}.ph`,
              org: r.company_name || (compCode === 'CORP_ALPHA' ? 'San Miguel Conglomerate Holdings' : compCode),
              course: r.course_name || 'Enterprise Security Training',
              policy: r.encryption_policy || `(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:${compCode})`,
              status: (r.status || 'COMPLETED').toUpperCase()
            };
          }));
        }
        if (dbAnomalies && dbAnomalies.length > 0) {
          setAnomalies(dbAnomalies.map(a => ({
            id: a.id,
            type: a.anomaly_type || 'OUT_OF_SCOPE',
            name: 'Marcus Reyes',
            email: 'marcus.am@crossworks.ph',
            message: a.description || 'Unauthorized decryption attempt detected outside scope.',
            at: a.created_at ? new Date(a.created_at).toLocaleString() : '2026-10-03 14:18:22',
            status: a.is_reviewed ? 'RESOLVED' : 'UNREVIEWED'
          })));
        }
      } catch (err) {
        console.warn("Could not load backend admin data, using robust local state:", err);
        setUsingFallback(true);
      }
    }
    loadAdminData();
  }, [token]);
  // Acknowledge / resolve anomaly
  const handleResolveAnomaly = (id) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
  };
  // Start inline editing staff
  const startEditStaff = (user) => {
    setEditingStaffId(user.id);
    setEditForm({
      role: user.role,
      level: user.level || 1,
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
    setEditingStaffId(null);
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
  const filteredRecords = records.filter(r => 
    r.trainee.toLowerCase().includes(recordSearch.toLowerCase()) || 
    r.course.toLowerCase().includes(recordSearch.toLowerCase()) ||
    r.org.toLowerCase().includes(recordSearch.toLowerCase()) ||
    r.id.toLowerCase().includes(recordSearch.toLowerCase())
  );
  return (
    <div className="adm-main admin-dashboard">
      {usingFallback && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', padding: '10px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#d97706" />
          <span>Notice: Displaying cached baseline data. Live telemetry synchronization in progress or server offline.</span>
        </div>
      )}
      {/* 1. TOP STATUS BAR */}
      <div className="adm-top">
        <div className="adm-crumbs">
          CROSSQUEST ENTERPRISE / <strong>ADMIN SECURITY CONSOLE</strong>
        </div>
        <div className="adm-chip-user">
          <div className="adm-chip-user__av">
            {adminProfile.initials || 'SJ'}
          </div>
          <div>
            <strong>{currentUser?.name || adminProfile.name}</strong>
            <small>{adminProfile.role}</small>
          </div>
        </div>
      </div>
      {/* 2. 3D HERO BANNER WITH VIEW NAVIGATION TABS */}
      <div className="adm-hero">
        <div className="adm-hero__text">
          <span className="adm-pill">
            <span className="adm-live" /> ACTIVE AUTHORITY
          </span>
          <h1>Executive Security & Platform Posture</h1>
          <p>
            Centralized monitoring for role-based access control, tenant isolation, and anomaly response across all enterprise cohorts.
          </p>
          <div className="adm-tabs">
            <button 
              type="button"
              className={(!activeSubView || activeSubView === 'admin_overview') ? 'on' : ''} 
              onClick={() => setActiveView && setActiveView('admin_overview')}
            >
              Security Overview
            </button>
            <button 
              type="button"
              className={activeSubView === 'attribute_authority' ? 'on' : ''} 
              onClick={() => setActiveView && setActiveView('attribute_authority')}
            >
              Access Permissions
            </button>
            <button 
              type="button"
              className={activeSubView === 'anomalies' ? 'on' : ''} 
              onClick={() => setActiveView && setActiveView('anomalies')}
            >
              Anomaly Monitor {unreviewedCount > 0 ? `(${unreviewedCount})` : ''}
            </button>
            <button 
              type="button"
              className={activeSubView === 'records_vault' ? 'on' : ''} 
              onClick={() => setActiveView && setActiveView('records_vault')}
            >
              Master Record Vault
            </button>
            <button 
              type="button"
              className={activeSubView === 'system_settings' ? 'on' : ''} 
              onClick={() => setActiveView && setActiveView('system_settings')}
            >
              Engine Settings
            </button>
          </div>
        </div>
        {/* Mascot Scene */}
        <div className="adm-hero__cube">
          <span className="adm-float adm-float--tl">AES-256 + RSA</span>
          <span className="adm-float adm-float--br adm-float--orange">ROW-LEVEL SECURITY</span>
          <BitMascot size={210} />
        </div>
      </div>
      {/* =====================================================================
          VIEW 1: SECURITY OVERVIEW
          ===================================================================== */}
      {(!activeSubView || activeSubView === 'admin_overview' || !['attribute_authority', 'anomalies', 'records_vault', 'system_settings'].includes(activeSubView)) && (
        <>
          {/* Executive KPI Tiles */}
          <div className="adm-tiles">
            {/* Tile 1: Security Posture Score */}
            <div className="adm-kpi">
              <div className="adm-kpi__top">
                <span className="adm-label">SECURITY POSTURE</span>
                <span className="adm-pill adm-pill--green">STABLE</span>
              </div>
              <div className="adm-kpi__num">{overview.postureScore}%</div>
              <div className="adm-progress">
                <i style={{ width: `${overview.postureScore}%` }} />
              </div>
              <div className="adm-kpi__note">
                <CheckCircle2 size={13} /> {overview.postureNote}
              </div>
            </div>
            {/* Tile 2: Pending Anomaly Incidents */}
            <div 
              className="adm-kpi" 
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveView && setActiveView('anomalies')}
              title="Click to inspect anomaly monitor"
            >
              <div className="adm-kpi__top">
                <span className="adm-label">PENDING ANOMALIES</span>
                <span className="adm-dot" />
              </div>
              <div className="adm-kpi__num" style={{ color: unreviewedCount > 0 ? '#d12a43' : 'inherit' }}>
                {unreviewedCount} Alerts
              </div>
              <div className="adm-bars">
                <span style={{ background: '#ff5a6e' }} />
                <span style={{ background: '#ff7a1a' }} />
                <span style={{ background: unreviewedCount > 2 ? '#ff5a6e' : '#ddd6f0' }} />
              </div>
              <div className="adm-kpi__note">
                Rule- & threshold-based active flags (Click to view)
              </div>
            </div>
            {/* Tile 3: Managed Staff Profiles */}
            <div 
              className="adm-kpi"
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveView && setActiveView('attribute_authority')}
              title="Click to view staff permissions"
            >
              <div className="adm-kpi__top">
                <span className="adm-label">STAFF CLEARANCES</span>
                <span className="adm-pill adm-pill--blue">{clients.length} CLIENTS</span>
              </div>
              <div className="adm-kpi__num">{staffList.length} Accounts</div>
              <div className="adm-avatars">
                {staffList.slice(0, 5).map((s, idx) => (
                  <span 
                    key={s.id || idx} 
                    style={{ 
                      background: s.tone === 'purple' ? '#6a2bd9' : s.tone === 'orange' ? '#ff7a1a' : s.tone === 'green' ? '#087a54' : '#1d6fe0' 
                    }} 
                    title={s.name}
                  />
                ))}
              </div>
              <div className="adm-kpi__note">
                Managed cryptographic credentials (Click to edit)
              </div>
            </div>
            {/* Tile 4: Database Layer Guard */}
            <div className="adm-kpi">
              <div className="adm-kpi__top">
                <span className="adm-label">DATABASE LAYER</span>
                <span className="adm-pill adm-pill--green">ACTIVE</span>
              </div>
              <div className="adm-kpi__num adm-kpi__num--sm">
                Data Isolation Active
              </div>
              <div className="adm-bars">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="adm-kpi__note">
                <CheckCircle2 size={13} /> {overview.isolationNote}
              </div>
            </div>
          </div>
          {/* Dual Split: Recent Alerts & 3D Security Architecture */}
          <div className="adm-split">
            {/* Left: Recent Alerts */}
            <div className="adm-split__main">
              <div className="adm-panel">
                <div className="adm-panel__head">
                  <h2>Recent Access Anomaly Alerts</h2>
                  <span className="adm-chip adm-chip--red">{unreviewedCount} Unreviewed</span>
                </div>
                <div className="adm-stack">
                  {anomalies.slice(0, 3).map((item) => (
                    <div 
                      key={item.id} 
                      className={`adm-alert ${item.status === 'RESOLVED' ? 'adm-alert--done' : item.type === 'OUT_OF_SCOPE' ? 'adm-alert--red' : 'adm-alert--amber'}`}
                    >
                      <div className="adm-alert__icon">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="adm-alert__body">
                        <div className="adm-alert__head">
                          <strong>{item.name}</strong>
                          <span className="adm-mono">({item.email})</span>
                          <span className={`adm-chip ${item.status === 'RESOLVED' ? 'adm-chip--green' : item.type === 'OUT_OF_SCOPE' ? 'adm-chip--red' : 'adm-chip--amber'}`}>
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p>{item.message}</p>
                        <div className="adm-alert__meta">
                          <span className="adm-mono">
                            <Clock size={12} /> {item.at}
                          </span>
                          {item.status === 'RESOLVED' && (
                            <span className="adm-ack">
                              <CheckCircle2 size={13} /> Acknowledged
                            </span>
                          )}
                        </div>
                      </div>
                      {item.status === 'UNREVIEWED' && (
                        <button 
                          type="button" 
                          className="adm-btn adm-btn-solid adm-chip--solid"
                          onClick={() => handleResolveAnomaly(item.id)}
                        >
                          <CheckCircle2 size={13} /> Acknowledge
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right: 3D Stacked Layers & Specs */}
            <div className="adm-split__side">
              <div className="adm-panel">
                <div className="adm-panel__head">
                  <h2>Security Architecture</h2>
                  <span className="adm-pill adm-pill--blue">CROSSWORKS CORE</span>
                </div>
                <div className="adm-pad">
                  {/* 3D Preserved-3D Isometric Layers */}
                  <div className="adm-stack3d">
                    <div className="adm-stack3d__scene">
                      <div className="adm-layers">
                        <div className="adm-layer adm-layer--1" title="Row-Level Isolation Layer" />
                        <div className="adm-layer adm-layer--2" title="Access Control Policy Layer" />
                        <div className="adm-layer adm-layer--3" title="AES-256 + RSA Encryption Top Layer" />
                      </div>
                    </div>
                    <ul className="adm-legend">
                      <li>
                        <i style={{ background: '#ff7a1a' }} />
                        <div>
                          <strong>Top Layer</strong>
                          <span>AES-256 + RSA Suite</span>
                        </div>
                      </li>
                      <li>
                        <i style={{ background: '#1d6fe0' }} />
                        <div>
                          <strong>Policy Engine</strong>
                          <span>Attribute-Based (CP-ABE)</span>
                        </div>
                      </li>
                      <li>
                        <i style={{ background: '#6a2bd9' }} />
                        <div>
                          <strong>Base Guard</strong>
                          <span>Multi-Tenant Row Isolation</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                {/* Definition List */}
                <dl className="adm-dl">
                  <div>
                    <dt>Scheme</dt>
                    <dd>{overview.architecture.scheme}</dd>
                  </div>
                  <div>
                    <dt>Encryption Suite</dt>
                    <dd>{overview.architecture.encryption}</dd>
                  </div>
                  <div>
                    <dt>Authority</dt>
                    <dd>{overview.architecture.authority}</dd>
                  </div>
                  <div>
                    <dt>Master Public Key</dt>
                    <dd>
                      <div className="adm-key">
                        <code>{overview.architecture.publicKey}</code>
                        <button 
                          type="button" 
                          className="adm-iconbtn" 
                          onClick={handleCopyPublicKey}
                          title="Copy public key"
                        >
                          {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </dd>
                  </div>
                  <div>
                    <dt>Defense Layer</dt>
                    <dd>{overview.architecture.defense}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </>
      )}
      {/* =====================================================================
          VIEW 2: ACCESS PERMISSIONS & STAFF ROLES
          ===================================================================== */}
      {activeSubView === 'attribute_authority' && (
        <>
          <div className="adm-panel" style={{ marginTop: '32px' }}>
          <div className="adm-panel__head" style={{ flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2>Staff Access & Role Management</h2>
              <span className="adm-mono">Configure roles, clearance levels, and assigned tenant scope</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.28)',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserPlus size={15} />
                <span>Provision New Account</span>
              </button>
              <div className="adm-search">
                <Search size={15} />
                <input 
                  type="text" 
                  placeholder="Search staff members..." 
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="adm-scroll">
            <div className="adm-table">
              {/* Table Header */}
              <div className="adm-grid adm-grid--access adm-th">
                <div>STAFF MEMBER</div>
                <div>ASSIGNED ROLE</div>
                <div>CLEARANCE LEVEL</div>
                <div>ASSIGNED CLIENT TENANTS</div>
                <div style={{ textAlign: 'right' }}>ACTIONS</div>
              </div>
              {/* Table Rows */}
              {filteredStaff && filteredStaff.length > 0 ? (
                filteredStaff.map((user) => {
                const isEditing = editingStaffId === user.id;
                return (
                  <div key={user.id} className="adm-row">
                    <div className="adm-grid adm-grid--access">
                      <div className="adm-person">
                        <div 
                          className="adm-av" 
                          style={{ 
                            background: user.tone === 'purple' ? '#6a2bd9' : user.tone === 'orange' ? '#ff7a1a' : user.tone === 'green' ? '#087a54' : '#1d6fe0',
                            color: '#ffffff'
                          }}
                        >
                          {user.initials || 'U'}
                        </div>
                        <div>
                          <strong>{user.name}</strong>
                          <span className="adm-mono">{user.email}</span>
                        </div>
                      </div>
                      <div>
                        <span className={`adm-chip ${user.role.includes('ADMIN') ? 'adm-chip--violet' : user.role.includes('STAFF') ? 'adm-chip--orange' : user.role.includes('TRAINER') ? 'adm-chip--green' : 'adm-chip--blue'}`}>
                          {user.role}
                        </span>
                      </div>
                      <div>
                        <div className="adm-level">
                          <span>
                            <i className="on" style={{ height: '10px' }} />
                            <i className={user.level >= 2 ? 'on' : ''} style={{ height: '15px' }} />
                            <i className={user.level >= 3 ? 'on' : ''} style={{ height: '20px' }} />
                          </span>
                          <b>Level {user.level}</b>
                        </div>
                      </div>
                      <div>
                        <div className="adm-wrap">
                          {(user.clients || []).map((code) => (
                            <span key={code} className="adm-org">{code}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <button 
                          type="button" 
                          className="adm-btn adm-btn--light"
                          onClick={() => isEditing ? setEditingStaffId(null) : startEditStaff(user)}
                        >
                          <Edit2 size={13} />
                          <span>{isEditing ? 'Close' : 'Edit Roles'}</span>
                        </button>
                      </div>
                    </div>
                    {/* Inline Editor */}
                    {isEditing && (
                      <div className="adm-edit">
                        <label>
                          <span className="adm-label">ASSIGNED ROLE</span>
                          <select 
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="CROSSWORKS STAFF">CROSSWORKS STAFF</option>
                            <option value="TRAINER">TRAINER</option>
                            <option value="COMPANY STAFF">COMPANY STAFF</option>
                            <option value="TRAINEE">TRAINEE</option>
                          </select>
                        </label>
                        <label>
                          <span className="adm-label">CLEARANCE LEVEL (1–3)</span>
                          <select 
                            value={editForm.level}
                            onChange={(e) => setEditForm({ ...editForm, level: Number(e.target.value) })}
                          >
                            <option value={1}>Level 1 (Standard)</option>
                            <option value={2}>Level 2 (Supervisor)</option>
                            <option value={3}>Level 3 (Executive Master)</option>
                          </select>
                        </label>
                        <fieldset>
                          <legend className="adm-label">ASSIGNED CLIENT ORGANIZATIONS</legend>
                          {clients.map((c) => (
                            <label key={c} className="adm-check">
                              <input 
                                type="checkbox" 
                                checked={editForm.clients.includes(c)}
                                onChange={() => toggleClientInEdit(c)}
                              />
                              <span>{c}</span>
                            </label>
                          ))}
                        </fieldset>
                        <div className="adm-edit__act">
                          <button 
                            type="button" 
                            className="adm-btn"
                            onClick={() => setEditingStaffId(null)}
                          >
                            Cancel
                          </button>
                          <button 
                            type="button" 
                            className="adm-btn adm-btn-solid adm-chip--solid"
                            onClick={() => handleSaveStaff(user.id)}
                          >
                            <Check size={13} /> Save Permissions
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
              ) : (
                <TableEmptyBlock
                  icon={Users}
                  title="No Staff Accounts Located"
                  subtitle="No team members match the current search query or clearance criteria."
                />
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            CLIENT COMPANIES & MULTI-TENANT BOUNDARIES REGISTRY (DEDICATED PANEL)
            ===================================================================== */}
        <div className="adm-panel" style={{ marginTop: '32px' }}>
          <div className="adm-panel__head">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <Building2 size={20} color="#7c3aed" />
                <h2 style={{ margin: 0 }}>Client Companies & Multi-Tenant Registry</h2>
              </div>
              <span className="adm-mono">Institutional corporate clients with versioned CP-ABE access tokens (CLIENT&lt;CODE&gt;V1)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateCompanyOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.28)',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={15} />
              <span>Register New Client Company</span>
            </button>
          </div>

          <div className="adm-scroll" style={{ maxHeight: '440px', overflowY: 'auto' }}>
            <div className="adm-table">
              <div className="adm-grid adm-th" style={{ gridTemplateColumns: '1.8fr 1.3fr 1.4fr 1.2fr 130px' }}>
                <div>CLIENT COMPANY / TENANT</div>
                <div>INDUSTRY SECTOR</div>
                <div>CP-ABE ATTRIBUTE TOKEN</div>
                <div>ASSIGNED ACCOUNT MANAGER</div>
                <div style={{ textAlign: 'right' }}>DATA ISOLATION</div>
              </div>

              {companiesList && companiesList.length > 0 ? (
                companiesList.map((c) => (
                <div key={c.code} className="adm-row" style={{ padding: '16px 28px' }}>
                  <div className="adm-grid" style={{ gridTemplateColumns: '1.8fr 1.3fr 1.4fr 1.2fr 130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        className="adm-comp-icon" 
                        style={{ 
                          width: '38px', 
                          height: '38px', 
                          borderRadius: '12px', 
                          background: isDark ? '#1e1b4b' : '#f5f3ff', 
                          color: isDark ? '#c4b5fd' : '#7c3aed', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0, 
                          border: isDark ? '1px solid #312e81' : '1px solid #ede9fe' 
                        }}
                      >
                        <Building2 size={18} />
                      </div>
                      <div>
                        <strong className="client-comp-name" style={{ fontSize: '13.5px', color: isDark ? '#f8fafc' : '#0f172a', display: 'block' }}>{c.name}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span className="adm-org" style={{ fontSize: '10px', padding: '2px 8px' }}>{c.code}</span>
                        </div>
                      </div>
                    </div>

                    <div className="client-comp-sector" style={{ fontSize: '12.5px', color: isDark ? '#cbd5e1' : '#475569' }}>
                      {c.industry}
                    </div>

                    <div>
                      <span className="adm-chip adm-chip--violet" style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                        CLIENT{c.code.replace(/[^A-Z0-9]/g, '')}V1
                      </span>
                    </div>

                    <div>
                      <span className="client-comp-manager" style={{ fontSize: '12.5px', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                        {c.am_name || 'Marcus Reyes'}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5', color: isDark ? '#6ee7b7' : '#059669', border: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #a7f3d0' }}>
                        &#10004; FORCE RLS
                      </span>
                    </div>
                  </div>
                </div>
              ))
              ) : (
                <TableEmptyBlock
                  icon={Building2}
                  title="No Client Companies Registered"
                  subtitle="Register your first multi-tenant client company to establish cryptographic isolation."
                />
              )}
            </div>
          </div>
        </div>
        </>
      )}
      {/* =====================================================================
          VIEW 3: ANOMALY MONITOR & PEER-REVIEW RESOLUTION DESK (FR-21, OI-30)
          ===================================================================== */}
      {activeSubView === 'anomalies' && (
        <div style={{ marginTop: '24px' }}>
          <AdminPeerReviewAnomalyDesk />
        </div>
      )}
      {/* =====================================================================
          VIEW 4: MASTER RECORD VAULT & EXPORT AUDIT LOGS
          ===================================================================== */}
      {activeSubView === 'records_vault' && (
        <div className="adm-panel" style={{ marginTop: '32px' }}>
          <div className="adm-panel__head">
            <div>
              <h2>Master Record Vault</h2>
              <span className="adm-mono">Global store of multi-tenant cryptographic certificates & training records</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="adm-search">
                <Search size={15} />
                <input 
                  type="text" 
                  placeholder="Filter records or courses..." 
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                className="adm-btn adm-btn--light"
                onClick={exportAuditLogs}
                title="Download CSV audit log"
              >
                <Download size={14} />
                <span>Export Master Audit Logs (CSV)</span>
              </button>
            </div>
          </div>
          <div className="adm-scroll">
            <div className="adm-table">
              <div className="adm-grid adm-grid--vault adm-th">
                <div>RECORD ID</div>
                <div>TRAINEE</div>
                <div>CLIENT ORGANIZATION</div>
                <div>COURSE PROGRAM</div>
                <div>ACCESS CONTROL POLICY</div>
                <div style={{ textAlign: 'right' }}>STATUS</div>
              </div>
              {filteredRecords && filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                <div key={r.id} className="adm-row adm-grid adm-grid--vault">
                  <div className="adm-recid">
                    <FileText size={13} />
                    <span>{r.id}</span>
                  </div>
                  <div className="adm-person">
                    <div className="adm-av adm-av--sq" style={{ background: '#6a2bd9', color: '#fff' }}>
                      {(r.trainee || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong>{r.trainee}</strong>
                      <span className="adm-mono">{r.email}</span>
                    </div>
                  </div>
                  <div>
                    <span className="adm-org">{r.org}</span>
                  </div>
                  <div className="adm-course">
                    {r.course}
                  </div>
                  <div>
                    <code className="adm-policy">{r.policy}</code>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`adm-chip ${r.status === 'COMPLETED' ? 'adm-chip--green' : 'adm-chip--amber'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))
              ) : (
                <TableEmptyBlock
                  icon={FileText}
                  title="No Master Training Records Found"
                  subtitle="No records match your current filter, company selection, or search query."
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* =====================================================================
          VIEW 5: SECURITY ENGINE SETTINGS & CONFIGURATION
          ===================================================================== */}
      {activeSubView === 'system_settings' && (
        <div style={{ marginTop: '32px' }}>
          <div className="adm-cols">
            {/* Card 1: Access Control Engine */}
            <div className="adm-card">
              <div className="adm-ptitle">
                <span style={{ background: '#6a2bd9' }}>
                  <Key size={22} />
                </span>
                <div>
                  <h2>Access Control Engine</h2>
                  <p>Cryptographic parameters & master authority specs</p>
                </div>
              </div>
              <div className="adm-field" style={{ marginBottom: '16px' }}>
                <div className="adm-field__icon">
                  <Shield size={20} />
                </div>
                <div>
                  <span className="adm-label">CRYPTOGRAPHIC SCHEME</span>
                  <div className="adm-field__val">{settings.accessControl.cryptoScheme}</div>
                </div>
              </div>
              <div className="adm-field" style={{ marginBottom: '16px' }}>
                <div className="adm-field__icon">
                  <Server size={20} />
                </div>
                <div>
                  <span className="adm-label">SECURITY PROVIDER</span>
                  <div className="adm-field__val">{settings.accessControl.provider}</div>
                </div>
              </div>
              <div className="adm-field">
                <div className="adm-field__icon">
                  <Lock size={20} />
                </div>
                <div>
                  <span className="adm-label">KEY AUTHORITY SCHEME</span>
                  <div className="adm-field__val">{settings.accessControl.keyAuthority}</div>
                </div>
              </div>
            </div>
            {/* Card 2: Anomaly Detection Thresholds */}
            <div className="adm-card">
              <div className="adm-ptitle">
                <span style={{ background: '#ff7a1a' }}>
                  <Sliders size={22} />
                </span>
                <div>
                  <h2>Anomaly Detection Thresholds</h2>
                  <p>Rule- & threshold-based trigger levels</p>
                </div>
              </div>
              {/* Operating Window */}
              <div className="adm-field adm-field--window" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="adm-label">STANDARD BUSINESS WINDOW</span>
                  <strong style={{ fontSize: '13px' }}>
                    {settings.anomaly.window.start} – {settings.anomaly.window.end} {settings.anomaly.window.tz}
                  </strong>
                </div>
                <div className="adm-window">
                  <i style={{ left: '33.3%', width: '45.8%' }} />
                </div>
                <div className="adm-ticks">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
                <div className="adm-wrap" style={{ marginTop: '14px' }}>
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
                    <span 
                      key={d} 
                      className={`adm-day ${settings.anomaly.window.days.includes(d) ? 'on' : ''}`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              {/* Threshold 1: Failed Attempts */}
              <div className="adm-field adm-field--thr" style={{ marginBottom: '16px' }}>
                <div className="adm-thr__icon" style={{ background: '#d12a43' }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <span className="adm-label">CONSECUTIVE FAILED ATTEMPTS TRIGGER</span>
                  <div className="adm-thr__val">
                    <b>{settings.anomaly.failedAttempts.count}</b>
                    <span>failed requests within {settings.anomaly.failedAttempts.minutes} minutes</span>
                  </div>
                </div>
              </div>
              {/* Threshold 2: Burst Volume */}
              <div className="adm-field adm-field--thr">
                <div className="adm-thr__icon" style={{ background: '#ff7a1a' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <span className="adm-label">BURST DECRYPTION VOLUME THRESHOLD</span>
                  <div className="adm-thr__val">
                    <b>{settings.anomaly.burstVolume.records}</b>
                    <span>record decryptions within {settings.anomaly.burstVolume.minutes} minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                      placeholder="e.g. Andrea Salazar"
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
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
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

                  {/* Assigned Client Tenants (relevant for AM, Trainer, Trainee) */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      <span>ASSIGNED CLIENT TENANTS:</span>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>Cryptographic scope boundary</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['CORP_ALPHA', 'BANK_DELTA', 'FINTECH_BETA', 'RETAIL_GAMMA'].map((cCode) => {
                        const checked = newUserForm.assigned_client_accounts.includes(cCode);
                        return (
                          <div 
                            key={cCode}
                            onClick={() => handleToggleNewUserClient(cCode)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: checked ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                              background: checked ? '#f5f3ff' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={checked}
                              onChange={() => {}}
                              style={{ accentColor: '#7c3aed' }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: checked ? '#6d28d9' : '#475569', fontFamily: 'monospace' }}>
                              {cCode}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
