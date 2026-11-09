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
  AlertCircle
} from 'lucide-react';
import { TablePagination, TablePaginationCompact, usePagination } from '../../components/TablePagination';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { useTheme } from '../../contexts/ThemeContext';
import { disableUser, reenableUser } from '../../services/api';

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
  const [companySearch, setCompanySearch] = useState('');
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

  // Filtered staff
  const filteredStaff = useMemo(() => {
    if (!staffSearch) return staffList;
    const q = staffSearch.toLowerCase();
    return staffList.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q))
    );
  }, [staffList, staffSearch]);

  const {
    currentPage: staffPage,
    setCurrentPage: setStaffPage,
    paginatedItems: pagedStaff,
    totalItems: totalStaff
  } = usePagination(filteredStaff, 4);

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
    <div className="adm-people-access-page" style={{ marginTop: '20px' }}>
      {/* 1. Staff Access & Role Management Panel */}
      <div className="adm-panel">
        <div className="adm-panel__head" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2>Staff Access & Role Management</h2>
            <span className="adm-mono">Configure roles, clearance levels, and assigned tenant scope</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenCreateUserModal}
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
          {actionToast && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              marginTop: '12px',
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
              <div>STAFF MEMBER</div>
              <div>ASSIGNED ROLE</div>
              <div>CLEARANCE LEVEL</div>
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
                      <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          type="button" 
                          className="adm-btn adm-btn--light"
                          onClick={() => startEditStaff && startEditStaff(user)}
                          title={`Edit roles and clearances for ${user.name}`}
                        >
                          <Edit2 size={13} />
                          <span>Edit Roles</span>
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn--light"
                          style={{
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
                      </div>
                    </div>
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

        <TablePagination
          currentPage={staffPage}
          totalItems={totalStaff}
          pageSize={4}
          onPageChange={setStaffPage}
          itemName="staff accounts"
        />
      </div>

      {/* 2. Client Companies & Multi-Tenant Registry Panel */}
      <div className="adm-panel" style={{ marginTop: '32px' }}>
        <div className="adm-panel__head" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Building2 size={20} color="#7c3aed" />
              <h2 style={{ margin: 0 }}>Client Companies & Multi-Tenant Registry</h2>
            </div>
            <span className="adm-mono">Institutional corporate clients with versioned CP-ABE access tokens (CLIENT&lt;CODE&gt;V1)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <TablePaginationCompact
              currentPage={companyPage}
              totalItems={totalCompanies}
              pageSize={4}
              onPageChange={setCompanyPage}
            />
            <button
              type="button"
              onClick={onOpenCreateCompanyModal}
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
            <div className="adm-search">
              <Search size={15} />
              <input 
                type="text" 
                placeholder="Filter client companies or sector..." 
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
              />
            </div>
          </div>
          {actionToast && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              marginTop: '12px',
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

