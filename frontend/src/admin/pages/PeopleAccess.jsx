import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Building2,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
  ShieldAlert,
  X
} from 'lucide-react';
import { TablePagination, TablePaginationCompact, usePagination } from '../../components/TablePagination';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { useTheme } from '../../contexts/ThemeContext';
import { disableUser, reenableUser } from '../../services/api';
import TrainerProgramsModal from './TrainerProgramsModal';

export default function PeopleAccess({
  staffList = [],
  companiesList = [],
  onOpenCreateUserModal,
  onOpenCreateCompanyModal,
  startEditStaff,
  token,
  onRefreshStaff
}) {
  const { isDark } = useTheme();
  const [staffSearch, setStaffSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [companySearch, setCompanySearch] = useState('');
  const [programsTrainer, setProgramsTrainer] = useState(null);
  const [actionToast, setActionToast] = useState(null);
  const [processingUserId, setProcessingUserId] = useState(null);

  const handleToggleUserStatus = async (user) => {
    const isActive = user.is_active !== false;
    const actionLabel = isActive ? 'disable' : 're-enable';
    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${user.name || user.email}?`)) {
      return;
    }

    setProcessingUserId(user.id);
    setActionToast(null);
    try {
      if (isActive) {
        await disableUser(user.id, token);
        setActionToast({ type: 'success', text: `Account for ${user.name || user.email} disabled (FR-02, U-07). All active sessions revoked.` });
      } else {
        await reenableUser(user.id, token);
        setActionToast({ type: 'success', text: `Account for ${user.name || user.email} re-enabled and CP-ABE cryptographic keys re-issued (FR-02, U-07).` });
      }
      onRefreshStaff?.();
    } catch (err) {
      setActionToast({ type: 'error', text: err.message || `Failed to ${actionLabel} account.` });
    } finally {
      setProcessingUserId(null);
      setTimeout(() => setActionToast(null), 5000);
    }
  };

  const staffCount = useMemo(() => staffList.filter(s => (s.role || '').toLowerCase() !== 'trainee').length, [staffList]);
  const traineeCount = useMemo(() => staffList.filter(s => (s.role || '').toLowerCase() === 'trainee').length, [staffList]);

  // Filtered accounts (Staff, Trainees, All)
  const filteredStaff = useMemo(() => {
    let list = staffList;
    if (roleFilter === 'STAFF') {
      list = list.filter(s => (s.role || '').toLowerCase() !== 'trainee');
    } else if (roleFilter === 'TRAINEE') {
      list = list.filter(s => (s.role || '').toLowerCase() === 'trainee');
    }
    if (!staffSearch) return list;
    const q = staffSearch.toLowerCase();
    return list.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q))
    );
  }, [staffList, staffSearch, roleFilter]);

  // Sort accounts by account hierarchy: Admin (Level 3) -> AM (Level 2) -> Finance (Level 2) -> Trainer (Level 1) -> Trainee (Level 1)
  const sortedStaff = useMemo(() => {
    const ROLE_HIERARCHY_RANK = {
      admin: 1,
      'account manager': 2,
      account_manager: 2,
      finance: 3,
      trainer: 4,
      trainee: 5
    };
    return [...filteredStaff].sort((a, b) => {
      const roleA = (a.role || '').toLowerCase().trim();
      const roleB = (b.role || '').toLowerCase().trim();
      const rankA = ROLE_HIERARCHY_RANK[roleA] || (a.level ? 10 - a.level : 99);
      const rankB = ROLE_HIERARCHY_RANK[roleB] || (b.level ? 10 - b.level : 99);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || a.email || '').localeCompare(b.name || b.email || '');
    });
  }, [filteredStaff]);

  const {
    currentPage: staffPage,
    setCurrentPage: setStaffPage,
    paginatedItems: pagedStaff,
    totalItems: totalStaff
  } = usePagination(sortedStaff, 4);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companiesList;
    const q = companySearch.toLowerCase();
    return companiesList.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.am_name && c.am_name.toLowerCase().includes(q))
    );
  }, [companiesList, companySearch]);

  const {
    currentPage: companyPage,
    setCurrentPage: setCompanyPage,
    paginatedItems: pagedCompanies,
    totalItems: totalCompanies
  } = usePagination(filteredCompanies, 4);

  return (
    <div className="adm-people-access-page" style={{ marginTop: '10px' }}>
      {programsTrainer && (
        <TrainerProgramsModal trainer={programsTrainer} token={token} onClose={() => setProgramsTrainer(null)} />
      )}
      {/* 1. Staff Access & Role Management Hero Stage (Royal Indigo / Violet Cockpit) */}
      <section className="trainee-hero-stage adm-staff-hero-stage">
        <div className="trainee-hero-content">
          <div className="trainee-hero-badge" style={{ background: 'rgba(167, 139, 250, 0.15)', borderColor: 'rgba(167, 139, 250, 0.3)', color: '#ede9fe' }}>
            <Shield size={13} style={{ color: '#c4b5fd' }} />
            <span>ROLE-BASED ATTRIBUTE AUTHORITY &bull; CP-ABE ENCLAVE</span>
          </div>

          <h2 className="trainee-hero-headline">People &amp; Attribute Authority</h2>
          <p className="trainee-hero-sub">
            Configure user roles, trainee accounts, and assigned client company CP-ABE attributes under uniform record sensitivity (SEC-11).
          </p>

          <div className="trainee-hero-actions">
            <button
              type="button"
              className="trainee-hero-primary-btn adm-staff-primary-btn"
              onClick={onOpenCreateUserModal}
              title="Provision a new enterprise account with cryptographic keys"
            >
              <UserPlus size={14} />
              <span>Provision New Account</span>
            </button>
          </div>
        </div>

        {/* 4-Cell Bento Telemetry Grid for Accounts */}
        <div className="trainee-hero-metrics-panel">
          <div className="hero-metric-cell adm-staff-metric-cell">
            <span className="metric-tag">TOTAL DIRECTORY</span>
            <div className="metric-num">
              {staffList.length}
              <span className="metric-unit">ACCOUNTS</span>
            </div>
            <span className="metric-sub-label">Provisioned directory</span>
          </div>

          <div className="hero-metric-cell adm-staff-metric-cell">
            <span className="metric-tag">STAFF &amp; ADMIN ROLES</span>
            <div className="metric-num" style={{ color: '#c4b5fd' }}>
              {staffList.filter(s => !s.role.includes('TRAINEE')).length}
              <span className="metric-unit" style={{ color: '#e9d5ff' }}>STAFF</span>
            </div>
            <span className="metric-sub-label">Uniform sensitivity (SEC-11)</span>
          </div>

          <div className="hero-metric-cell adm-staff-metric-cell">
            <span className="metric-tag">ACTIVE STATUS</span>
            <div className="metric-num" style={{ color: '#34d399' }}>
              {staffList.filter(s => s.is_active !== false).length}
              <span className="metric-unit" style={{ color: '#6ee7b7' }}>LIVE</span>
            </div>
            <span className="metric-sub-label">Verified session keys</span>
          </div>

          <div className="hero-metric-cell adm-staff-metric-cell">
            <span className="metric-tag">DEACTIVATED (REVOKED)</span>
            <div className="metric-num" style={{ color: staffList.filter(s => s.is_active === false).length > 0 ? '#f87171' : '#94a3b8' }}>
              {staffList.filter(s => s.is_active === false).length}
              <span className="metric-unit" style={{ color: '#fca5a5' }}>REVOKED</span>
            </div>
            <span className="metric-sub-label">U-07 instant revocation</span>
          </div>
        </div>
      </section>

      {/* 1. Account Access & Role Management Panel */}
      <div className="adm-panel adm-vault-panel">
        <div className="adm-panel__head adm-vault-controls" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => { setRoleFilter('ALL'); setStaffPage(1); }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: roleFilter === 'ALL' ? (isDark ? '#4338ca' : '#6366f1') : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: roleFilter === 'ALL' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                transition: 'all 0.15s ease'
              }}
            >
              All Accounts ({staffList.length})
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter('STAFF'); setStaffPage(1); }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: roleFilter === 'STAFF' ? (isDark ? '#4338ca' : '#6366f1') : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: roleFilter === 'STAFF' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                transition: 'all 0.15s ease'
              }}
            >
              Staff ({staffCount})
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter('TRAINEE'); setStaffPage(1); }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: roleFilter === 'TRAINEE' ? (isDark ? '#4338ca' : '#6366f1') : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: roleFilter === 'TRAINEE' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                transition: 'all 0.15s ease'
              }}
            >
              Trainees ({traineeCount})
            </button>
          </div>

          <div className="adm-vault-search-wrap">
            <div className="adm-search adm-vault-search">
              <Search size={15} />
              <input 
                type="text" 
                placeholder="Search accounts by name, email, or role..." 
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
              {staffSearch && (
                <button 
                  type="button" 
                  onClick={() => setStaffSearch('')} 
                  className="adm-vault-clear-search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="adm-vault-actions-group">
            <TablePaginationCompact
              currentPage={staffPage}
              totalItems={totalStaff}
              pageSize={4}
              onPageChange={setStaffPage}
            />
          </div>

          {actionToast && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              width: '100%',
              fontSize: '12.5px',
              fontWeight: 600,
              background: actionToast.type === 'success' ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
              color: actionToast.type === 'success' ? (isDark ? '#34d399' : '#065f46') : (isDark ? '#f87171' : '#b91c1c'),
              border: actionToast.type === 'success' ? (isDark ? '1px solid rgba(5, 150, 105, 0.4)' : '1px solid #a7f3d0') : (isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fca5a5')
            }}>
              {actionToast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{actionToast.text}</span>
            </div>
          )}
        </div>

        <div className="adm-scroll" style={{ maxHeight: 'none', overflowY: 'visible' }}>
          <div className="adm-table">
            <div className="adm-grid adm-grid--access adm-th">
              <div>ACCOUNT HOLDER</div>
              <div>ASSIGNED ROLE</div>
              <div>SENSITIVITY POLICY</div>
              <div>ASSIGNED CLIENT TENANTS</div>
              <div style={{ textAlign: 'right' }}>ACTIONS</div>
            </div>

            {filteredStaff && filteredStaff.length > 0 ? (
              pagedStaff.map((user) => {
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
                        <span className="adm-chip adm-chip--blue" style={{ fontSize: '11px' }}>
                          Uniform (SEC-11)
                        </span>
                      </div>
                      <div>
                        <div className="adm-wrap">
                          {(() => {
                            const userClients = user.clients || [];
                            const allCodes = (companiesList || []).map(c => c.code);
                            const hasAll = allCodes.length > 0 && allCodes.every(c => userClients.includes(c));

                            if (userClients.length === 0) {
                              return (
                                <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic' }}>
                                  None Assigned
                                </span>
                              );
                            }
                            if (hasAll && userClients.length >= 4) {
                              return (
                                <span 
                                  className="adm-org" 
                                  style={{
                                    background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                                    color: isDark ? '#6ee7b7' : '#059669',
                                    border: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #a7f3d0',
                                    fontWeight: 800
                                  }}
                                  title={userClients.join(', ')}
                                >
                                  All Registered ({userClients.length})
                                </span>
                              );
                            }
                            if (userClients.length <= 3) {
                              return userClients.map(code => (
                                <span key={code} className="adm-org">{code}</span>
                              ));
                            }
                            return (
                              <>
                                {userClients.slice(0, 2).map(code => (
                                  <span key={code} className="adm-org">{code}</span>
                                ))}
                                <span 
                                  className="adm-org" 
                                  style={{ 
                                    background: isDark ? '#312e81' : '#ede9fe', 
                                    color: isDark ? '#c4b5fd' : '#6d28d9', 
                                    fontWeight: 800,
                                    cursor: 'help'
                                  }}
                                  title={userClients.join(', ')}
                                >
                                  +{userClients.length - 2} more
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {user.role.includes('ADMIN') ? (
                          <span
                            className="adm-chip adm-chip--violet"
                            style={{ fontSize: '11px', padding: '6px 12px' }}
                            title="Co-Administrator accounts are protected under dual-admin peer review (OI-08, OI-30)"
                          >
                            🔒 Protected Co-Admin (OI-30)
                          </span>
                        ) : (
                          <>
                            <button 
                              type="button" 
                              className="adm-btn adm-btn--light"
                              style={{ padding: '7px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                              onClick={() => startEditStaff && startEditStaff(user)}
                              title={`Edit role and assigned clients for ${user.name}`}
                            >
                              <Edit2 size={13} />
                              <span>Edit Roles</span>
                            </button>
                            {String(user.role || '').toLowerCase().includes('trainer') && (
                              <button
                                type="button"
                                className="adm-btn adm-btn--light"
                                style={{ padding: '7px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                onClick={() => setProgramsTrainer(user)}
                                title="Add/edit programs this trainer can author quizzes for"
                              >
                                <span>Programs</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="adm-btn adm-btn--light"
                              style={{
                                padding: '7px 12px',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                color: user.is_active !== false ? '#ef4444' : '#059669',
                                borderColor: user.is_active !== false ? (isDark ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5') : (isDark ? 'rgba(5, 150, 105, 0.4)' : '#a7f3d0')
                              }}
                              disabled={processingUserId === user.id}
                              onClick={() => handleToggleUserStatus(user)}
                              title={user.is_active !== false ? 'Disable account (FR-02, U-07)' : 'Re-enable account (FR-02, U-07)'}
                            >
                              {user.is_active !== false ? <UserX size={13} /> : <UserCheck size={13} />}
                              <span>{user.is_active !== false ? 'Disable' : 'Re-enable'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <TableEmptyBlock
                icon={Users}
                title="No Accounts Located"
                subtitle="No accounts match the current search query or role filter."
              />
            )}
          </div>
        </div>

        <TablePagination
          currentPage={staffPage}
          totalItems={totalStaff}
          pageSize={4}
          onPageChange={setStaffPage}
          itemName="accounts"
        />
      </div>

      {/* 2. Client Companies & Multi-Tenant Registry Hero Stage (Emerald Forest / Deep Spruce Cockpit) */}
      <section className="trainee-hero-stage adm-clients-hero-stage" style={{ marginTop: '36px' }}>
        <div className="trainee-hero-content">
          <div className="trainee-hero-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#d1fae5' }}>
            <Building2 size={13} style={{ color: '#34d399' }} />
            <span>CRYPTOGRAPHIC ENCLAVES &bull; MULTI-TENANT ISOLATION</span>
          </div>

          <h2 className="trainee-hero-headline">Client Companies &amp; Tenants</h2>
          <p className="trainee-hero-sub">
            Institutional corporate client boundaries secured with strict PostgreSQL Row-Level Security (RLS) and CP-ABE versioned policy tokens.
          </p>

          <div className="trainee-hero-actions">
            <button
              type="button"
              className="trainee-hero-primary-btn adm-clients-primary-btn"
              onClick={onOpenCreateCompanyModal}
              title="Register a new institutional client enclave"
            >
              <Building2 size={14} />
              <span>Register Client Company</span>
            </button>
          </div>
        </div>

        {/* 4-Cell Bento Telemetry Grid for Clients */}
        <div className="trainee-hero-metrics-panel">
          <div className="hero-metric-cell adm-clients-metric-cell">
            <span className="metric-tag">REGISTERED TENANTS</span>
            <div className="metric-num">
              {companiesList.length}
              <span className="metric-unit">ORGS</span>
            </div>
            <span className="metric-sub-label">Enclave client entities</span>
          </div>

          <div className="hero-metric-cell adm-clients-metric-cell">
            <span className="metric-tag">ROW-LEVEL SECURITY</span>
            <div className="metric-num" style={{ color: '#34d399' }}>
              100<span className="metric-unit" style={{ color: '#6ee7b7' }}>%</span>
            </div>
            <span className="metric-sub-label">Strict isolation active</span>
          </div>

          <div className="hero-metric-cell adm-clients-metric-cell">
            <span className="metric-tag">ACTIVE SECTORS</span>
            <div className="metric-num" style={{ color: '#38bdf8' }}>
              {new Set(companiesList.map(c => c.industry).filter(Boolean)).size}
              <span className="metric-unit" style={{ color: '#7dd3fc' }}>DOMAINS</span>
            </div>
            <span className="metric-sub-label">Industry distribution</span>
          </div>

          <div className="hero-metric-cell adm-clients-metric-cell">
            <span className="metric-tag">ACCOUNT MANAGERS</span>
            <div className="metric-num" style={{ color: '#a78bfa' }}>
              {new Set(companiesList.map(c => c.am_name).filter(Boolean)).size || 1}
              <span className="metric-unit" style={{ color: '#c4b5fd' }}>LEADS</span>
            </div>
            <span className="metric-sub-label">Assigned supervisors</span>
          </div>
        </div>
      </section>

      {/* 2. Client Companies & Multi-Tenant Registry Panel */}
      <div className="adm-panel adm-vault-panel">
        <div className="adm-panel__head adm-vault-controls">
          <div className="adm-vault-search-wrap">
            <div className="adm-search adm-vault-search">
              <Search size={15} />
              <input 
                type="text" 
                placeholder="Filter client companies by code, name, or industry sector..." 
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
              />
              {companySearch && (
                <button 
                  type="button" 
                  onClick={() => setCompanySearch('')} 
                  className="adm-vault-clear-search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="adm-vault-actions-group">
            <TablePaginationCompact
              currentPage={companyPage}
              totalItems={totalCompanies}
              pageSize={4}
              onPageChange={setCompanyPage}
            />
          </div>

          {actionToast && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              width: '100%',
              fontSize: '12.5px',
              fontWeight: 600,
              background: actionToast.type === 'success' ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
              color: actionToast.type === 'success' ? (isDark ? '#34d399' : '#065f46') : (isDark ? '#f87171' : '#b91c1c'),
              border: actionToast.type === 'success' ? (isDark ? '1px solid rgba(5, 150, 105, 0.4)' : '1px solid #a7f3d0') : (isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fca5a5')
            }}>
              {actionToast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{actionToast.text}</span>
            </div>
          )}
        </div>

        <div className="adm-scroll" style={{ maxHeight: 'none', overflowY: 'visible' }}>
          <div className="adm-table">
            <div className="adm-grid adm-th" style={{ gridTemplateColumns: '1.8fr 1.3fr 1.4fr 1.2fr 130px' }}>
              <div>CLIENT COMPANY / TENANT</div>
              <div>INDUSTRY SECTOR</div>
              <div>CP-ABE ATTRIBUTE TOKEN</div>
              <div>ASSIGNED ACCOUNT MANAGER</div>
              <div style={{ textAlign: 'right' }}>DATA ISOLATION</div>
            </div>

            {filteredCompanies && filteredCompanies.length > 0 ? (
              pagedCompanies.map((c) => (
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
                        {c.am_name || 'Unassigned'}
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

          <TablePagination
            currentPage={companyPage}
            totalItems={totalCompanies}
            pageSize={4}
            onPageChange={setCompanyPage}
            itemName="client companies"
          />
        </div>
      </div>
    </div>
  );
}

