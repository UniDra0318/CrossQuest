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
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
import { fetchRecords, fetchAnomalies, fetchCompanies, fetchStaffUsers, updateStaffAttributes } from '../services/api';
import SpinCube from '../components/SpinCube';
import BitMascot from '../components/BitMascot/BitMascot';
import AdminPeerReviewAnomalyDesk from '../components/AdminPeerReviewAnomalyDesk';
import '../styles/admin.css';
export default function AdminDashboard({ activeSubView, setActiveView }) {
  const { token, currentUser } = useAuth();
  const [adminProfile] = useState(defaultAdmin);
  const [overview] = useState(defaultOverview);
  const [clients] = useState(defaultClients);
  const [staffList, setStaffList] = useState(defaultStaff);
  const [anomalies, setAnomalies] = useState(defaultAnomalies);
  const [records, setRecords] = useState(defaultRecords);
  const [settings] = useState(defaultSettings);
  const [editingStaffId, setEditingStaffId] = useState(null);
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
        const [dbRecords, dbAnomalies, dbCompanies, dbStaff] = await Promise.all([
          fetchRecords(token),
          fetchAnomalies(token),
          fetchCompanies(token),
          fetchStaffUsers(token)
        ]);
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
            const compCode = r.encryption_policy?.includes('FINTECH_BETA') 
              ? 'FINTECH_BETA' 
              : r.encryption_policy?.includes('RETAIL_GAMMA') 
                ? 'RETAIL_GAMMA' 
                : 'CORP_ALPHA';
            const compObj = (dbCompanies || []).find(c => c.code === compCode);
            return {
              id: r.id || `rec-${100 + idx}`,
              trainee: r.trainee_name || `Learner ${idx + 1}`,
              email: `learner${idx + 1}@${compCode.toLowerCase().replace(/_/g, '-')}.ph`,
              org: compObj?.name || (compCode === 'CORP_ALPHA' ? 'SAN MIGUEL CONGLOMERATE HOLDINGS' : compCode),
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
    <div className="adm-main">
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
        <div className="adm-panel" style={{ marginTop: '32px' }}>
          <div className="adm-panel__head">
            <div>
              <h2>Staff Access & Role Management</h2>
              <span className="adm-mono">Configure roles, clearance levels, and assigned tenant scope</span>
            </div>
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
              {filteredStaff.map((user) => {
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
              })}
            </div>
          </div>
        </div>
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
              {filteredRecords.map((r) => (
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
              ))}
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
    </div>
  );
}
